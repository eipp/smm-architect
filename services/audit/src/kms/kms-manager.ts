import type { KMSAdapter, SignatureResult, KeyCreationOptions, KeyMetadata } from './adapters/base';

export interface KMSConfig {
  provider: 'local' | 'aws' | 'vault' | 'gcp';
  config?: Record<string, any>;
}

/**
 * KMS Manager - provides unified interface for different KMS providers
 * Automatically selects the appropriate adapter based on configuration
 */
export class KMSManager {
  private adapter: KMSAdapter;
  private provider: string;

  constructor(config: KMSConfig) {
    this.provider = config.provider;
    this.adapter = this.createAdapter(config);
  }

  /**
   * Sign data using the configured KMS provider
   */
  async sign(buffer: Buffer, keyRef: string): Promise<SignatureResult> {
    try {
      const result = await this.adapter.sign(buffer, keyRef);
      
      // Add manager metadata
      return {
        ...result,
        metadata: {
          ...result.metadata,
          kmsProvider: this.provider,
          managedBy: 'KMSManager'
        }
      };
    } catch (error) {
      throw new Error(`KMS signing failed with ${this.provider}: ${error.message}`);
    }
  }

  /**
   * Verify signature using the configured KMS provider
   */
  async verify(buffer: Buffer, signature: string, keyRef: string): Promise<boolean> {
    try {
      return await this.adapter.verify(buffer, signature, keyRef);
    } catch (error) {
      console.error(`KMS verification failed with ${this.provider}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get public key for verification
   */
  async getPublicKey(keyRef: string): Promise<string> {
    return await this.adapter.getPublicKey(keyRef);
  }

  /**
   * Create a new signing key
   */
  async createKey(alias: string, options?: KeyCreationOptions): Promise<string> {
    return await this.adapter.createKey(alias, options);
  }

  /**
   * Get key metadata
   */
  async getKeyMetadata(keyRef: string): Promise<KeyMetadata> {
    return await this.adapter.getKeyMetadata(keyRef);
  }

  /**
   * List available keys
   */
  async listKeys(): Promise<string[]> {
    return await this.adapter.listKeys();
  }

  /**
   * Get the current provider name
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Create appropriate adapter based on configuration
   */
  private createAdapter(config: KMSConfig): KMSAdapter {
    switch (config.provider) {
      case 'local': {
        const { LocalKMSAdapter } = require('./adapters/local');
        return new LocalKMSAdapter(config.config);
      }
      case 'aws': {
        const { AWSKMSAdapter } = require('./adapters/aws');
        return new AWSKMSAdapter(config.config);
      }
      case 'gcp': {
        const { GCPKMSAdapter } = require('./adapters/gcp');
        return new GCPKMSAdapter(config.config);
      }
      case 'vault': {
        if (!config.config?.vaultUrl) {
          throw new Error('Vault KMS requires vaultUrl configuration');
        }
        const { VaultKMSAdapter } = require('./adapters/vault');
        return new VaultKMSAdapter(config.config);
      }
      default:
        throw new Error(`Unsupported KMS provider: ${config.provider}`);
    }
  }

  /**
   * Factory method to create KMS manager from environment variables
   */
  static fromEnvironment(): KMSManager {
    const provider = (process.env.KMS_PROVIDER || 'local') as 'local' | 'aws' | 'vault' | 'gcp';
    
    let config: Record<string, any> = {};
    
    switch (provider) {
      case 'aws':
        config = {
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN
        };
        break;
        
      case 'vault':
        config = {
          vaultUrl: process.env.VAULT_URL || process.env.VAULT_ADDR,
          vaultToken: process.env.VAULT_TOKEN,
          roleId: process.env.VAULT_ROLE_ID,
          secretId: process.env.VAULT_SECRET_ID,
          k8sRole: process.env.VAULT_K8S_ROLE || 'audit-service',
          namespace: process.env.VAULT_NAMESPACE,
          transitMount: process.env.VAULT_TRANSIT_MOUNT || 'transit',
          keyPrefix: process.env.KMS_KEY_PREFIX || 'smm-architect'
        };
        break;
        
      case 'gcp':
        config = {
          projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
          locationId: process.env.GCP_LOCATION,
          keyRingId: process.env.GCP_KMS_KEYRING,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        };
        break;

      case 'local':
        config = {
          keyStorePath: process.env.LOCAL_KMS_KEY_PATH
        };
        break;
    }
    
    return new KMSManager({ provider, config });
  }

  /**
   * Factory method for CI/test environments
   */
  static forTesting(keyStorePath?: string): KMSManager {
    return new KMSManager({
      provider: 'local',
      config: {
        keyStorePath: keyStorePath || './ci/keys'
      }
    });
  }

  /**
   * Factory method for production AWS environment
   */
  static forAWS(region: string = 'us-east-1'): KMSManager {
    return new KMSManager({
      provider: 'aws',
      config: { region }
    });
  }

  /**
   * Factory method for Vault environment
   */
  static forVault(vaultUrl: string, config: {
    vaultToken?: string;
    roleId?: string;
    secretId?: string;
    k8sRole?: string;
    namespace?: string;
    transitMount?: string;
    keyPrefix?: string;
  } = {}): KMSManager {
    return new KMSManager({
      provider: 'vault',
      config: { vaultUrl, ...config }
    });
  }

  /**
   * Health check for the KMS provider
   */
  async healthCheck(): Promise<{
    provider: string;
    healthy: boolean;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    try {
      // Try to list keys as a basic connectivity test
      const keys = await this.adapter.listKeys();
      
      return {
        provider: this.provider,
        healthy: true,
        metadata: {
          keyCount: keys.length,
          adapterType: this.adapter.constructor.name
        }
      };
    } catch (error) {
      return {
        provider: this.provider,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Create a test signature and verify it (for health checks)
   */
  async performSignVerifyTest(keyRef: string): Promise<boolean> {
    try {
      const testData = Buffer.from('KMS health check test data');
      const signature = await this.sign(testData, keyRef);
      const verified = await this.verify(testData, signature.signature, keyRef);
      
      return verified;
    } catch (error) {
      console.error(`KMS sign/verify test failed: ${error.message}`);
      return false;
    }
  }
}