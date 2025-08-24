import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { BaseKMSAdapter, SignatureResult, KeyCreationOptions, KeyMetadata } from './base';

/**
 * Local KMS Adapter for development and CI environments
 * Uses filesystem-based key storage with real cryptographic operations
 */
export class LocalKMSAdapter extends BaseKMSAdapter {
  private keyStorePath: string;
  private keyCache: Map<string, { privateKey: string; publicKey: string; metadata: KeyMetadata }>;

  constructor(config: { keyStorePath?: string } = {}) {
    super(config);
    this.keyStorePath = config.keyStorePath || path.join(process.cwd(), '.kms-keys');
    this.keyCache = new Map();
    this.ensureKeyStoreExists();
  }

  async sign(buffer: Buffer, keyRef: string): Promise<SignatureResult> {
    this.validateKeyRef(keyRef);
    
    try {
      const keyPair = await this.getOrLoadKeyPair(keyRef);
      
      // Determine algorithm based on key type
      const algorithm = keyPair.metadata.algorithm;
      const signAlgorithm = this.mapToSigningAlgorithm(algorithm);
      
      // Create hash and sign
      const hash = crypto.createHash('sha256').update(buffer).digest();
      const sign = crypto.createSign(signAlgorithm);
      sign.update(hash);
      sign.end();
      
      const signature = sign.sign(keyPair.privateKey, 'base64');
      
      return {
        signature,
        keyId: keyRef,
        algorithm,
        signedAt: new Date().toISOString(),
        metadata: {
          provider: 'LocalKMS',
          version: '1.0.0',
          keySize: keyPair.metadata.keySize,
          signatureFormat: 'base64'
        }
      };
      
    } catch (error) {
      throw new Error(`Local KMS signing failed: ${error.message}`);
    }
  }

  async verify(buffer: Buffer, signature: string, keyRef: string): Promise<boolean> {
    this.validateKeyRef(keyRef);
    
    try {
      const keyPair = await this.getOrLoadKeyPair(keyRef);
      
      const algorithm = keyPair.metadata.algorithm;
      const signAlgorithm = this.mapToSigningAlgorithm(algorithm);
      
      const hash = crypto.createHash('sha256').update(buffer).digest();
      const verify = crypto.createVerify(signAlgorithm);
      verify.update(hash);
      verify.end();
      
      return verify.verify(keyPair.publicKey, signature, 'base64');
      
    } catch (error) {
      console.error(`Local KMS verification failed: ${error.message}`);
      return false;
    }
  }

  async getPublicKey(keyRef: string): Promise<string> {
    this.validateKeyRef(keyRef);
    const keyPair = await this.getOrLoadKeyPair(keyRef);
    return keyPair.publicKey;
  }

  async createKey(alias: string, options: KeyCreationOptions = {}): Promise<string> {
    const keySpec = this.normalizeKeySpec(options.keySpec);
    const keyId = `local-${alias}-${Date.now()}`;
    
    try {
      // Generate key pair based on specification
      const keyPair = this.generateKeyPair(keySpec);
      
      // Create metadata
      const metadata: KeyMetadata = {
        keyId,
        alias,
        keySpec,
        keyUsage: options.keyUsage || 'SIGN_VERIFY',
        algorithm: this.getAlgorithmFromKeySpec(keySpec),
        keySize: this.getKeySizeFromSpec(keySpec),
        createdAt: new Date().toISOString(),
        status: 'active',
        description: options.description,
        tags: options.tags
      };
      
      // Store key pair and metadata
      await this.storeKeyPair(keyId, keyPair, metadata);
      
      // Cache for immediate use
      this.keyCache.set(keyId, {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        metadata
      });
      
      return keyId;
      
    } catch (error) {
      throw new Error(`Failed to create local key: ${error.message}`);
    }
  }

  async getKeyMetadata(keyRef: string): Promise<KeyMetadata> {
    this.validateKeyRef(keyRef);
    const keyPair = await this.getOrLoadKeyPair(keyRef);
    return keyPair.metadata;
  }

  async listKeys(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.keyStorePath)) {
        return [];
      }
      
      const files = fs.readdirSync(this.keyStorePath);
      const keyIds = files
        .filter(file => file.endsWith('.metadata.json'))
        .map(file => file.replace('.metadata.json', ''));
      
      return keyIds;
      
    } catch (error) {
      throw new Error(`Failed to list local keys: ${error.message}`);
    }
  }

  /**
   * Delete a key (for testing)
   */
  async deleteKey(keyRef: string): Promise<void> {
    this.validateKeyRef(keyRef);
    
    try {
      const privateKeyPath = path.join(this.keyStorePath, `${keyRef}.private.pem`);
      const publicKeyPath = path.join(this.keyStorePath, `${keyRef}.public.pem`);
      const metadataPath = path.join(this.keyStorePath, `${keyRef}.metadata.json`);
      
      // Remove files if they exist
      [privateKeyPath, publicKeyPath, metadataPath].forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      
      // Remove from cache
      this.keyCache.delete(keyRef);
      
    } catch (error) {
      throw new Error(`Failed to delete local key: ${error.message}`);
    }
  }

  /**
   * Create test key pair for CI
   */
  static async createTestKeyPair(keyId: string = 'test-key'): Promise<{ keyId: string; publicKey: string }> {
    const adapter = new LocalKMSAdapter({
      keyStorePath: path.join(process.cwd(), 'ci', 'keys')
    });
    
    const createdKeyId = await adapter.createKey(keyId, {
      keySpec: 'RSA_2048',
      description: 'Test key for CI/CD pipeline'
    });
    
    const publicKey = await adapter.getPublicKey(createdKeyId);
    
    return { keyId: createdKeyId, publicKey };
  }

  // Private helper methods

  private ensureKeyStoreExists(): void {
    if (!fs.existsSync(this.keyStorePath)) {
      fs.mkdirSync(this.keyStorePath, { recursive: true });
      // Set restrictive permissions
      fs.chmodSync(this.keyStorePath, 0o700);
    }
  }

  private async getOrLoadKeyPair(keyRef: string): Promise<{
    privateKey: string;
    publicKey: string;
    metadata: KeyMetadata;
  }> {
    // Check cache first
    const cached = this.keyCache.get(keyRef);
    if (cached) {
      return cached;
    }

    // Load from filesystem
    try {
      const privateKeyPath = path.join(this.keyStorePath, `${keyRef}.private.pem`);
      const publicKeyPath = path.join(this.keyStorePath, `${keyRef}.public.pem`);
      const metadataPath = path.join(this.keyStorePath, `${keyRef}.metadata.json`);

      if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath) || !fs.existsSync(metadataPath)) {
        throw new Error(`Key not found: ${keyRef}`);
      }

      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      const keyPair = { privateKey, publicKey, metadata };
      
      // Cache for future use
      this.keyCache.set(keyRef, keyPair);
      
      return keyPair;

    } catch (error) {
      throw new Error(`Failed to load key ${keyRef}: ${error.message}`);
    }
  }

  private generateKeyPair(keySpec: string): { privateKey: string; publicKey: string } {
    if (keySpec.startsWith('RSA_')) {
      const modulusLength = parseInt(keySpec.split('_')[1]);
      return crypto.generateKeyPairSync('rsa', {
        modulusLength,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
    } else if (keySpec.startsWith('ECC_')) {
      const namedCurve = this.mapECCSpecToCurve(keySpec);
      return crypto.generateKeyPairSync('ec', {
        namedCurve,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
    } else {
      throw new Error(`Unsupported key specification: ${keySpec}`);
    }
  }

  private async storeKeyPair(
    keyId: string,
    keyPair: { privateKey: string; publicKey: string },
    metadata: KeyMetadata
  ): Promise<void> {
    const privateKeyPath = path.join(this.keyStorePath, `${keyId}.private.pem`);
    const publicKeyPath = path.join(this.keyStorePath, `${keyId}.public.pem`);
    const metadataPath = path.join(this.keyStorePath, `${keyId}.metadata.json`);

    // Write private key with restricted permissions
    fs.writeFileSync(privateKeyPath, keyPair.privateKey, { mode: 0o600 });
    
    // Write public key
    fs.writeFileSync(publicKeyPath, keyPair.publicKey, { mode: 0o644 });
    
    // Write metadata
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 });
  }

  private mapToSigningAlgorithm(algorithm: string): string {
    switch (algorithm) {
      case 'RSASSA_PKCS1_V1_5_SHA_256':
        return 'RSA-SHA256';
      case 'ECDSA_SHA_256':
        return 'SHA256';
      default:
        throw new Error(`Unknown signature algorithm: ${algorithm}`);
    }
  }

  private getKeySizeFromSpec(keySpec: string): number {
    if (keySpec.startsWith('RSA_')) {
      return parseInt(keySpec.split('_')[1]);
    } else if (keySpec === 'ECC_NIST_P256') {
      return 256;
    } else if (keySpec === 'ECC_NIST_P384') {
      return 384;
    } else if (keySpec === 'ECC_NIST_P521') {
      return 521;
    }
    throw new Error(`Unknown key size for spec: ${keySpec}`);
  }

  private mapECCSpecToCurve(keySpec: string): string {
    switch (keySpec) {
      case 'ECC_NIST_P256':
        return 'prime256v1';
      case 'ECC_NIST_P384':
        return 'secp384r1';
      case 'ECC_NIST_P521':
        return 'secp521r1';
      default:
        throw new Error(`Unknown ECC curve for spec: ${keySpec}`);
    }
  }
}