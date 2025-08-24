export interface KMSAdapter {
  /**
   * Sign data using the specified key
   */
  sign(buffer: Buffer, keyRef: string): Promise<SignatureResult>;

  /**
   * Verify signature using the specified key
   */
  verify(buffer: Buffer, signature: string, keyRef: string): Promise<boolean>;

  /**
   * Get public key for verification
   */
  getPublicKey(keyRef: string): Promise<string>;

  /**
   * Create a new signing key
   */
  createKey(alias: string, options?: KeyCreationOptions): Promise<string>;

  /**
   * Get key metadata
   */
  getKeyMetadata(keyRef: string): Promise<KeyMetadata>;

  /**
   * List available keys
   */
  listKeys(): Promise<string[]>;
}

export interface SignatureResult {
  signature: string;
  keyId: string;
  algorithm: string;
  signedAt: string;
  metadata?: Record<string, any>;
}

export interface KeyCreationOptions {
  keySpec?: 'RSA_2048' | 'RSA_3072' | 'RSA_4096' | 'ECC_NIST_P256' | 'ECC_NIST_P384' | 'ECC_NIST_P521';
  keyUsage?: 'SIGN_VERIFY' | 'ENCRYPT_DECRYPT';
  description?: string;
  tags?: Record<string, string>;
}

export interface KeyMetadata {
  keyId: string;
  alias?: string;
  keySpec: string;
  keyUsage: string;
  algorithm: string;
  keySize: number;
  createdAt: string;
  status: 'active' | 'disabled' | 'deleted' | 'pending_deletion';
  description?: string;
  tags?: Record<string, string>;
}

export abstract class BaseKMSAdapter implements KMSAdapter {
  protected config: Record<string, any>;

  constructor(config: Record<string, any> = {}) {
    this.config = config;
  }

  abstract sign(buffer: Buffer, keyRef: string): Promise<SignatureResult>;
  abstract verify(buffer: Buffer, signature: string, keyRef: string): Promise<boolean>;
  abstract getPublicKey(keyRef: string): Promise<string>;
  abstract createKey(alias: string, options?: KeyCreationOptions): Promise<string>;
  abstract getKeyMetadata(keyRef: string): Promise<KeyMetadata>;
  abstract listKeys(): Promise<string[]>;

  /**
   * Validate key reference format
   */
  protected validateKeyRef(keyRef: string): void {
    if (!keyRef || typeof keyRef !== 'string') {
      throw new Error('Invalid key reference: must be a non-empty string');
    }
  }

  /**
   * Generate deterministic signature metadata
   */
  protected createSignatureMetadata(keyRef: string, algorithm: string): Omit<SignatureResult, 'signature'> {
    return {
      keyId: keyRef,
      algorithm,
      signedAt: new Date().toISOString(),
      metadata: {
        provider: this.constructor.name,
        version: '1.0.0'
      }
    };
  }

  /**
   * Normalize key specification
   */
  protected normalizeKeySpec(keySpec?: string): string {
    const spec = keySpec || 'RSA_2048';
    const validSpecs = ['RSA_2048', 'RSA_3072', 'RSA_4096', 'ECC_NIST_P256', 'ECC_NIST_P384', 'ECC_NIST_P521'];
    
    if (!validSpecs.includes(spec)) {
      throw new Error(`Invalid key specification: ${spec}. Must be one of: ${validSpecs.join(', ')}`);
    }
    
    return spec;
  }

  /**
   * Generate signature algorithm from key spec
   */
  protected getAlgorithmFromKeySpec(keySpec: string): string {
    if (keySpec.startsWith('RSA_')) {
      return 'RSASSA_PKCS1_V1_5_SHA_256';
    } else if (keySpec.startsWith('ECC_')) {
      return 'ECDSA_SHA_256';
    }
    throw new Error(`Unknown algorithm for key spec: ${keySpec}`);
  }
}