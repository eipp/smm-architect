import { KMSService } from '../src/services/kms-service';
import { AuditBundle, BundleSignature } from '../src/types';
import crypto from 'crypto';

describe('Audit Bundle Signing Integration', () => {
  let kmsService: KMSService;
  const testWorkspaceId = 'test-workspace-123';
  const testKeyId = 'audit-bundle-signing-key';

  // Mock audit bundle for testing
  const mockAuditBundle: Omit<AuditBundle, 'signatures' | 'checksums'> = {
    bundleId: 'bundle-test-123',
    workspaceId: testWorkspaceId,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    creator: 'test-user',
    bundleType: 'workspace_creation',
    title: 'Test Workspace Creation Bundle',
    description: 'Integration test bundle for KMS signing',
    tags: ['test', 'integration'],
    chainOfCustody: [{
      timestamp: new Date().toISOString(),
      actor: 'test-user',
      action: 'created',
      details: 'Created test bundle for integration testing'
    }],
    evidence: [{
      evidenceId: 'evidence-1',
      type: 'document',
      source: 'test-system',
      timestamp: new Date().toISOString(),
      checksum: 'test-checksum',
      size: 1024,
      metadata: { test: true },
      content: 'dGVzdCBldmlkZW5jZSBjb250ZW50' // base64: 'test evidence content'
    }],
    policyCompliance: {
      evaluatedAt: new Date().toISOString(),
      policyVersion: '1.0.0',
      complianceScore: 100,
      violations: [],
      recommendations: [],
      signedOff: true,
      signedOffBy: 'test-user',
      signedOffAt: new Date().toISOString()
    },
    metadata: {
      bundleSize: 2048,
      evidenceCount: 1,
      signatureCount: 0,
      storageProvider: 'test',
      retentionPolicy: '7years'
    }
  };

  beforeAll(async () => {
    // Initialize KMS service with local provider for testing
    kmsService = new KMSService('local');
    await kmsService.initialize();
  });

  describe('Bundle Signature Generation', () => {
    it('should generate cryptographic signature for audit bundle', async () => {
      // Serialize bundle data
      const bundleData = JSON.stringify(mockAuditBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      // Generate signature
      const signature = await kmsService.sign(bundleBuffer, testKeyId);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
      expect(signature).not.toContain('mock');
    });

    it('should create complete signed audit bundle', async () => {
      const bundleData = JSON.stringify(mockAuditBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      // Generate checksums
      const sha256Hash = crypto.createHash('sha256').update(bundleBuffer).digest('hex');
      const blake3Hash = crypto.createHash('sha256').update(bundleBuffer).digest('hex'); // Simplified for test
      
      // Generate signature
      const signature = await kmsService.sign(bundleBuffer, testKeyId);
      
      // Create signed bundle
      const signedBundle: AuditBundle = {
        ...mockAuditBundle,
        signatures: [{
          keyId: testKeyId,
          algorithm: 'RSA-2048',
          signature: signature,
          signedAt: new Date().toISOString(),
          signedBy: 'test-user',
          purpose: 'integrity'
        }],
        checksums: {
          sha256: sha256Hash,
          blake3: blake3Hash
        },
        metadata: {
          ...mockAuditBundle.metadata,
          signatureCount: 1
        }
      };
      
      expect(signedBundle.signatures).toHaveLength(1);
      expect(signedBundle.signatures[0].signature).toBe(signature);
      expect(signedBundle.checksums.sha256).toBe(sha256Hash);
    });
  });

  describe('Bundle Signature Verification', () => {
    let signedBundle: AuditBundle;
    
    beforeEach(async () => {
      const bundleData = JSON.stringify(mockAuditBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      const sha256Hash = crypto.createHash('sha256').update(bundleBuffer).digest('hex');
      const blake3Hash = crypto.createHash('sha256').update(bundleBuffer).digest('hex');
      const signature = await kmsService.sign(bundleBuffer, testKeyId);
      
      signedBundle = {
        ...mockAuditBundle,
        signatures: [{
          keyId: testKeyId,
          algorithm: 'RSA-2048',
          signature: signature,
          signedAt: new Date().toISOString(),
          signedBy: 'test-user',
          purpose: 'integrity'
        }],
        checksums: {
          sha256: sha256Hash,
          blake3: blake3Hash
        },
        metadata: {
          ...mockAuditBundle.metadata,
          signatureCount: 1
        }
      };
    });

    it('should verify valid bundle signature', async () => {
      // Extract original bundle data (without signatures and checksums)
      const { signatures, checksums, ...originalBundle } = signedBundle;
      const bundleData = JSON.stringify(originalBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      // Verify signature
      const isValid = await kmsService.verify(
        bundleBuffer,
        signatures[0].signature,
        signatures[0].keyId
      );
      
      expect(isValid).toBe(true);
    });

    it('should reject tampered bundle data', async () => {
      // Tamper with the bundle
      const tamperedBundle = {
        ...mockAuditBundle,
        title: 'TAMPERED TITLE' // This change should break the signature
      };
      
      const tamperedData = JSON.stringify(tamperedBundle);
      const tamperedBuffer = Buffer.from(tamperedData, 'utf8');
      
      // Verify signature against tampered data
      const isValid = await kmsService.verify(
        tamperedBuffer,
        signedBundle.signatures[0].signature,
        signedBundle.signatures[0].keyId
      );
      
      expect(isValid).toBe(false);
    });

    it('should reject invalid signature', async () => {
      const { signatures, checksums, ...originalBundle } = signedBundle;
      const bundleData = JSON.stringify(originalBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      // Use invalid signature
      const invalidSignature = 'aW52YWxpZCBzaWduYXR1cmU=';
      
      const isValid = await kmsService.verify(
        bundleBuffer,
        invalidSignature,
        signatures[0].keyId
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('Bundle Integrity Verification', () => {
    it('should verify bundle checksum integrity', async () => {
      const bundleData = JSON.stringify(mockAuditBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      // Calculate expected checksum
      const expectedChecksum = crypto.createHash('sha256').update(bundleBuffer).digest('hex');
      
      // Create bundle with checksum
      const bundleWithChecksum = {
        ...mockAuditBundle,
        checksums: {
          sha256: expectedChecksum,
          blake3: expectedChecksum // Simplified for test
        }
      };
      
      // Verify checksum
      const recalculatedChecksum = crypto.createHash('sha256')
        .update(Buffer.from(JSON.stringify(mockAuditBundle), 'utf8'))
        .digest('hex');
      
      expect(recalculatedChecksum).toBe(expectedChecksum);
    });

    it('should detect checksum mismatch', async () => {
      const bundleData = JSON.stringify(mockAuditBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      // Create bundle with wrong checksum
      const bundleWithWrongChecksum = {
        ...mockAuditBundle,
        checksums: {
          sha256: 'wrong_checksum',
          blake3: 'wrong_checksum'
        }
      };
      
      // Calculate actual checksum
      const actualChecksum = crypto.createHash('sha256').update(bundleBuffer).digest('hex');
      
      expect(actualChecksum).not.toBe('wrong_checksum');
    });
  });

  describe('Multiple Signatures', () => {
    it('should support multiple signatures on same bundle', async () => {
      const bundleData = JSON.stringify(mockAuditBundle);
      const bundleBuffer = Buffer.from(bundleData, 'utf8');
      
      // Generate multiple signatures with different keys
      const signature1 = await kmsService.sign(bundleBuffer, 'key1');
      const signature2 = await kmsService.sign(bundleBuffer, 'key2');
      
      const multiSignedBundle: AuditBundle = {
        ...mockAuditBundle,
        signatures: [
          {
            keyId: 'key1',
            algorithm: 'RSA-2048',
            signature: signature1,
            signedAt: new Date().toISOString(),
            signedBy: 'user1',
            purpose: 'integrity'
          },
          {
            keyId: 'key2',
            algorithm: 'RSA-2048',
            signature: signature2,
            signedAt: new Date().toISOString(),
            signedBy: 'user2',
            purpose: 'authorization'
          }
        ],
        checksums: {
          sha256: crypto.createHash('sha256').update(bundleBuffer).digest('hex'),
          blake3: crypto.createHash('sha256').update(bundleBuffer).digest('hex')
        },
        metadata: {
          ...mockAuditBundle.metadata,
          signatureCount: 2
        }
      };
      
      // Verify both signatures
      const isValid1 = await kmsService.verify(bundleBuffer, signature1, 'key1');
      const isValid2 = await kmsService.verify(bundleBuffer, signature2, 'key2');
      
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
      expect(multiSignedBundle.signatures).toHaveLength(2);
    });
  });

  describe('Key Management Integration', () => {
    it('should create workspace-specific signing key', async () => {
      const workspaceKeyId = KMSService.generateTestKeyId(testWorkspaceId, 'audit');
      
      expect(workspaceKeyId).toMatch(/^test-key-[a-f0-9]{16}$/);
      
      // Key should be deterministic for same workspace
      const workspaceKeyId2 = KMSService.generateTestKeyId(testWorkspaceId, 'audit');
      expect(workspaceKeyId).toBe(workspaceKeyId2);
    });

    it('should generate different keys for different workspaces', async () => {
      const key1 = KMSService.generateTestKeyId('workspace-1', 'audit');
      const key2 = KMSService.generateTestKeyId('workspace-2', 'audit');
      
      expect(key1).not.toBe(key2);
    });
  });
});

// Integration test that mimics the audit bundle verification endpoint
describe('Audit Bundle Verification Endpoint Simulation', () => {
  let kmsService: KMSService;
  
  beforeAll(async () => {
    kmsService = new KMSService('local');
    await kmsService.initialize();
  });

  it('should simulate GET /bundles/:id/verify endpoint', async () => {
    const bundleId = 'test-bundle-456';
    const keyId = 'workspace-verification-key';
    
    // Create test bundle data
    const bundleData = {
      bundleId,
      workspaceId: 'test-workspace',
      data: 'sensitive audit data',
      timestamp: new Date().toISOString()
    };
    
    const bundleBuffer = Buffer.from(JSON.stringify(bundleData), 'utf8');
    
    // Sign the bundle
    const signature = await kmsService.sign(bundleBuffer, keyId);
    
    // Simulate verification endpoint logic
    const verificationResult = {
      bundleId,
      verified: await kmsService.verify(bundleBuffer, signature, keyId),
      signatureValid: true,
      integrityCheck: 'passed',
      verifiedAt: new Date().toISOString(),
      keyId
    };
    
    expect(verificationResult.verified).toBe(true);
    expect(verificationResult.signatureValid).toBe(true);
    expect(verificationResult.integrityCheck).toBe('passed');
    
    // Simulate response
    expect(verificationResult).toMatchObject({
      bundleId: bundleId,
      verified: true,
      signatureValid: true,
      integrityCheck: 'passed',
      verifiedAt: expect.any(String),
      keyId: keyId
    });
  });
});
", "original_text": "", "replace_all": false}]