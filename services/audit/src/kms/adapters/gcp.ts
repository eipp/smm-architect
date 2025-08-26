import { KeyManagementServiceClient } from '@google-cloud/kms';
import { BaseKMSAdapter, SignatureResult, KeyCreationOptions, KeyMetadata } from './base';
import crypto from 'crypto';

/**
 * Google Cloud KMS Adapter for production cryptographic operations
 * Integrates with Google Cloud Key Management Service
 */
export class GCPKMSAdapter extends BaseKMSAdapter {
  private kmsClient: KeyManagementServiceClient;
  private projectId: string;
  private locationId: string;
  private keyRingId: string;

  constructor(config: {
    projectId?: string;
    locationId?: string;
    keyRingId?: string;
    keyFilename?: string;
    credentials?: any;
  } = {}) {
    super(config);
    
    this.projectId = config.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || '';
    this.locationId = config.locationId || process.env.GCP_LOCATION || 'global';
    this.keyRingId = config.keyRingId || process.env.GCP_KMS_KEYRING || 'smm-architect-keys';
    
    if (!this.projectId) {
      throw new Error('GCP Project ID is required. Set GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable');
    }

    // Initialize KMS client
    const clientConfig: any = {};
    
    if (config.keyFilename) {
      clientConfig.keyFilename = config.keyFilename;
    } else if (config.credentials) {
      clientConfig.credentials = config.credentials;
    }
    
    this.kmsClient = new KeyManagementServiceClient(clientConfig);
  }

  async sign(buffer: Buffer, keyRef: string): Promise<SignatureResult> {
    this.validateKeyRef(keyRef);

    try {
      const fullKeyName = this.getFullKeyName(keyRef);
      
      // Hash the data (GCP KMS expects SHA-256 digest for RSA signatures)
      const hashedData = crypto.createHash('sha256').update(buffer).digest();

      const [response] = await this.kmsClient.asymmetricSign({
        name: `${fullKeyName}/cryptoKeyVersions/1`,
        digest: {
          sha256: hashedData
        }
      });

      if (!response.signature) {
        throw new Error('GCP KMS did not return a signature');
      }

      return {
        signature: Buffer.from(response.signature).toString('base64'),
        keyId: keyRef,
        algorithm: 'RSA_SIGN_PKCS1_2048_SHA256',
        signedAt: new Date().toISOString(),
        metadata: {
          provider: 'GCPKMS',
          version: '1.0.0',
          projectId: this.projectId,
          location: this.locationId,
          keyRing: this.keyRingId,
          fullKeyName: fullKeyName
        }
      };

    } catch (error) {
      throw new Error(`GCP KMS signing failed: ${error.message}`);
    }
  }

  async verify(buffer: Buffer, signature: string, keyRef: string): Promise<boolean> {
    this.validateKeyRef(keyRef);

    try {
      // Get the public key first
      const publicKeyPem = await this.getPublicKey(keyRef);
      
      // Use Node.js crypto to verify (GCP KMS doesn't have a verify endpoint)
      const hashedData = crypto.createHash('sha256').update(buffer).digest();
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(hashedData);
      verify.end();

      return verify.verify(publicKeyPem, signature, 'base64');

    } catch (error) {
      console.error(`GCP KMS verification failed: ${error.message}`);
      return false;
    }
  }

  async getPublicKey(keyRef: string): Promise<string> {
    this.validateKeyRef(keyRef);

    try {
      const fullKeyName = this.getFullKeyName(keyRef);
      
      const [response] = await this.kmsClient.getPublicKey({
        name: `${fullKeyName}/cryptoKeyVersions/1`
      });

      if (!response.pem) {
        throw new Error('GCP KMS did not return a public key');
      }

      return response.pem;

    } catch (error) {
      throw new Error(`Failed to get GCP KMS public key: ${error.message}`);
    }
  }

  async createKey(alias: string, options: KeyCreationOptions = {}): Promise<string> {
    try {
      const keyRingName = this.getKeyRingName();
      
      // Ensure key ring exists
      await this.ensureKeyRingExists();
      
      // Map key spec to GCP algorithm
      const algorithm = this.mapKeySpecToGCPAlgorithm(options.keySpec);
      
      const [response] = await this.kmsClient.createCryptoKey({
        parent: keyRingName,
        cryptoKeyId: alias,
        cryptoKey: {
          purpose: 'ASYMMETRIC_SIGN',
          versionTemplate: {
            algorithm: algorithm,
            protectionLevel: 'SOFTWARE'
          },
          labels: options.tags || {}
        }
      });

      if (!response.name) {
        throw new Error('GCP KMS did not return a key name');
      }

      // Extract the key ID from the full name
      const keyId = response.name.split('/').pop() || alias;
      
      console.log(`✓ Created GCP KMS signing key: ${keyId}`);
      return keyId;

    } catch (error) {
      throw new Error(`Failed to create GCP KMS key: ${error.message}`);
    }
  }

  async getKeyMetadata(keyRef: string): Promise<KeyMetadata> {
    this.validateKeyRef(keyRef);

    try {
      const fullKeyName = this.getFullKeyName(keyRef);
      
      const [response] = await this.kmsClient.getCryptoKey({
        name: fullKeyName
      });

      if (!response) {
        throw new Error('GCP KMS did not return key metadata');
      }

      const algorithm = response.versionTemplate?.algorithm || 'RSA_SIGN_PKCS1_2048_SHA256';
      const keySpec = this.mapGCPAlgorithmToKeySpec(algorithm);

      return {
        keyId: keyRef,
        alias: response.name?.split('/').pop(),
        keySpec: keySpec,
        keyUsage: 'SIGN_VERIFY',
        algorithm: algorithm,
        keySize: this.getKeySizeFromGCPAlgorithm(algorithm),
        createdAt: response.createTime || new Date().toISOString(),
        status: this.mapGCPKeyState(response.versionTemplate?.state || 'ENABLED'),
        description: `GCP KMS key in project ${this.projectId}`,
        tags: response.labels || {}
      };

    } catch (error) {
      throw new Error(`Failed to get GCP KMS key metadata: ${error.message}`);
    }
  }

  async listKeys(): Promise<string[]> {
    try {
      const keyRingName = this.getKeyRingName();
      
      const [keys] = await this.kmsClient.listCryptoKeys({
        parent: keyRingName,
        filter: 'purpose:ASYMMETRIC_SIGN'
      });

      return keys
        .map(key => key.name?.split('/').pop())
        .filter(Boolean) as string[];

    } catch (error) {
      throw new Error(`Failed to list GCP KMS keys: ${error.message}`);
    }
  }

  /**
   * Enable key rotation
   */
  async enableKeyRotation(keyRef: string, rotationPeriod: string = '2592000s'): Promise<void> {
    this.validateKeyRef(keyRef);

    try {
      const fullKeyName = this.getFullKeyName(keyRef);
      
      await this.kmsClient.updateCryptoKey({
        cryptoKey: {
          name: fullKeyName,
          rotationSchedule: {
            rotationPeriod: rotationPeriod // 30 days default
          }
        },
        updateMask: {
          paths: ['rotation_schedule']
        }
      });
      
      console.log(`✓ Key rotation enabled for ${keyRef}`);
    } catch (error) {
      throw new Error(`Failed to enable key rotation: ${error.message}`);
    }
  }

  /**
   * Create a new key version (manual rotation)
   */
  async createKeyVersion(keyRef: string): Promise<string> {
    try {
      const fullKeyName = this.getFullKeyName(keyRef);
      
      const [response] = await this.kmsClient.createCryptoKeyVersion({
        parent: fullKeyName
      });

      const versionName = response.name?.split('/').pop() || '1';
      console.log(`✓ Created new key version ${versionName} for ${keyRef}`);
      
      return versionName;

    } catch (error) {
      throw new Error(`Failed to create key version: ${error.message}`);
    }
  }

  // Private helper methods

  private getKeyRingName(): string {
    return `projects/${this.projectId}/locations/${this.locationId}/keyRings/${this.keyRingId}`;
  }

  private getFullKeyName(keyRef: string): string {
    return `${this.getKeyRingName()}/cryptoKeys/${keyRef}`;
  }

  private async ensureKeyRingExists(): Promise<void> {
    try {
      const locationName = `projects/${this.projectId}/locations/${this.locationId}`;
      
      // Try to get the key ring
      try {
        await this.kmsClient.getKeyRing({
          name: this.getKeyRingName()
        });
      } catch (error) {
        // Key ring doesn't exist, create it
        if (error.code === 5) { // NOT_FOUND
          await this.kmsClient.createKeyRing({
            parent: locationName,
            keyRingId: this.keyRingId
          });
          console.log(`✓ Created GCP KMS key ring: ${this.keyRingId}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.warn(`Key ring check/creation failed: ${error.message}`);
    }
  }

  private mapKeySpecToGCPAlgorithm(keySpec?: string): string {
    switch (keySpec) {
      case 'RSA_2048':
        return 'RSA_SIGN_PKCS1_2048_SHA256';
      case 'RSA_3072':
        return 'RSA_SIGN_PKCS1_3072_SHA256';
      case 'RSA_4096':
        return 'RSA_SIGN_PKCS1_4096_SHA256';
      case 'ECC_NIST_P256':
        return 'EC_SIGN_P256_SHA256';
      case 'ECC_NIST_P384':
        return 'EC_SIGN_P384_SHA384';
      default:
        return 'RSA_SIGN_PKCS1_2048_SHA256';
    }
  }

  private mapGCPAlgorithmToKeySpec(algorithm: string): string {
    switch (algorithm) {
      case 'RSA_SIGN_PKCS1_2048_SHA256':
        return 'RSA_2048';
      case 'RSA_SIGN_PKCS1_3072_SHA256':
        return 'RSA_3072';
      case 'RSA_SIGN_PKCS1_4096_SHA256':
        return 'RSA_4096';
      case 'EC_SIGN_P256_SHA256':
        return 'ECC_NIST_P256';
      case 'EC_SIGN_P384_SHA384':
        return 'ECC_NIST_P384';
      default:
        return 'RSA_2048';
    }
  }

  private getKeySizeFromGCPAlgorithm(algorithm: string): number {
    switch (algorithm) {
      case 'RSA_SIGN_PKCS1_2048_SHA256':
        return 2048;
      case 'RSA_SIGN_PKCS1_3072_SHA256':
        return 3072;
      case 'RSA_SIGN_PKCS1_4096_SHA256':
        return 4096;
      case 'EC_SIGN_P256_SHA256':
        return 256;
      case 'EC_SIGN_P384_SHA384':
        return 384;
      default:
        return 2048;
    }
  }

  private mapGCPKeyState(state: string): 'active' | 'disabled' | 'deleted' | 'pending_deletion' {
    switch (state.toUpperCase()) {
      case 'ENABLED':
        return 'active';
      case 'DISABLED':
        return 'disabled';
      case 'DESTROYED':
        return 'deleted';
      case 'DESTROY_SCHEDULED':
        return 'pending_deletion';
      default:
        return 'active';
    }
  }

  /**
   * Validate GCP key reference format
   */
  protected validateKeyRef(keyRef: string): void {
    super.validateKeyRef(keyRef);
    
    // GCP key references should be alphanumeric with hyphens and underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    
    if (!validPattern.test(keyRef)) {
      throw new Error(`Invalid GCP KMS key reference format: ${keyRef}. Must contain only alphanumeric characters, hyphens, and underscores.`);
    }
  }
}