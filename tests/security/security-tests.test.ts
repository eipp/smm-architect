import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../services/smm-architect/src/main';
import { SecurityTestSuite } from '../utils/security-test-suite';
import { VulnerabilityScanner } from '../utils/vulnerability-scanner';
import { AuthenticationTester } from '../utils/auth-tester';
import { 
  SecurityTestResult,
  VulnerabilityReport,
  PenetrationTestResult 
} from '../types/security';

describe('End-to-End Security Testing', () => {
  let securitySuite: SecurityTestSuite;
  let vulnerabilityScanner: VulnerabilityScanner;
  let authTester: AuthenticationTester;
  let testApp: any;

  beforeAll(async () => {
    securitySuite = new SecurityTestSuite();
    vulnerabilityScanner = new VulnerabilityScanner();
    authTester = new AuthenticationTester();
    testApp = request(app);
    
    await securitySuite.initialize();
  });

  afterAll(async () => {
    await securitySuite.cleanup();
  });

  describe('Authentication & Authorization Tests', () => {
    it('should prevent unauthorized access to protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/v1/workspaces',
        '/api/v1/contracts',
        '/api/v1/simulations',
        '/api/v1/agents/execute',
        '/api/v1/audit/bundles'
      ];

      for (const endpoint of protectedEndpoints) {
        // Test without authentication
        const unauthResponse = await testApp
          .get(endpoint)
          .expect(401);

        expect(unauthResponse.body.code).toBe('UNAUTHORIZED');

        // Test with invalid token
        const invalidTokenResponse = await testApp
          .get(endpoint)
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);

        expect(invalidTokenResponse.body.code).toBe('UNAUTHORIZED');

        // Test with expired token
        const expiredToken = await authTester.generateExpiredToken();
        const expiredTokenResponse = await testApp
          .get(endpoint)
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(expiredTokenResponse.body.code).toBe('TOKEN_EXPIRED');
      }
    });

    it('should enforce proper role-based access control', async () => {
      const testScenarios = [
        {
          role: 'viewer',
          allowedEndpoints: ['/api/v1/workspaces', '/api/v1/contracts'],
          deniedEndpoints: ['/api/v1/contracts', '/api/v1/agents/execute'],
          expectedStatus: 403
        },
        {
          role: 'editor',
          allowedEndpoints: ['/api/v1/workspaces', '/api/v1/contracts', '/api/v1/simulations'],
          deniedEndpoints: ['/api/v1/audit/bundles'],
          expectedStatus: 403
        },
        {
          role: 'admin',
          allowedEndpoints: ['/api/v1/workspaces', '/api/v1/audit/bundles', '/api/v1/admin/users'],
          deniedEndpoints: [],
          expectedStatus: 200
        }
      ];

      for (const scenario of testScenarios) {
        const token = await authTester.generateTokenForRole(scenario.role);

        // Test allowed endpoints
        for (const endpoint of scenario.allowedEndpoints) {
          const response = await testApp
            .get(endpoint)
            .set('Authorization', `Bearer ${token}`);

          expect(response.status).not.toBe(403);
        }

        // Test denied endpoints
        for (const endpoint of scenario.deniedEndpoints) {
          const response = await testApp
            .get(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .expect(scenario.expectedStatus);

          if (scenario.expectedStatus === 403) {
            expect(response.body.code).toBe('FORBIDDEN');
          }
        }
      }
    });

    it('should prevent privilege escalation attacks', async () => {
      const viewerToken = await authTester.generateTokenForRole('viewer');

      // Attempt to modify role in token
      const privilegeEscalationAttempts = [
        {
          method: 'header_manipulation',
          headers: { 'X-User-Role': 'admin' }
        },
        {
          method: 'jwt_manipulation',
          token: await authTester.manipulateJWT(viewerToken, { role: 'admin' })
        },
        {
          method: 'parameter_pollution',
          query: { role: 'admin', user_role: 'admin' }
        }
      ];

      for (const attempt of privilegeEscalationAttempts) {
        let requestBuilder = testApp
          .post('/api/v1/admin/users')
          .send({ username: 'test-user', role: 'viewer' });

        if (attempt.headers) {
          Object.entries(attempt.headers).forEach(([key, value]) => {
            requestBuilder = requestBuilder.set(key, value);
          });
        }

        if (attempt.token) {
          requestBuilder = requestBuilder.set('Authorization', `Bearer ${attempt.token}`);
        } else {
          requestBuilder = requestBuilder.set('Authorization', `Bearer ${viewerToken}`);
        }

        if (attempt.query) {
          requestBuilder = requestBuilder.query(attempt.query);
        }

        const response = await requestBuilder.expect(403);
        expect(response.body.code).toBe('FORBIDDEN');
      }
    });

    it('should implement secure session management', async () => {
      const userToken = await authTester.generateValidToken('user-123');

      // Test session timeout
      await authTester.simulateSessionTimeout(userToken);
      const timeoutResponse = await testApp
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(timeoutResponse.body.code).toBe('SESSION_EXPIRED');

      // Test concurrent session limits
      const tokens = await Promise.all([
        authTester.generateValidToken('user-123'),
        authTester.generateValidToken('user-123'),
        authTester.generateValidToken('user-123'),
        authTester.generateValidToken('user-123'), // 4th concurrent session
      ]);

      // The 4th session should invalidate the first
      const firstSessionResponse = await testApp
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(401);

      expect(firstSessionResponse.body.code).toBe('SESSION_INVALIDATED');
    });
  });

  describe('Input Validation & Injection Prevention', () => {
    it('should prevent SQL injection attacks', async () => {
      const token = await authTester.generateValidToken('test-user');
      
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE users SET role='admin' WHERE id=1; --",
        "' UNION SELECT username, password FROM users --",
        "'; SELECT pg_sleep(10); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await testApp
          .get('/api/v1/workspaces')
          .query({ search: payload })
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(response.body.code).toBe('INVALID_INPUT');
        expect(response.body.message).toContain('malicious');
      }

      // Test in POST body
      for (const payload of sqlInjectionPayloads) {
        const response = await testApp
          .post('/api/v1/workspaces')
          .send({
            name: payload,
            description: 'Test workspace'
          })
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(response.body.code).toBe('INVALID_INPUT');
      }
    });

    it('should prevent NoSQL injection attacks', async () => {
      const token = await authTester.generateValidToken('test-user');
      
      const nosqlInjectionPayloads = [
        { $ne: null },
        { $regex: '.*' },
        { $where: 'this.username == this.password' },
        { $or: [{ username: 'admin' }, { role: 'admin' }] }
      ];

      for (const payload of nosqlInjectionPayloads) {
        const response = await testApp
          .post('/api/v1/workspaces/search')
          .send({ filter: payload })
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(response.body.code).toBe('INVALID_INPUT');
      }
    });

    it('should prevent XSS attacks', async () => {
      const token = await authTester.generateValidToken('test-user');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await testApp
          .post('/api/v1/workspaces')
          .send({
            name: `Test Workspace ${payload}`,
            description: `Description with ${payload}`
          })
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(response.body.code).toBe('INVALID_INPUT');
        expect(response.body.message).toContain('script');
      }
    });

    it('should prevent LDAP injection attacks', async () => {
      const token = await authTester.generateValidToken('test-user');
      
      const ldapInjectionPayloads = [
        '*)(uid=*',
        '*)(|(uid=*))',
        '*)((|(uid=*))',
        '*))%00',
        '*(|(password=*))'
      ];

      for (const payload of ldapInjectionPayloads) {
        const response = await testApp
          .post('/api/v1/auth/ldap-verify')
          .send({
            username: payload,
            domain: 'example.com'
          })
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(response.body.code).toBe('INVALID_INPUT');
      }
    });

    it('should validate file upload security', async () => {
      const token = await authTester.generateValidToken('test-user');

      // Test malicious file types
      const maliciousFiles = [
        { filename: 'malware.exe', content: Buffer.from('MZ'), contentType: 'application/octet-stream' },
        { filename: 'script.php', content: Buffer.from('<?php system($_GET["cmd"]); ?>'), contentType: 'text/plain' },
        { filename: 'test.jsp', content: Buffer.from('<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>'), contentType: 'text/plain' }
      ];

      for (const file of maliciousFiles) {
        const response = await testApp
          .post('/api/v1/content/upload')
          .attach('file', file.content, file.filename)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(response.body.code).toBe('INVALID_FILE_TYPE');
      }

      // Test file size limits
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB file
      const sizeResponse = await testApp
        .post('/api/v1/content/upload')
        .attach('file', largeFile, 'large.txt')
        .set('Authorization', `Bearer ${token}`)
        .expect(413);

      expect(sizeResponse.body.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('API Security Tests', () => {
    it('should implement proper rate limiting', async () => {
      const token = await authTester.generateValidToken('test-user');
      const endpoint = '/api/v1/simulations';
      const rateLimit = 10; // requests per minute

      // Make requests up to the rate limit
      const requests = [];
      for (let i = 0; i < rateLimit; i++) {
        requests.push(
          testApp
            .post(endpoint)
            .send({ workspaceId: 'ws-test', workflowJson: {} })
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(400);
      });

      // Next request should be rate limited
      const rateLimitedResponse = await testApp
        .post(endpoint)
        .send({ workspaceId: 'ws-test', workflowJson: {} })
        .set('Authorization', `Bearer ${token}`)
        .expect(429);

      expect(rateLimitedResponse.body.code).toBe('RATE_LIMITED');
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
    });

    it('should prevent CSRF attacks', async () => {
      const token = await authTester.generateValidToken('test-user');

      // Test without CSRF token
      const csrfResponse = await testApp
        .post('/api/v1/workspaces')
        .send({ name: 'Test Workspace' })
        .set('Authorization', `Bearer ${token}`)
        .set('Origin', 'https://malicious-site.com')
        .expect(403);

      expect(csrfResponse.body.code).toBe('CSRF_TOKEN_MISSING');

      // Test with invalid CSRF token
      const invalidCsrfResponse = await testApp
        .post('/api/v1/workspaces')
        .send({ name: 'Test Workspace' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-CSRF-Token', 'invalid-token')
        .expect(403);

      expect(invalidCsrfResponse.body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should implement secure headers', async () => {
      const response = await testApp.get('/api/v1/health');

      // Check security headers
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toBeDefined();
    });

    it('should prevent directory traversal attacks', async () => {
      const token = await authTester.generateValidToken('test-user');
      
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ];

      for (const payload of traversalPayloads) {
        const response = await testApp
          .get(`/api/v1/files/${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);

        expect(response.body.code).toBe('INVALID_PATH');
      }
    });
  });

  describe('Cryptographic Security Tests', () => {
    it('should use secure encryption for sensitive data', async () => {
      const sensitiveData = {
        apiKey: 'sk-1234567890abcdef',
        password: 'user-password-123',
        personalInfo: 'john.doe@example.com'
      };

      const encryptionTest = await securitySuite.testEncryption(sensitiveData);

      expect(encryptionTest.algorithm).toBe('AES-256-GCM');
      expect(encryptionTest.keyLength).toBeGreaterThanOrEqual(256);
      expect(encryptionTest.ivLength).toBeGreaterThanOrEqual(96);
      expect(encryptionTest.encrypted).not.toContain(sensitiveData.apiKey);
      expect(encryptionTest.decrypted).toEqual(sensitiveData);
    });

    it('should implement secure password hashing', async () => {
      const passwords = ['password123', 'super-secure-password!@#', 'test'];

      for (const password of passwords) {
        const hashTest = await securitySuite.testPasswordHashing(password);

        expect(hashTest.algorithm).toBe('bcrypt');
        expect(hashTest.rounds).toBeGreaterThanOrEqual(12);
        expect(hashTest.hash).not.toContain(password);
        expect(hashTest.verified).toBe(true);
        expect(hashTest.timingAttackResistant).toBe(true);
      }
    });

    it('should verify digital signatures properly', async () => {
      const document = {
        contractId: 'contract-123',
        content: 'Sample contract content',
        timestamp: new Date().toISOString()
      };

      const signatureTest = await securitySuite.testDigitalSignature(document);

      expect(signatureTest.algorithm).toBe('RSA-SHA256');
      expect(signatureTest.keySize).toBeGreaterThanOrEqual(2048);
      expect(signatureTest.signature).toBeDefined();
      expect(signatureTest.verified).toBe(true);
      expect(signatureTest.tamperedVerification).toBe(false);
    });
  });

  describe('Infrastructure Security Tests', () => {
    it('should scan for known vulnerabilities', async () => {
      const vulnerabilityReport = await vulnerabilityScanner.scanApplication({
        target: 'localhost:3000',
        scanDepth: 'comprehensive',
        includeNetworkScan: true,
        checkDependencies: true
      });

      expect(vulnerabilityReport.criticalVulnerabilities).toHaveLength(0);
      expect(vulnerabilityReport.highSeverityVulnerabilities).toHaveLength(0);
      
      // Medium and low severity should be documented but not block deployment
      if (vulnerabilityReport.mediumSeverityVulnerabilities.length > 0) {
        console.warn('Medium severity vulnerabilities found:', vulnerabilityReport.mediumSeverityVulnerabilities);
      }

      expect(vulnerabilityReport.scanCompleted).toBe(true);
      expect(vulnerabilityReport.lastScanDate).toBeDefined();
    });

    it('should check for insecure dependencies', async () => {
      const dependencyReport = await vulnerabilityScanner.auditDependencies({
        packageFiles: ['package.json', 'package-lock.json'],
        checkOutdated: true,
        severity: 'moderate'
      });

      expect(dependencyReport.criticalVulnerabilities).toHaveLength(0);
      expect(dependencyReport.highVulnerabilities).toHaveLength(0);
      expect(dependencyReport.auditCompleted).toBe(true);

      // Log any moderate vulnerabilities for review
      if (dependencyReport.moderateVulnerabilities.length > 0) {
        console.log('Moderate dependency vulnerabilities:', dependencyReport.moderateVulnerabilities);
      }
    });

    it('should validate container security', async () => {
      const containerScanResults = await vulnerabilityScanner.scanContainer({
        imageName: 'smm-architect:latest',
        scanLayers: true,
        checkBaseImage: true,
        validateSecurityPolicies: true
      });

      expect(containerScanResults.criticalVulnerabilities).toHaveLength(0);
      expect(containerScanResults.runAsRoot).toBe(false);
      expect(containerScanResults.hasHealthCheck).toBe(true);
      expect(containerScanResults.exposedSecrets).toHaveLength(0);
      expect(containerScanResults.securityPolicyCompliant).toBe(true);
    });
  });

  describe('Secrets Management Security', () => {
    it('should properly manage Vault integration', async () => {
      const vaultTests = await securitySuite.testVaultIntegration({
        vaultAddress: process.env.VAULT_ADDR || 'http://localhost:8200',
        testSecrets: ['database-password', 'api-keys', 'signing-certificates']
      });

      expect(vaultTests.connectionSecure).toBe(true);
      expect(vaultTests.authenticationValid).toBe(true);
      expect(vaultTests.secretsEncrypted).toBe(true);
      expect(vaultTests.accessLogged).toBe(true);
      expect(vaultTests.tokenRotationEnabled).toBe(true);
    });

    it('should prevent secrets exposure in logs', async () => {
      const secretsTest = await securitySuite.testSecretsExposure({
        logFiles: ['app.log', 'error.log', 'audit.log'],
        environmentVariables: process.env,
        responseHeaders: true
      });

      expect(secretsTest.secretsInLogs).toHaveLength(0);
      expect(secretsTest.secretsInEnv).toHaveLength(0);
      expect(secretsTest.secretsInHeaders).toHaveLength(0);
      expect(secretsTest.secretsInErrorMessages).toHaveLength(0);
    });
  });

  describe('Data Protection & Privacy', () => {
    it('should enforce data encryption at rest', async () => {
      const dataProtectionTest = await securitySuite.testDataProtection({
        databases: ['postgresql', 'mongodb'],
        fileStorage: ['uploads', 'cache'],
        checkEncryption: true,
        validateKeys: true
      });

      expect(dataProtectionTest.databaseEncrypted).toBe(true);
      expect(dataProtectionTest.fileStorageEncrypted).toBe(true);
      expect(dataProtectionTest.encryptionAlgorithm).toMatch(/AES-256/);
      expect(dataProtectionTest.keyManagementSecure).toBe(true);
    });

    it('should implement proper data anonymization', async () => {
      const anonymizationTest = await securitySuite.testDataAnonymization({
        personalData: ['email', 'phone', 'address'],
        sensitiveFields: ['password', 'ssn', 'payment_info'],
        exportFormats: ['json', 'csv', 'xml']
      });

      expect(anonymizationTest.personalDataMasked).toBe(true);
      expect(anonymizationTest.sensitiveFieldsRemoved).toBe(true);
      expect(anonymizationTest.exportsSanitized).toBe(true);
      expect(anonymizationTest.auditTrailMaintained).toBe(true);
    });

    it('should validate GDPR compliance', async () => {
      const gdprTest = await securitySuite.testGDPRCompliance({
        dataSubjectRights: true,
        consentManagement: true,
        dataProcessingLog: true,
        dataRetentionPolicies: true
      });

      expect(gdprTest.rightToAccess).toBe(true);
      expect(gdprTest.rightToRectification).toBe(true);
      expect(gdprTest.rightToErasure).toBe(true);
      expect(gdprTest.rightToPortability).toBe(true);
      expect(gdprTest.consentRecorded).toBe(true);
      expect(gdprTest.dataProcessingLogged).toBe(true);
      expect(gdprTest.retentionPoliciesEnforced).toBe(true);
    });
  });

  describe('Penetration Testing Simulation', () => {
    it('should simulate common attack vectors', async () => {
      const penetrationTest = await securitySuite.simulatePenetrationTest({
        attackVectors: [
          'sql_injection',
          'xss',
          'csrf',
          'directory_traversal',
          'authentication_bypass',
          'privilege_escalation',
          'data_exposure'
        ],
        depth: 'comprehensive',
        timeout: 300000 // 5 minutes
      });

      expect(penetrationTest.vulnerabilitiesFound).toHaveLength(0);
      expect(penetrationTest.criticalIssues).toHaveLength(0);
      expect(penetrationTest.securityScore).toBeGreaterThanOrEqual(95);
      expect(penetrationTest.testCompleted).toBe(true);
    });

    it('should validate security incident response', async () => {
      const incidentResponse = await securitySuite.testIncidentResponse({
        simulateAttack: 'brute_force_login',
        expectedDetection: true,
        expectedBlocking: true,
        expectedAlerting: true
      });

      expect(incidentResponse.attackDetected).toBe(true);
      expect(incidentResponse.attackBlocked).toBe(true);
      expect(incidentResponse.alertGenerated).toBe(true);
      expect(incidentResponse.responseTime).toBeLessThan(5000); // 5 seconds
      expect(incidentResponse.loggedProperly).toBe(true);
    });
  });
});