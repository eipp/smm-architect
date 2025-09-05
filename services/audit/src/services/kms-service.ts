import crypto from 'crypto';
import { KMSProvider } from '../types';
import { VaultKMSAdapter } from '../kms/adapters/vault';
import { AWSKMSAdapter } from '../kms/adapters/aws';
import { GCPKMSAdapter } from '../kms/adapters/gcp';

/**
 * KMS Service for cryptographic operations
 * Supports AWS KMS, Google Cloud KMS, Vault, and local signing
 */
export class KMSService implements KMSProvider {
  private provider: 'aws' | 'gcp' | 'vault' | 'local';
  private vaultAdapter?: VaultKMSAdapter;
  private awsAdapter?: AWSKMSAdapter;
  private gcpAdapter?: GCPKMSAdapter;

  constructor(provider: 'aws' | 'gcp' | 'vault' | 'local', config: any = {}) {
    this.provider = provider;
    
    // Initialize appropriate adapter based on provider
    switch (provider) {
      case 'vault':
        this.vaultAdapter = new VaultKMSAdapter({
          vaultUrl: config.vaultUrl || process.env['VAULT_ADDR'] || 'http://localhost:8200',
          vaultToken: config.vaultToken || process.env['VAULT_TOKEN'],
          transitMount: config.transitMount || 'transit',
          keyPrefix: config.keyPrefix || 'smm-audit'
        });
        break;
      case 'aws':
        this.awsAdapter = new AWSKMSAdapter({
          region: config.region || process.env['AWS_REGION'],
          accessKeyId: config.accessKeyId || process.env['AWS_ACCESS_KEY_ID'],
          secretAccessKey: config.secretAccessKey || process.env['AWS_SECRET_ACCESS_KEY'],
          sessionToken: config.sessionToken || process.env['AWS_SESSION_TOKEN'],
          endpoint: config.endpoint
        });
        break;
      case 'gcp':
        this.gcpAdapter = new GCPKMSAdapter({
          projectId: config.projectId || process.env['GOOGLE_CLOUD_PROJECT'],
          locationId: config.locationId || process.env['GCP_LOCATION'],
          keyRingId: config.keyRingId || process.env['GCP_KMS_KEYRING'],
          keyFilename: config.keyFilename || process.env['GOOGLE_APPLICATION_CREDENTIALS'],
          credentials: config.credentials
        });
        break;
      case 'local':
        // Local implementation remains for development/testing
        break;
      default:
        throw new Error(`Unsupported KMS provider: ${provider}`);
    }
  }

  /**
   * Initialize the KMS service (required for some providers like Vault)
   */
  async initialize(): Promise<void> {
    if (this.provider === 'vault' && this.vaultAdapter) {
      await this.vaultAdapter.initialize();
    }
    // AWS and GCP adapters don't require explicit initialization
    console.log(`✓ KMS Service initialized with ${this.provider} provider`);
  }

  /**
   * Sign data using the specified key
   */
  async sign(data: Buffer, keyId: string): Promise<string> {
    switch (this.provider) {
      case 'aws':
        return this.signWithAWS(data, keyId);
      case 'gcp':
        return this.signWithGCP(data, keyId);
      case 'vault':
        return this.signWithVault(data, keyId);
      case 'local':
        return this.signWithLocal(data, keyId);
      default:
        throw new Error(`Unsupported KMS provider: ${this.provider}`);
    }
  }

  /**
   * Verify signature using the specified key
   */
  async verify(data: Buffer, signature: string, keyId: string): Promise<boolean> {
    switch (this.provider) {
      case 'aws':
        return this.verifyWithAWS(data, signature, keyId);
      case 'gcp':
        return this.verifyWithGCP(data, signature, keyId);
      case 'vault':
        return this.verifyWithVault(data, signature, keyId);
      case 'local':
        return this.verifyWithLocal(data, signature, keyId);
      default:
        throw new Error(`Unsupported KMS provider: ${this.provider}`);
    }
  }

  /**
   * Get public key for verification
   */
  async getPublicKey(keyId: string): Promise<string> {
    switch (this.provider) {
      case 'aws':
        return this.getPublicKeyAWS(keyId);
      case 'gcp':
        return this.getPublicKeyGCP(keyId);
      case 'vault':
        return this.getPublicKeyVault(keyId);
      case 'local':
        return this.getPublicKeyLocal(keyId);
      default:
        throw new Error(`Unsupported KMS provider: ${this.provider}`);
    }
  }

  /**
   * Create a new signing key
   */
  async createKey(alias: string): Promise<string> {
    switch (this.provider) {
      case 'aws':
        return this.createKeyAWS(alias);
      case 'gcp':
        return this.createKeyGCP(alias);
      case 'vault':
        return this.createKeyVault(alias);
      case 'local':
        return this.createKeyLocal(alias);
      default:
        throw new Error(`Unsupported KMS provider: ${this.provider}`);
    }
  }

  // AWS KMS Implementation
  private async signWithAWS(data: Buffer, keyId: string): Promise<string> {
    if (!this.awsAdapter) {
      throw new Error('AWS KMS adapter not initialized');
    }
    const result = await this.awsAdapter.sign(data, keyId);
    return result.signature;
  }

  private async verifyWithAWS(data: Buffer, signature: string, keyId: string): Promise<boolean> {
    if (!this.awsAdapter) {
      throw new Error('AWS KMS adapter not initialized');
    }
    return await this.awsAdapter.verify(data, signature, keyId);
  }

  private async getPublicKeyAWS(keyId: string): Promise<string> {
    if (!this.awsAdapter) {
      throw new Error('AWS KMS adapter not initialized');
    }
    return await this.awsAdapter.getPublicKey(keyId);
  }

  private async createKeyAWS(alias: string): Promise<string> {
    if (!this.awsAdapter) {
      throw new Error('AWS KMS adapter not initialized');
    }
    return await this.awsAdapter.createKey(alias);
  }

  // Google Cloud KMS Implementation
  private async signWithGCP(data: Buffer, keyId: string): Promise<string> {
    if (!this.gcpAdapter) {
      throw new Error('GCP KMS adapter not initialized');
    }
    const result = await this.gcpAdapter.sign(data, keyId);
    return result.signature;
  }

  private async verifyWithGCP(data: Buffer, signature: string, keyId: string): Promise<boolean> {
    if (!this.gcpAdapter) {
      throw new Error('GCP KMS adapter not initialized');
    }
    return await this.gcpAdapter.verify(data, signature, keyId);
  }

  private async getPublicKeyGCP(keyId: string): Promise<string> {
    if (!this.gcpAdapter) {
      throw new Error('GCP KMS adapter not initialized');
    }
    return await this.gcpAdapter.getPublicKey(keyId);
  }

  private async createKeyGCP(alias: string): Promise<string> {
    if (!this.gcpAdapter) {
      throw new Error('GCP KMS adapter not initialized');
    }
    return await this.gcpAdapter.createKey(alias);
  }

  // Vault Implementation (using real VaultKMSAdapter)
  private async signWithVault(data: Buffer, keyId: string): Promise<string> {
    if (!this.vaultAdapter) {
      throw new Error('Vault adapter not initialized');
    }
    return await this.vaultAdapter.sign(data, keyId);
  }

  private async verifyWithVault(data: Buffer, signature: string, keyId: string): Promise<boolean> {
    if (!this.vaultAdapter) {
      throw new Error('Vault adapter not initialized');
    }
    return await this.vaultAdapter.verify(data, signature, keyId);
  }

  private async getPublicKeyVault(keyId: string): Promise<string> {
    if (!this.vaultAdapter) {
      throw new Error('Vault adapter not initialized');
    }
    return await this.vaultAdapter.getPublicKey(keyId);
  }

  private async createKeyVault(alias: string): Promise<string> {
    if (!this.vaultAdapter) {
      throw new Error('Vault adapter not initialized');
    }
    return await this.vaultAdapter.createKey(alias);
  }

  // Local Implementation (for development/testing)
  private async signWithLocal(data: Buffer, keyId: string): Promise<string> {
    try {
      // Generate or load RSA key pair
      const keyPair = this.getOrCreateLocalKeyPair(keyId);
      
      // Create signature using RSA-SHA256
      const hash = crypto.createHash('sha256').update(data).digest();
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(hash);
      sign.end();
      
      const signature = sign.sign(keyPair.privateKey, 'base64');
      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Local signing failed: ${errorMessage}`);
    }
  }

  private async verifyWithLocal(data: Buffer, signature: string, keyId: string): Promise<boolean> {
    try {
      const keyPair = this.getOrCreateLocalKeyPair(keyId);
      
      const hash = crypto.createHash('sha256').update(data).digest();
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(hash);
      verify.end();
      
      return verify.verify(keyPair.publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  private async getPublicKeyLocal(keyId: string): Promise<string> {
    const keyPair = this.getOrCreateLocalKeyPair(keyId);
    return keyPair.publicKey;
  }

  private async createKeyLocal(alias: string): Promise<string> {
    const keyId = `local-${alias}-${Date.now()}`;
    this.getOrCreateLocalKeyPair(keyId); // This will create the key pair
    return keyId;
  }

  private getOrCreateLocalKeyPair(_keyId: string): { privateKey: string; publicKey: string } {
    // In a real implementation, this would persist keys securely
    // For testing, we'll generate ephemeral keys
    
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey
    };
  }

  /**
   * Utility method to get key metadata
   */
  async getKeyMetadata(_keyId: string): Promise<{
    keyId: string;
    algorithm: string;
    keySize: number;
    createdAt: string;
    status: 'active' | 'disabled' | 'deleted';
  }> {
    return {
      keyId: _keyId,
      algorithm: 'RSA-2048',
      keySize: 2048,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
  }

  /**
   * Rotate a key (create new version)
   */
  async rotateKey(_keyId: string): Promise<string> {
    const newKeyId = `${_keyId}-v${Date.now()}`;
    return this.createKey(newKeyId);
  }

  /**
   * List available keys
   */
  async listKeys(): Promise<string[]> {
    // Mock implementation - return sample keys
    return [
      'workspace-signing-key-v1',
      'audit-bundle-key-v1',
      'tenant-specific-key-v1'
    ];
  }

  /**
   * Generate a deterministic key ID for testing
   */
  static generateTestKeyId(workspaceId: string, purpose: string = 'signing'): string {
    const hash = crypto.createHash('sha256')
      .update(`${workspaceId}-${purpose}`)
      .digest('hex');
    return `test-key-${hash.substring(0, 16)}`;
  }
}