import { KMSManager } from '../src/kms/kms-manager';
import { LocalKMSAdapter } from '../src/kms/adapters/local';
import * as fs from 'fs';
import * as path from 'path';

describe('KMS Integration Tests', () => {
  const testKeyStorePath = path.join(__dirname, 'test-keys');

  beforeEach(() => {
    // Clean up test keys
    if (fs.existsSync(testKeyStorePath)) {
      fs.rmSync(testKeyStorePath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test keys
    if (fs.existsSync(testKeyStorePath)) {
      fs.rmSync(testKeyStorePath, { recursive: true, force: true });
    }
  });

  describe('Local KMS Adapter', () => {
    let kmsManager: KMSManager;

    beforeEach(() => {
      kmsManager = new KMSManager({
        provider: 'local',
        config: { keyStorePath: testKeyStorePath }
      });
    });

    it('should create and use RSA keys for signing', async () => {
      // Create key
      const keyId = await kmsManager.createKey('test-rsa-key', {
        keySpec: 'RSA_2048',
        description: 'Test RSA key for audit signing'
      });

      expect(keyId).toMatch(/^local-test-rsa-key-\d+$/);

      // Get key metadata
      const metadata = await kmsManager.getKeyMetadata(keyId);
      expect(metadata.keySpec).toBe('RSA_2048');
      expect(metadata.algorithm).toBe('RSASSA_PKCS1_V1_5_SHA_256');
      expect(metadata.keySize).toBe(2048);
      expect(metadata.status).toBe('active');

      // Test signing and verification
      const testData = Buffer.from('This is test data for KMS signing');
      const signatureResult = await kmsManager.sign(testData, keyId);

      expect(signatureResult.signature).toBeDefined();
      expect(signatureResult.keyId).toBe(keyId);
      expect(signatureResult.algorithm).toBe('RSASSA_PKCS1_V1_5_SHA_256');
      expect(signatureResult.signedAt).toBeDefined();

      // Verify signature
      const isValid = await kmsManager.verify(testData, signatureResult.signature, keyId);
      expect(isValid).toBe(true);

      // Verify with wrong data should fail
      const wrongData = Buffer.from('This is wrong data');
      const isInvalid = await kmsManager.verify(wrongData, signatureResult.signature, keyId);
      expect(isInvalid).toBe(false);
    });

    it('should create and use ECC keys for signing', async () => {
      const keyId = await kmsManager.createKey('test-ecc-key', {
        keySpec: 'ECC_NIST_P256',
        description: 'Test ECC key for audit signing'
      });

      const metadata = await kmsManager.getKeyMetadata(keyId);
      expect(metadata.keySpec).toBe('ECC_NIST_P256');
      expect(metadata.algorithm).toBe('ECDSA_SHA_256');
      expect(metadata.keySize).toBe(256);

      // Test signing and verification
      const testData = Buffer.from('ECC test data for signing');
      const signatureResult = await kmsManager.sign(testData, keyId);

      expect(signatureResult.algorithm).toBe('ECDSA_SHA_256');

      const isValid = await kmsManager.verify(testData, signatureResult.signature, keyId);
      expect(isValid).toBe(true);
    });

    it('should persist keys to filesystem', async () => {
      const keyId = await kmsManager.createKey('persistent-key');

      // Check that files were created
      const privateKeyPath = path.join(testKeyStorePath, `${keyId}.private.pem`);
      const publicKeyPath = path.join(testKeyStorePath, `${keyId}.public.pem`);
      const metadataPath = path.join(testKeyStorePath, `${keyId}.metadata.json`);

      expect(fs.existsSync(privateKeyPath)).toBe(true);
      expect(fs.existsSync(publicKeyPath)).toBe(true);
      expect(fs.existsSync(metadataPath)).toBe(true);

      // Check file permissions
      const privateStats = fs.statSync(privateKeyPath);
      expect(privateStats.mode & 0o077).toBe(0); // Should be 600

      // Verify key can be loaded after creation
      const publicKey = await kmsManager.getPublicKey(keyId);
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
    });

    it('should list created keys', async () => {
      const keyIds = [];
      
      keyIds.push(await kmsManager.createKey('key1'));
      keyIds.push(await kmsManager.createKey('key2'));
      keyIds.push(await kmsManager.createKey('key3'));

      const listedKeys = await kmsManager.listKeys();
      
      expect(listedKeys).toHaveLength(3);
      keyIds.forEach(keyId => {
        expect(listedKeys).toContain(keyId);
      });
    });

    it('should handle key deletion', async () => {
      const keyId = await kmsManager.createKey('deletable-key');
      
      // Verify key exists
      const keys = await kmsManager.listKeys();
      expect(keys).toContain(keyId);

      // Delete key
      const adapter = new LocalKMSAdapter({ keyStorePath: testKeyStorePath });
      await adapter.deleteKey(keyId);

      // Verify key is gone
      const keysAfterDeletion = await kmsManager.listKeys();
      expect(keysAfterDeletion).not.toContain(keyId);

      // Verify files are gone
      const privateKeyPath = path.join(testKeyStorePath, `${keyId}.private.pem`);
      expect(fs.existsSync(privateKeyPath)).toBe(false);
    });

    it('audit-integration: should sign and verify audit bundle', async () => {
      // Create test key for audit bundle signing
      const keyId = await kmsManager.createKey('audit-bundle-test', {
        keySpec: 'RSA_2048',
        description: 'Test key for audit bundle signing'
      });

      // Create mock audit bundle data
      const auditBundle = {
        bundleId: 'test-bundle-001',
        workspaceId: 'ws-test-001',
        contractSnapshot: { 
          contractVersion: 'v1.0.0',
          contractHash: 'abc123',
          isImmutable: true 
        },
        simulationResults: { readinessScore: 0.85 },
        metadata: { assembledAt: new Date().toISOString() }
      };

      const bundleBuffer = Buffer.from(JSON.stringify(auditBundle, null, 2));

      // Sign the bundle
      const signatureResult = await kmsManager.sign(bundleBuffer, keyId);
      
      expect(signatureResult.signature).toBeDefined();
      expect(signatureResult.keyId).toBe(keyId);
      expect(signatureResult.metadata.kmsProvider).toBe('local');

      // Verify the signature
      const verified = await kmsManager.verify(bundleBuffer, signatureResult.signature, keyId);
      expect(verified).toBe(true);

      console.log('✅ Audit bundle signed and verified successfully');
      console.log(`Key ID: ${keyId}`);
      console.log(`Signature algorithm: ${signatureResult.algorithm}`);
      console.log(`Bundle size: ${bundleBuffer.length} bytes`);
    });

    it('should handle concurrent signing operations', async () => {
      const keyId = await kmsManager.createKey('concurrent-test');
      
      const testData = [
        Buffer.from('Test data 1'),
        Buffer.from('Test data 2'),
        Buffer.from('Test data 3'),
        Buffer.from('Test data 4'),
        Buffer.from('Test data 5')
      ];

      // Sign all data concurrently
      const signaturePromises = testData.map(data => kmsManager.sign(data, keyId));
      const signatures = await Promise.all(signaturePromises);

      expect(signatures).toHaveLength(5);
      signatures.forEach(sig => {
        expect(sig.signature).toBeDefined();
        expect(sig.keyId).toBe(keyId);
      });

      // Verify all signatures concurrently
      const verificationPromises = testData.map((data, index) => 
        kmsManager.verify(data, signatures[index].signature, keyId)
      );
      const verifications = await Promise.all(verificationPromises);

      expect(verifications).toHaveLength(5);
      verifications.forEach(verified => {
        expect(verified).toBe(true);
      });
    });
  });

  describe('KMS Manager Factory Methods', () => {
    it('should create local KMS for testing', () => {
      const kms = KMSManager.forTesting(testKeyStorePath);
      expect(kms.getProvider()).toBe('local');
    });

    it('should create KMS from environment variables', () => {
      process.env.KMS_PROVIDER = 'local';
      process.env.LOCAL_KMS_KEY_PATH = testKeyStorePath;

      const kms = KMSManager.fromEnvironment();
      expect(kms.getProvider()).toBe('local');

      // Clean up
      delete process.env.KMS_PROVIDER;
      delete process.env.LOCAL_KMS_KEY_PATH;
    });

    it('should perform health check', async () => {
      const kms = new KMSManager({
        provider: 'local',
        config: { keyStorePath: testKeyStorePath }
      });

      const health = await kms.healthCheck();
      
      expect(health.provider).toBe('local');
      expect(health.healthy).toBe(true);
      expect(health.metadata.keyCount).toBe(0);
      expect(health.metadata.adapterType).toBe('LocalKMSAdapter');
    });

    it('should perform sign/verify test', async () => {
      const kms = new KMSManager({
        provider: 'local',
        config: { keyStorePath: testKeyStorePath }
      });

      const keyId = await kms.createKey('health-check-test');
      const testPassed = await kms.performSignVerifyTest(keyId);
      
      expect(testPassed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    let kmsManager: KMSManager;

    beforeEach(() => {
      kmsManager = new KMSManager({
        provider: 'local',
        config: { keyStorePath: testKeyStorePath }
      });
    });

    it('should handle invalid key references', async () => {
      await expect(kmsManager.sign(Buffer.from('test'), '')).rejects.toThrow('Invalid key reference');
      await expect(kmsManager.verify(Buffer.from('test'), 'sig', '')).rejects.toThrow('Invalid key reference');
      await expect(kmsManager.getPublicKey('')).rejects.toThrow('Invalid key reference');
    });

    it('should handle non-existent keys', async () => {
      const nonExistentKey = 'non-existent-key-123';
      
      await expect(kmsManager.sign(Buffer.from('test'), nonExistentKey))
        .rejects.toThrow('Key not found');
      
      await expect(kmsManager.getPublicKey(nonExistentKey))
        .rejects.toThrow('Key not found');
    });

    it('should handle invalid key specifications', async () => {
      await expect(kmsManager.createKey('invalid-spec-key', {
        keySpec: 'INVALID_SPEC' as any
      })).rejects.toThrow('Invalid key specification');
    });

    it('should handle corrupted signature verification gracefully', async () => {
      const keyId = await kmsManager.createKey('corruption-test');
      const testData = Buffer.from('test data');
      
      const verified = await kmsManager.verify(testData, 'corrupted-signature', keyId);
      expect(verified).toBe(false);
    });
  });
});