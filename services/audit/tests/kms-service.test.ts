import { KMSService } from '../src/services/kms-service';
import { VaultKMSAdapter } from '../src/kms/adapters/vault';
import { AWSKMSAdapter } from '../src/kms/adapters/aws';
import { GCPKMSAdapter } from '../src/kms/adapters/gcp';
import crypto from 'crypto';

// Mock the adapters for unit testing
jest.mock('../src/kms/adapters/vault');
jest.mock('../src/kms/adapters/aws');
jest.mock('../src/kms/adapters/gcp');

const MockedVaultAdapter = VaultKMSAdapter as jest.MockedClass<typeof VaultKMSAdapter>;
const MockedAWSAdapter = AWSKMSAdapter as jest.MockedClass<typeof AWSKMSAdapter>;
const MockedGCPAdapter = GCPKMSAdapter as jest.MockedClass<typeof GCPKMSAdapter>;

describe('KMSService Production Implementation', () => {
  const testData = Buffer.from('test audit bundle data');
  const testKeyId = 'test-signing-key-v1';
  const testSignature = 'dGVzdCBzaWduYXR1cmU=';
  const testPublicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Vault KMS Integration', () => {
    let kmsService: KMSService;
    let mockVaultAdapter: jest.Mocked<VaultKMSAdapter>;

    beforeEach(() => {
      mockVaultAdapter = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sign: jest.fn().mockResolvedValue(testSignature),
        verify: jest.fn().mockResolvedValue(true),
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
        createKey: jest.fn().mockResolvedValue(testKeyId)
      } as any;
      
      MockedVaultAdapter.mockImplementation(() => mockVaultAdapter);
      
      kmsService = new KMSService('vault', {
        vaultUrl: 'http://localhost:8200',
        vaultToken: 'test-token'
      });
    });

    it('should initialize Vault adapter correctly', async () => {
      await kmsService.initialize();
      expect(mockVaultAdapter.initialize).toHaveBeenCalled();
    });

    it('should sign data using Vault adapter', async () => {
      const signature = await kmsService.sign(testData, testKeyId);
      expect(signature).toBe(testSignature);
      expect(mockVaultAdapter.sign).toHaveBeenCalledWith(testData, testKeyId);
    });

    it('should verify signature using Vault adapter', async () => {
      const isValid = await kmsService.verify(testData, testSignature, testKeyId);
      expect(isValid).toBe(true);
      expect(mockVaultAdapter.verify).toHaveBeenCalledWith(testData, testSignature, testKeyId);
    });

    it('should get public key using Vault adapter', async () => {
      const publicKey = await kmsService.getPublicKey(testKeyId);
      expect(publicKey).toBe(testPublicKey);
      expect(mockVaultAdapter.getPublicKey).toHaveBeenCalledWith(testKeyId);
    });

    it('should create key using Vault adapter', async () => {
      const keyId = await kmsService.createKey('new-test-key');
      expect(keyId).toBe(testKeyId);
      expect(mockVaultAdapter.createKey).toHaveBeenCalledWith('new-test-key');
    });
  });

  describe('AWS KMS Integration', () => {
    let kmsService: KMSService;
    let mockAWSAdapter: jest.Mocked<AWSKMSAdapter>;

    beforeEach(() => {
      mockAWSAdapter = {
        sign: jest.fn().mockResolvedValue({
          signature: testSignature,
          keyId: testKeyId,
          algorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
          signedAt: new Date().toISOString()
        }),
        verify: jest.fn().mockResolvedValue(true),
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
        createKey: jest.fn().mockResolvedValue(testKeyId)
      } as any;
      
      MockedAWSAdapter.mockImplementation(() => mockAWSAdapter);
      
      kmsService = new KMSService('aws', {
        region: 'us-east-1',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key'
      });
    });

    it('should sign data using AWS adapter', async () => {
      const signature = await kmsService.sign(testData, testKeyId);
      expect(signature).toBe(testSignature);
      expect(mockAWSAdapter.sign).toHaveBeenCalledWith(testData, testKeyId);
    });

    it('should verify signature using AWS adapter', async () => {
      const isValid = await kmsService.verify(testData, testSignature, testKeyId);
      expect(isValid).toBe(true);
      expect(mockAWSAdapter.verify).toHaveBeenCalledWith(testData, testSignature, testKeyId);
    });

    it('should get public key using AWS adapter', async () => {
      const publicKey = await kmsService.getPublicKey(testKeyId);
      expect(publicKey).toBe(testPublicKey);
      expect(mockAWSAdapter.getPublicKey).toHaveBeenCalledWith(testKeyId);
    });

    it('should create key using AWS adapter', async () => {
      const keyId = await kmsService.createKey('new-test-key');
      expect(keyId).toBe(testKeyId);
      expect(mockAWSAdapter.createKey).toHaveBeenCalledWith('new-test-key');
    });
  });

  describe('GCP KMS Integration', () => {
    let kmsService: KMSService;
    let mockGCPAdapter: jest.Mocked<GCPKMSAdapter>;

    beforeEach(() => {
      mockGCPAdapter = {
        sign: jest.fn().mockResolvedValue({
          signature: testSignature,
          keyId: testKeyId,
          algorithm: 'RSA_SIGN_PKCS1_2048_SHA256',
          signedAt: new Date().toISOString()
        }),
        verify: jest.fn().mockResolvedValue(true),
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
        createKey: jest.fn().mockResolvedValue(testKeyId)
      } as any;
      
      MockedGCPAdapter.mockImplementation(() => mockGCPAdapter);
      
      kmsService = new KMSService('gcp', {
        projectId: 'test-project',
        locationId: 'global',
        keyRingId: 'test-keyring'
      });
    });

    it('should sign data using GCP adapter', async () => {
      const signature = await kmsService.sign(testData, testKeyId);
      expect(signature).toBe(testSignature);
      expect(mockGCPAdapter.sign).toHaveBeenCalledWith(testData, testKeyId);
    });

    it('should verify signature using GCP adapter', async () => {
      const isValid = await kmsService.verify(testData, testSignature, testKeyId);
      expect(isValid).toBe(true);
      expect(mockGCPAdapter.verify).toHaveBeenCalledWith(testData, testSignature, testKeyId);
    });

    it('should get public key using GCP adapter', async () => {
      const publicKey = await kmsService.getPublicKey(testKeyId);
      expect(publicKey).toBe(testPublicKey);
      expect(mockGCPAdapter.getPublicKey).toHaveBeenCalledWith(testKeyId);
    });

    it('should create key using GCP adapter', async () => {
      const keyId = await kmsService.createKey('new-test-key');
      expect(keyId).toBe(testKeyId);
      expect(mockGCPAdapter.createKey).toHaveBeenCalledWith('new-test-key');
    });
  });

  describe('Local Implementation (Development)', () => {
    let kmsService: KMSService;

    beforeEach(() => {
      kmsService = new KMSService('local');
    });

    it('should sign and verify using local implementation', async () => {
      const signature = await kmsService.sign(testData, testKeyId);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      const isValid = await kmsService.verify(testData, signature, testKeyId);
      expect(isValid).toBe(true);
    });

    it('should generate different signatures for different data', async () => {
      const signature1 = await kmsService.sign(testData, testKeyId);
      const signature2 = await kmsService.sign(Buffer.from('different data'), testKeyId);
      
      expect(signature1).not.toBe(signature2);
    });

    it('should return false for invalid signature', async () => {
      const signature = await kmsService.sign(testData, testKeyId);
      const isValid = await kmsService.verify(Buffer.from('tampered data'), signature, testKeyId);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported provider', () => {
      expect(() => {
        new KMSService('invalid' as any);
      }).toThrow('Unsupported KMS provider: invalid');
    });

    it('should throw error when adapter not initialized for AWS', async () => {
      const kmsService = new KMSService('aws');
      // Force adapter to be undefined
      (kmsService as any).awsAdapter = undefined;
      
      await expect(kmsService.sign(testData, testKeyId))
        .rejects.toThrow('AWS KMS adapter not initialized');
    });

    it('should throw error when adapter not initialized for GCP', async () => {
      const kmsService = new KMSService('gcp');
      // Force adapter to be undefined
      (kmsService as any).gcpAdapter = undefined;
      
      await expect(kmsService.sign(testData, testKeyId))
        .rejects.toThrow('GCP KMS adapter not initialized');
    });
  });

  describe('Key Management', () => {
    let kmsService: KMSService;

    beforeEach(() => {
      kmsService = new KMSService('local');
    });

    it('should generate test key ID correctly', () => {
      const workspaceId = 'workspace-123';
      const keyId = KMSService.generateTestKeyId(workspaceId);
      
      expect(keyId).toMatch(/^test-key-[a-f0-9]{16}$/);
      
      // Should be deterministic
      const keyId2 = KMSService.generateTestKeyId(workspaceId);
      expect(keyId).toBe(keyId2);
    });

    it('should return key metadata', async () => {
      const metadata = await kmsService.getKeyMetadata(testKeyId);
      
      expect(metadata).toEqual({
        keyId: testKeyId,
        algorithm: 'RSA-2048',
        keySize: 2048,
        createdAt: expect.any(String),
        status: 'active'
      });
    });

    it('should list available keys', async () => {
      const keys = await kmsService.listKeys();
      
      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toContain('workspace-signing-key-v1');
      expect(keys).toContain('audit-bundle-key-v1');
    });

    it('should rotate key', async () => {
      const newKeyId = await kmsService.rotateKey(testKeyId);
      
      expect(newKeyId).toMatch(new RegExp(`^${testKeyId}-v\\\\d+$`));
    });
  });
});

// Integration test with real Vault (requires Vault dev server)
describe('KMS Integration Test with Vault', () => {
  let kmsService: KMSService;
  const testKeyId = 'integration-test-key';
  const testData = Buffer.from('integration test data');

  beforeAll(() => {
    // Only run if Vault is available
    const vaultAddr = process.env.VAULT_ADDR || 'http://localhost:8200';
    const vaultToken = process.env.VAULT_TOKEN || 'dev-token';
    
    if (!process.env.SKIP_VAULT_INTEGRATION) {
      kmsService = new KMSService('vault', {
        vaultUrl: vaultAddr,
        vaultToken: vaultToken
      });
    }
  });

  it('should sign and verify with real Vault', async () => {
    if (process.env.SKIP_VAULT_INTEGRATION) {
      console.log('Skipping Vault integration test - SKIP_VAULT_INTEGRATION set');
      return;
    }

    try {
      await kmsService.initialize();
      
      // Create a test key
      const keyId = await kmsService.createKey(testKeyId);
      expect(keyId).toBeDefined();
      
      // Sign data
      const signature = await kmsService.sign(testData, testKeyId);
      expect(signature).toBeDefined();
      expect(signature).not.toContain('mock');
      
      // Verify signature
      const isValid = await kmsService.verify(testData, signature, testKeyId);
      expect(isValid).toBe(true);
      
      // Verify tampered data fails
      const tamperedData = Buffer.from('tampered integration test data');
      const isInvalid = await kmsService.verify(tamperedData, signature, testKeyId);
      expect(isInvalid).toBe(false);
      
    } catch (error) {
      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        console.log('Skipping Vault integration test - Vault not available');
        return;
      }
      throw error;
    }
  }, 30000); // 30 second timeout for integration test
});
", "original_text": "", "replace_all": false}]