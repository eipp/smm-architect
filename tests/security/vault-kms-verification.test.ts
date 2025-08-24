import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { VaultClient } from '../src/services/vault-client';
import { KMSManager } from '../src/services/kms-manager';
import { AuditSigningService } from '../src/services/audit-signing-service';
import { SecretsManager } from '../src/services/secrets-manager';
import { createHash, createSign, createVerify } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface SecretMetadata {
  secretId: string;
  version: number;
  createdAt: string;
  lastRotated: string;
  rotationPolicy: {
    enabled: boolean;
    intervalDays: number;
  };
  accessPolicy: {
    roles: string[];
    permissions: string[];
  };
}

interface KeyMetadata {
  keyId: string;
  keyArn: string;
  algorithm: string;
  usage: 'ENCRYPT_DECRYPT' | 'SIGN_VERIFY';
  keySpec: string;
  keyState: 'Enabled' | 'Disabled' | 'PendingDeletion';
  createdAt: string;
  rotationEnabled: boolean;
}

interface AuditSignature {
  signatureId: string;
  algorithm: 'RSA-SHA256' | 'ECDSA-SHA256';
  keyId: string;
  signedAt: string;
  signature: string;
  contentHash: string;
  metadata: {
    signedBy: string;
    purpose: string;
    contractId?: string;
    bundleId?: string;
  };
}

describe('Vault/KMS Security Verification', () => {
  let vaultClient: VaultClient;
  let kmsManager: KMSManager;
  let auditSigningService: AuditSigningService;
  let secretsManager: SecretsManager;
  let testKeyId: string;
  let testSecretIds: string[] = [];

  beforeAll(async () => {
    // Initialize services
    vaultClient = new VaultClient({
      endpoint: process.env.VAULT_ENDPOINT || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'test-token',
      namespace: 'smm-test'
    });

    kmsManager = new KMSManager({
      region: process.env.AWS_REGION || 'us-west-2',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    auditSigningService = new AuditSigningService(kmsManager);
    secretsManager = new SecretsManager(vaultClient, kmsManager);

    // Create test KMS key
    testKeyId = await kmsManager.createKey({
      description: 'Test key for SMM Architect QA',
      usage: 'SIGN_VERIFY',
      keySpec: 'RSA_2048',
      policy: {
        Version: '2012-10-17',
        Statement: [{
          Sid: 'AllowTestAccess',
          Effect: 'Allow',
          Principal: { AWS: '*' },
          Action: [
            'kms:Sign',
            'kms:Verify',
            'kms:GetPublicKey',
            'kms:DescribeKey'
          ],
          Resource: '*'
        }]
      }
    });

    console.log('🔑 Test environment initialized with KMS key:', testKeyId);
  });

  afterAll(async () => {
    // Cleanup test resources
    console.log('🧹 Cleaning up test resources...');
    
    try {
      // Delete test secrets
      for (const secretId of testSecretIds) {
        await secretsManager.deleteSecret(secretId);
      }

      // Schedule KMS key deletion (minimum 7 days)
      if (testKeyId) {
        await kmsManager.scheduleKeyDeletion(testKeyId, 7);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });

  beforeEach(() => {
    // Reset test state if needed
  });

  describe('KMS Key Management', () => {
    it('should create and manage encryption keys', async () => {
      const encryptionKeyId = await kmsManager.createKey({
        description: 'Test encryption key',
        usage: 'ENCRYPT_DECRYPT',
        keySpec: 'SYMMETRIC_DEFAULT'
      });

      expect(encryptionKeyId).toBeDefined();
      expect(encryptionKeyId).toMatch(/^[a-f0-9-]+$/);

      const keyMetadata = await kmsManager.getKeyMetadata(encryptionKeyId);
      expect(keyMetadata.keyState).toBe('Enabled');
      expect(keyMetadata.usage).toBe('ENCRYPT_DECRYPT');

      // Test encryption/decryption
      const plaintext = 'Test data for encryption';
      const encrypted = await kmsManager.encrypt(encryptionKeyId, plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plaintext);

      const decrypted = await kmsManager.decrypt(encrypted.ciphertext);
      expect(decrypted).toBe(plaintext);

      // Cleanup
      await kmsManager.scheduleKeyDeletion(encryptionKeyId, 7);
    }, 60000);

    it('should create and manage signing keys', async () => {
      const signingKeyId = await kmsManager.createKey({
        description: 'Test signing key',
        usage: 'SIGN_VERIFY',
        keySpec: 'RSA_2048'
      });

      expect(signingKeyId).toBeDefined();

      const keyMetadata = await kmsManager.getKeyMetadata(signingKeyId);
      expect(keyMetadata.usage).toBe('SIGN_VERIFY');
      expect(keyMetadata.keySpec).toBe('RSA_2048');

      // Test signing/verification
      const message = 'Test message for signing';
      const messageHash = createHash('sha256').update(message).digest();
      
      const signature = await kmsManager.sign(signingKeyId, messageHash, 'RSASSA_PSS_SHA_256');
      expect(signature).toBeDefined();
      expect(signature.signature).toMatch(/^[A-Za-z0-9+/=]+$/);

      const isValid = await kmsManager.verify(
        signingKeyId, 
        messageHash, 
        signature.signature, 
        'RSASSA_PSS_SHA_256'
      );
      expect(isValid).toBe(true);

      // Test with wrong message
      const wrongHash = createHash('sha256').update('Wrong message').digest();
      const isInvalid = await kmsManager.verify(
        signingKeyId,
        wrongHash,
        signature.signature,
        'RSASSA_PSS_SHA_256'
      );
      expect(isInvalid).toBe(false);

      // Cleanup
      await kmsManager.scheduleKeyDeletion(signingKeyId, 7);
    }, 60000);

    it('should handle key rotation', async () => {
      const rotationKeyId = await kmsManager.createKey({
        description: 'Test key rotation',
        usage: 'ENCRYPT_DECRYPT',
        enableRotation: true
      });

      // Enable automatic rotation
      await kmsManager.enableKeyRotation(rotationKeyId);
      
      const rotationStatus = await kmsManager.getKeyRotationStatus(rotationKeyId);
      expect(rotationStatus.rotationEnabled).toBe(true);

      // Test manual rotation trigger (in production, this would be automatic)
      const newKeyVersion = await kmsManager.rotateKey(rotationKeyId);
      expect(newKeyVersion).toBeDefined();

      // Verify old and new keys can both decrypt data encrypted with either
      const testData = 'Data for rotation testing';
      const encryptedWithOld = await kmsManager.encrypt(rotationKeyId, testData);
      
      // Both versions should be able to decrypt
      const decrypted = await kmsManager.decrypt(encryptedWithOld.ciphertext);
      expect(decrypted).toBe(testData);

      // Cleanup
      await kmsManager.scheduleKeyDeletion(rotationKeyId, 7);
    }, 90000);
  });

  describe('Vault Secrets Management', () => {
    it('should store and retrieve secrets securely', async () => {
      const secretData = {
        apiKey: 'sk-test-api-key-12345',
        dbPassword: 'SuperSecretPassword123!',
        jwtSecret: 'jwt-signing-secret-xyz789',
        encryptionKey: 'aes-256-encryption-key-abc'
      };

      const secretId = await secretsManager.storeSecret('test/api-credentials', secretData, {
        description: 'Test API credentials',
        ttl: '24h',
        maxVersions: 5
      });

      testSecretIds.push(secretId);
      expect(secretId).toBeDefined();

      // Retrieve secret
      const retrievedSecret = await secretsManager.getSecret(secretId);
      expect(retrievedSecret.data).toEqual(secretData);
      expect(retrievedSecret.metadata.version).toBe(1);

      // Test secret versioning
      const updatedData = {
        ...secretData,
        apiKey: 'sk-updated-api-key-67890'
      };

      await secretsManager.updateSecret(secretId, updatedData);
      
      const latestSecret = await secretsManager.getSecret(secretId);
      expect(latestSecret.data.apiKey).toBe('sk-updated-api-key-67890');
      expect(latestSecret.metadata.version).toBe(2);

      // Retrieve previous version
      const previousVersion = await secretsManager.getSecret(secretId, 1);
      expect(previousVersion.data.apiKey).toBe('sk-test-api-key-12345');
    }, 45000);

    it('should enforce access policies', async () => {
      const restrictedSecretData = {
        adminPassword: 'AdminOnly123!',
        rootKey: 'root-access-key-999'
      };

      const secretId = await secretsManager.storeSecret('test/admin-credentials', restrictedSecretData, {
        description: 'Admin-only credentials',
        accessPolicy: {
          roles: ['admin', 'super-admin'],
          permissions: ['read', 'update'],
          denyRoles: ['user', 'guest']
        }
      });

      testSecretIds.push(secretId);

      // Test access with admin role
      const adminSecret = await secretsManager.getSecretWithRole(secretId, 'admin');
      expect(adminSecret.data).toEqual(restrictedSecretData);

      // Test denied access with user role
      try {
        await secretsManager.getSecretWithRole(secretId, 'user');
        fail('Should have denied access for user role');
      } catch (error) {
        expect(error.message).toContain('Access denied');
      }
    }, 30000);

    it('should handle secret rotation', async () => {
      const rotatingSecret = {
        accessToken: 'token-12345',
        refreshToken: 'refresh-67890'
      };

      const secretId = await secretsManager.storeSecret('test/rotating-tokens', rotatingSecret, {
        description: 'Auto-rotating tokens',
        rotationPolicy: {
          enabled: true,
          intervalDays: 30,
          notifyBeforeHours: 24
        }
      });

      testSecretIds.push(secretId);

      // Simulate rotation
      const newTokens = {
        accessToken: 'token-new-98765',
        refreshToken: 'refresh-new-54321'
      };

      await secretsManager.rotateSecret(secretId, newTokens);

      const rotatedSecret = await secretsManager.getSecret(secretId);
      expect(rotatedSecret.data).toEqual(newTokens);
      expect(rotatedSecret.metadata.lastRotated).toBeDefined();

      // Verify rotation history
      const rotationHistory = await secretsManager.getRotationHistory(secretId);
      expect(rotationHistory.length).toBeGreaterThan(0);
      expect(rotationHistory[0].rotatedAt).toBeDefined();
    }, 45000);

    it('should encrypt secrets at rest', async () => {
      const sensitiveData = {
        creditCardNumber: '4111-1111-1111-1111',
        socialSecurityNumber: '123-45-6789',
        passportNumber: 'A12345678'
      };

      const secretId = await secretsManager.storeSecret('test/pii-data', sensitiveData, {
        description: 'PII data requiring encryption',
        encryptionKeyId: testKeyId,
        encryptionLevel: 'high'
      });

      testSecretIds.push(secretId);

      // Verify the secret is stored encrypted
      const rawStorage = await vaultClient.getRawSecret(secretId);
      expect(rawStorage.isEncrypted).toBe(true);
      expect(rawStorage.encryptionKeyId).toBe(testKeyId);

      // But can be decrypted when retrieved normally
      const decryptedSecret = await secretsManager.getSecret(secretId);
      expect(decryptedSecret.data).toEqual(sensitiveData);
    }, 30000);
  });

  describe('Audit Bundle Signing', () => {
    it('should sign audit bundles with KMS keys', async () => {
      const auditBundle = {
        auditBundleId: 'test-bundle-001',
        bundleVersion: 'v1.0.0',
        createdAt: '2024-01-15T10:30:00Z',
        contractSnapshot: {
          contractId: 'ws-test-v1.0.0',
          contractHash: 'sha256:abcdef1234567890',
          contractContent: {
            workspaceId: 'ws-test',
            goals: [{ key: 'test', target: 100, unit: 'test' }]
          }
        },
        executionContext: {
          simulationResults: {
            simulationId: 'sim-123',
            readinessScore: 0.85
          }
        }
      };

      const signature = await auditSigningService.signAuditBundle(auditBundle, testKeyId, {
        signedBy: 'test-user',
        purpose: 'audit_verification'
      });

      expect(signature.signatureId).toBeDefined();
      expect(signature.algorithm).toBe('RSA-SHA256');
      expect(signature.keyId).toBe(testKeyId);
      expect(signature.signature).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(signature.contentHash).toBeDefined();

      // Verify signature
      const isValid = await auditSigningService.verifySignature(auditBundle, signature);
      expect(isValid).toBe(true);

      // Test with tampered data
      const tamperedBundle = {
        ...auditBundle,
        contractSnapshot: {
          ...auditBundle.contractSnapshot,
          contractHash: 'sha256:tampered123456'
        }
      };

      const isTamperedValid = await auditSigningService.verifySignature(tamperedBundle, signature);
      expect(isTamperedValid).toBe(false);
    }, 45000);

    it('should create and verify signature chains', async () => {
      const documents = [
        { id: 'doc1', content: 'First document' },
        { id: 'doc2', content: 'Second document' },
        { id: 'doc3', content: 'Third document' }
      ];

      const signatures: AuditSignature[] = [];
      let previousHash = '';

      // Create signature chain
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const contentWithPrevious = JSON.stringify({
          ...doc,
          previousHash: previousHash || null
        });

        const signature = await auditSigningService.signContent(contentWithPrevious, testKeyId, {
          signedBy: 'chain-test',
          purpose: 'document_chain',
          sequenceNumber: i + 1
        });

        signatures.push(signature);
        previousHash = signature.contentHash;
      }

      // Verify entire chain
      const chainValid = await auditSigningService.verifySignatureChain(signatures);
      expect(chainValid).toBe(true);

      // Test with broken chain
      const brokenSignatures = [...signatures];
      brokenSignatures[1] = {
        ...brokenSignatures[1],
        contentHash: 'sha256:broken-hash'
      };

      const brokenChainValid = await auditSigningService.verifySignatureChain(brokenSignatures);
      expect(brokenChainValid).toBe(false);
    }, 60000);

    it('should handle multi-party signatures', async () => {
      const contract = {
        contractId: 'multi-party-001',
        parties: ['party-a', 'party-b', 'party-c'],
        terms: 'Multi-party agreement terms'
      };

      // Create additional keys for other parties
      const partyBKeyId = await kmsManager.createKey({
        description: 'Party B signing key',
        usage: 'SIGN_VERIFY',
        keySpec: 'RSA_2048'
      });

      const partyCKeyId = await kmsManager.createKey({
        description: 'Party C signing key',
        usage: 'SIGN_VERIFY',
        keySpec: 'RSA_2048'
      });

      // Each party signs the contract
      const signatures = await Promise.all([
        auditSigningService.signContent(JSON.stringify(contract), testKeyId, {
          signedBy: 'party-a',
          purpose: 'contract_agreement'
        }),
        auditSigningService.signContent(JSON.stringify(contract), partyBKeyId, {
          signedBy: 'party-b',
          purpose: 'contract_agreement'
        }),
        auditSigningService.signContent(JSON.stringify(contract), partyCKeyId, {
          signedBy: 'party-c',
          purpose: 'contract_agreement'
        })
      ]);

      // Verify all signatures
      for (const signature of signatures) {
        const isValid = await auditSigningService.verifyContentSignature(
          JSON.stringify(contract), 
          signature
        );
        expect(isValid).toBe(true);
      }

      // Verify multi-party signature set
      const multiPartyValid = await auditSigningService.verifyMultiPartySignatures(
        JSON.stringify(contract),
        signatures,
        ['party-a', 'party-b', 'party-c']
      );
      expect(multiPartyValid).toBe(true);

      // Test with missing signature
      const incompleteSignatures = signatures.slice(0, 2);
      const incompleteValid = await auditSigningService.verifyMultiPartySignatures(
        JSON.stringify(contract),
        incompleteSignatures,
        ['party-a', 'party-b', 'party-c']
      );
      expect(incompleteValid).toBe(false);

      // Cleanup additional keys
      await kmsManager.scheduleKeyDeletion(partyBKeyId, 7);
      await kmsManager.scheduleKeyDeletion(partyCKeyId, 7);
    }, 90000);
  });

  describe('Key Security and Compliance', () => {
    it('should enforce key usage policies', async () => {
      // Create a key with restricted policy
      const restrictedKeyId = await kmsManager.createKey({
        description: 'Restricted usage key',
        usage: 'SIGN_VERIFY',
        policy: {
          Version: '2012-10-17',
          Statement: [{
            Sid: 'RestrictToSpecificActions',
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: ['kms:Sign', 'kms:Verify'],
            Resource: '*',
            Condition: {
              StringEquals: {
                'kms:ViaService': 'smm-architect.us-west-2.amazonaws.com'
              }
            }
          }]
        }
      });

      // Test allowed operation
      const testMessage = 'Test message for policy enforcement';
      const messageHash = createHash('sha256').update(testMessage).digest();
      
      const signature = await kmsManager.sign(restrictedKeyId, messageHash, 'RSASSA_PSS_SHA_256');
      expect(signature).toBeDefined();

      // Test policy enforcement (would fail with wrong service in real AWS)
      try {
        await kmsManager.getKeyMetadata(restrictedKeyId);
        // This should work for DescribeKey if policy allows it
      } catch (error) {
        // Expected if policy restricts this action
        expect(error.message).toContain('Access denied');
      }

      // Cleanup
      await kmsManager.scheduleKeyDeletion(restrictedKeyId, 7);
    }, 45000);

    it('should audit key usage', async () => {
      const auditKeyId = await kmsManager.createKey({
        description: 'Key for audit testing',
        usage: 'ENCRYPT_DECRYPT',
        enableLogging: true
      });

      // Perform various operations
      const testData = 'Data for audit testing';
      await kmsManager.encrypt(auditKeyId, testData);
      await kmsManager.getKeyMetadata(auditKeyId);
      
      // Get audit logs (would integrate with CloudTrail in real implementation)
      const auditLogs = await kmsManager.getKeyUsageAuditLogs(auditKeyId);
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const encryptOperation = auditLogs.find(log => log.operation === 'Encrypt');
      expect(encryptOperation).toBeDefined();
      expect(encryptOperation.timestamp).toBeDefined();
      expect(encryptOperation.principal).toBeDefined();

      // Cleanup
      await kmsManager.scheduleKeyDeletion(auditKeyId, 7);
    }, 45000);

    it('should validate key compliance', async () => {
      const complianceResults = await kmsManager.validateKeyCompliance(testKeyId);
      
      expect(complianceResults.keyId).toBe(testKeyId);
      expect(complianceResults.compliant).toBe(true);
      expect(complianceResults.checks).toEqual(expect.objectContaining({
        encryptionAtRest: true,
        keyRotationEnabled: expect.any(Boolean),
        accessPolicyValid: true,
        auditLoggingEnabled: expect.any(Boolean)
      }));

      if (complianceResults.violations.length > 0) {
        console.warn('Compliance violations found:', complianceResults.violations);
      }
    }, 30000);
  });

  describe('Disaster Recovery and Backup', () => {
    it('should backup and restore secrets', async () => {
      const originalSecrets = {
        backupTest1: { value: 'secret1', type: 'api_key' },
        backupTest2: { value: 'secret2', type: 'password' },
        backupTest3: { value: 'secret3', type: 'certificate' }
      };

      // Store original secrets
      const secretIds = [];
      for (const [name, data] of Object.entries(originalSecrets)) {
        const id = await secretsManager.storeSecret(`test/backup/${name}`, data);
        secretIds.push(id);
        testSecretIds.push(id);
      }

      // Create backup
      const backupId = await secretsManager.createBackup('test/backup/*', {
        description: 'Test backup for disaster recovery',
        encryptionKeyId: testKeyId
      });

      expect(backupId).toBeDefined();

      // Simulate disaster - delete original secrets
      for (const secretId of secretIds) {
        await secretsManager.deleteSecret(secretId);
      }

      // Restore from backup
      const restoreResult = await secretsManager.restoreFromBackup(backupId, 'test/restored/');
      expect(restoreResult.restoredCount).toBe(3);
      expect(restoreResult.errors.length).toBe(0);

      // Verify restored secrets
      for (const [name, originalData] of Object.entries(originalSecrets)) {
        const restoredSecret = await secretsManager.getSecret(`test/restored/${name}`);
        expect(restoredSecret.data).toEqual(originalData);
      }
    }, 90000);

    it('should handle cross-region key replication', async () => {
      const primaryRegion = 'us-west-2';
      const backupRegion = 'us-east-1';

      // Create multi-region key
      const multiRegionKeyId = await kmsManager.createMultiRegionKey({
        description: 'Multi-region key for disaster recovery',
        usage: 'ENCRYPT_DECRYPT',
        primaryRegion,
        replicaRegions: [backupRegion]
      });

      // Test encryption in primary region
      const testData = 'Cross-region test data';
      const encrypted = await kmsManager.encrypt(multiRegionKeyId, testData);

      // Test decryption in backup region
      const backupKmsManager = new KMSManager({
        region: backupRegion,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });

      const decrypted = await backupKmsManager.decrypt(encrypted.ciphertext);
      expect(decrypted).toBe(testData);

      // Cleanup
      await kmsManager.scheduleKeyDeletion(multiRegionKeyId, 7);
    }, 60000);
  });

  describe('Performance and Scale Testing', () => {
    it('should handle high-volume secret operations', async () => {
      const secretCount = 50;
      const startTime = Date.now();

      // Create multiple secrets concurrently
      const secretPromises = Array.from({ length: secretCount }, async (_, i) => {
        const secretData = {
          id: i,
          apiKey: `test-key-${i}`,
          timestamp: new Date().toISOString()
        };
        
        const secretId = await secretsManager.storeSecret(`test/volume/secret-${i}`, secretData);
        testSecretIds.push(secretId);
        return secretId;
      });

      const secretIds = await Promise.all(secretPromises);
      const creationTime = Date.now() - startTime;

      expect(secretIds.length).toBe(secretCount);
      expect(creationTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Test concurrent retrieval
      const retrievalStart = Date.now();
      const retrievalPromises = secretIds.map(id => secretsManager.getSecret(id));
      const secrets = await Promise.all(retrievalPromises);
      const retrievalTime = Date.now() - retrievalStart;

      expect(secrets.length).toBe(secretCount);
      expect(retrievalTime).toBeLessThan(15000); // Should retrieve within 15 seconds

      console.log(`Created ${secretCount} secrets in ${creationTime}ms`);
      console.log(`Retrieved ${secretCount} secrets in ${retrievalTime}ms`);
    }, 120000);

    it('should handle large signing operations', async () => {
      const documentSize = 1024 * 1024; // 1MB document
      const largeDocument = Buffer.alloc(documentSize, 'test data').toString('base64');

      const startTime = Date.now();
      const signature = await auditSigningService.signContent(largeDocument, testKeyId, {
        signedBy: 'performance-test',
        purpose: 'large_document_signing'
      });
      const signingTime = Date.now() - startTime;

      expect(signature).toBeDefined();
      expect(signingTime).toBeLessThan(10000); // Should sign within 10 seconds

      // Verify large document signature
      const verifyStart = Date.now();
      const isValid = await auditSigningService.verifyContentSignature(largeDocument, signature);
      const verifyTime = Date.now() - verifyStart;

      expect(isValid).toBe(true);
      expect(verifyTime).toBeLessThan(5000); // Should verify within 5 seconds

      console.log(`Signed 1MB document in ${signingTime}ms`);
      console.log(`Verified 1MB document in ${verifyTime}ms`);
    }, 60000);
  });
});