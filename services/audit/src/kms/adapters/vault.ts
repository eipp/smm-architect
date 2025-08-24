import { VaultClient, VaultClientConfig } from '../../../../shared/vault-client';
import { KMSAdapter, KMSSignatureMetadata } from '../types';
import crypto from 'crypto';

export interface VaultKMSConfig {
  vaultUrl: string;
  vaultToken?: string;
  roleId?: string;
  secretId?: string;
  k8sRole?: string;
  namespace?: string;
  transitMount?: string;
  keyPrefix?: string;
}

export class VaultKMSAdapter implements KMSAdapter {
  private vaultClient: VaultClient;
  private transitMount: string;
  private keyPrefix: string;

  constructor(config: VaultKMSConfig) {
    const vaultConfig: VaultClientConfig = {
      address: config.vaultUrl,
      token: config.vaultToken,
      roleId: config.roleId,
      secretId: config.secretId,
      k8sRole: config.k8sRole,
      namespace: config.namespace,
      timeout: 30000,
      retries: 3
    };

    this.vaultClient = new VaultClient(vaultConfig);
    this.transitMount = config.transitMount || 'transit';
    this.keyPrefix = config.keyPrefix || 'smm-architect';
  }

  /**
   * Initialize the Vault KMS adapter
   */
  async initialize(): Promise<void> {
    await this.vaultClient.initialize();
    
    // Ensure transit mount is enabled and configured
    await this.ensureTransitMount();
    
    console.log('✓ Vault KMS adapter initialized');
  }

  /**
   * Sign data using Vault Transit engine
   */
  async sign(data: Buffer, keyId: string): Promise<string> {
    try {
      const keyName = this.getKeyName(keyId);
      
      // Ensure the key exists
      await this.ensureKeyExists(keyName);
      
      // Hash the data first (Vault Transit expects pre-hashed data for RSA signatures)
      const hashedData = crypto.createHash('sha256').update(data).digest();
      
      // Sign using Vault Transit
      const response = await this.makeTransitRequest('POST', `sign/${keyName}/sha2-256`, {
        input: hashedData.toString('base64'),
        signature_algorithm: 'pkcs1v15'
      });

      if (!response.data?.signature) {
        throw new Error('Vault did not return a signature');
      }

      const signature = response.data.signature;
      console.log(`✓ Signed data with Vault key: ${keyName}`);
      
      return signature;
    } catch (error) {
      throw new Error(`Vault signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify signature using Vault Transit engine
   */
  async verify(data: Buffer, signature: string, keyId: string): Promise<boolean> {
    try {
      const keyName = this.getKeyName(keyId);
      
      // Hash the data
      const hashedData = crypto.createHash('sha256').update(data).digest();
      
      // Verify using Vault Transit
      const response = await this.makeTransitRequest('POST', `verify/${keyName}/sha2-256`, {
        input: hashedData.toString('base64'),
        signature,
        signature_algorithm: 'pkcs1v15'
      });

      const isValid = response.data?.valid === true;
      console.log(`✓ Signature verification: ${isValid ? 'VALID' : 'INVALID'} for key: ${keyName}`);
      
      return isValid;
    } catch (error) {
      console.error(`Vault signature verification failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get public key from Vault
   */
  async getPublicKey(keyId: string): Promise<string> {
    try {
      const keyName = this.getKeyName(keyId);
      
      const response = await this.makeTransitRequest('GET', `keys/${keyName}`);
      
      if (!response.data?.keys) {
        throw new Error('No key versions found');
      }

      // Get the latest version public key
      const latestVersion = Math.max(...Object.keys(response.data.keys).map(Number));
      const publicKey = response.data.keys[latestVersion].public_key;
      
      if (!publicKey) {
        throw new Error('Public key not available for this key');
      }

      return publicKey;
    } catch (error) {
      throw new Error(`Failed to get public key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new signing key in Vault
   */
  async createKey(alias: string): Promise<string> {
    try {
      const keyName = this.getKeyName(alias);
      
      // Create RSA-4096 key for signatures
      await this.makeTransitRequest('POST', `keys/${keyName}`, {
        type: 'rsa-4096',
        exportable: false,
        allow_plaintext_backup: false
      });

      console.log(`✓ Created Vault signing key: ${keyName}`);
      return keyName;
    } catch (error) {
      throw new Error(`Failed to create key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rotate a key in Vault (creates new version)
   */
  async rotateKey(keyId: string): Promise<string> {
    try {
      const keyName = this.getKeyName(keyId);
      
      await this.makeTransitRequest('POST', `keys/${keyName}/rotate`);
      
      console.log(`✓ Rotated Vault key: ${keyName}`);
      return keyName;
    } catch (error) {
      throw new Error(`Failed to rotate key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List available keys
   */
  async listKeys(): Promise<string[]> {
    try {
      const response = await this.makeTransitRequest('LIST', 'keys');
      
      const allKeys = response.data?.keys || [];
      
      // Filter to only our prefixed keys and remove the prefix
      return allKeys
        .filter((key: string) => key.startsWith(`${this.keyPrefix}-`))
        .map((key: string) => key.substring(`${this.keyPrefix}-`.length));
    } catch (error) {
      throw new Error(`Failed to list keys: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get signature metadata (algorithm, key version, etc.)
   */
  async getSignatureMetadata(signature: string): Promise<KMSSignatureMetadata> {
    try {
      // Vault signatures include version information
      // Format: vault:v<version>:<algorithm>:<signature>
      const parts = signature.split(':');
      
      if (parts.length < 4 || parts[0] !== 'vault') {
        throw new Error('Invalid Vault signature format');
      }

      const version = parseInt(parts[1].substring(1)); // Remove 'v' prefix
      const algorithm = parts[2] || 'rsa-pkcs1v15';
      
      return {
        algorithm: algorithm,
        keyVersion: version.toString(),
        timestamp: new Date().toISOString(),
        provider: 'vault'
      };
    } catch (error) {
      throw new Error(`Failed to parse signature metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encrypt data using Vault Transit
   */
  async encrypt(data: Buffer, keyId: string, context?: string): Promise<string> {
    try {
      const keyName = this.getKeyName(keyId);
      
      // Ensure the key exists
      await this.ensureKeyExists(keyName);
      
      const payload: any = {
        plaintext: data.toString('base64')
      };
      
      if (context) {
        payload.context = Buffer.from(context).toString('base64');
      }

      const response = await this.makeTransitRequest('POST', `encrypt/${keyName}`, payload);
      
      if (!response.data?.ciphertext) {
        throw new Error('Vault did not return ciphertext');
      }

      console.log(`✓ Encrypted data with Vault key: ${keyName}`);
      return response.data.ciphertext;
    } catch (error) {
      throw new Error(`Vault encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt data using Vault Transit
   */
  async decrypt(ciphertext: string, keyId: string, context?: string): Promise<Buffer> {
    try {
      const keyName = this.getKeyName(keyId);
      
      const payload: any = { ciphertext };
      
      if (context) {
        payload.context = Buffer.from(context).toString('base64');
      }

      const response = await this.makeTransitRequest('POST', `decrypt/${keyName}`, payload);
      
      if (!response.data?.plaintext) {
        throw new Error('Vault did not return plaintext');
      }

      console.log(`✓ Decrypted data with Vault key: ${keyName}`);
      return Buffer.from(response.data.plaintext, 'base64');
    } catch (error) {
      throw new Error(`Vault decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get health status of Vault KMS
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    transitEnabled: boolean;
    keyCount: number;
    error?: string;
  }> {
    try {
      const health = await this.vaultClient.getHealth();
      const keys = await this.listKeys();
      
      return {
        healthy: !health.sealed && health.initialized,
        transitEnabled: true,
        keyCount: keys.length
      };
    } catch (error) {
      return {
        healthy: false,
        transitEnabled: false,
        keyCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Private helper methods

  private getKeyName(keyId: string): string {
    return `${this.keyPrefix}-${keyId}`;
  }

  private async makeTransitRequest(method: string, path: string, data?: any): Promise<any> {
    const url = `/v1/${this.transitMount}/${path}`;
    
    // Use the VaultClient's internal client
    const client = (this.vaultClient as any).client;
    
    const config: any = { method, url };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await client(config);
    return response.data;
  }

  private async ensureTransitMount(): Promise<void> {
    try {
      // Check if transit mount exists
      const client = (this.vaultClient as any).client;
      const mounts = await client.get('/v1/sys/mounts');
      
      const transitExists = mounts.data?.[`${this.transitMount}/`];
      
      if (!transitExists) {
        // Enable transit mount
        await client.post(`/v1/sys/mounts/${this.transitMount}`, {
          type: 'transit',
          description: 'SMM Architect encryption and signing'
        });
        console.log(`✓ Enabled transit mount: ${this.transitMount}`);
      }
    } catch (error) {
      // If we can't enable transit mount, it might already exist or we lack permissions
      console.warn(`Transit mount check/creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureKeyExists(keyName: string): Promise<void> {
    try {
      // Try to read the key
      await this.makeTransitRequest('GET', `keys/${keyName}`);
    } catch (error) {
      // Key doesn't exist, create it
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        await this.createKey(keyName.substring(`${this.keyPrefix}-`.length));
      } else {
        throw error;
      }
    }
  }
}