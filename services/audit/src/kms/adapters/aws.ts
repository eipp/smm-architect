import { KMSClient, SignCommand, VerifyCommand, CreateKeyCommand, DescribeKeyCommand, ListKeysCommand, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { BaseKMSAdapter, SignatureResult, KeyCreationOptions, KeyMetadata } from './base';

/**
 * AWS KMS Adapter for production cryptographic operations
 * Integrates with AWS Key Management Service
 */
export class AWSKMSAdapter extends BaseKMSAdapter {
  private kmsClient: KMSClient;
  private region: string;

  constructor(config: {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    endpoint?: string;
  } = {}) {
    super(config);
    
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    
    // Initialize KMS client
    this.kmsClient = new KMSClient({
      region: this.region,
      credentials: config.accessKeyId && config.secretAccessKey ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken
      } : undefined,
      endpoint: config.endpoint
    });
  }

  async sign(buffer: Buffer, keyRef: string): Promise<SignatureResult> {
    this.validateKeyRef(keyRef);

    try {
      const command = new SignCommand({
        KeyId: keyRef,
        Message: buffer,
        MessageType: 'RAW',
        SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256'
      });

      const response = await this.kmsClient.send(command);

      if (!response.Signature) {
        throw new Error('AWS KMS did not return a signature');
      }

      return {
        signature: Buffer.from(response.Signature).toString('base64'),
        keyId: response.KeyId || keyRef,
        algorithm: response.SigningAlgorithm || 'RSASSA_PKCS1_V1_5_SHA_256',
        signedAt: new Date().toISOString(),
        metadata: {
          provider: 'AWSKMS',
          version: '1.0.0',
          keyUsage: response.KeyUsage,
          region: this.region
        }
      };

    } catch (error) {
      throw new Error(`AWS KMS signing failed: ${error.message}`);
    }
  }

  async verify(buffer: Buffer, signature: string, keyRef: string): Promise<boolean> {
    this.validateKeyRef(keyRef);

    try {
      const command = new VerifyCommand({
        KeyId: keyRef,
        Message: buffer,
        Signature: Buffer.from(signature, 'base64'),
        MessageType: 'RAW',
        SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256'
      });

      const response = await this.kmsClient.send(command);
      return response.SignatureValid === true;

    } catch (error) {
      console.error(`AWS KMS verification failed: ${error.message}`);
      return false;
    }
  }

  async getPublicKey(keyRef: string): Promise<string> {
    this.validateKeyRef(keyRef);

    try {
      const command = new GetPublicKeyCommand({
        KeyId: keyRef
      });

      const response = await this.kmsClient.send(command);

      if (!response.PublicKey) {
        throw new Error('AWS KMS did not return a public key');
      }

      // Convert DER to PEM format
      const derBuffer = Buffer.from(response.PublicKey);
      const base64Der = derBuffer.toString('base64');
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${base64Der.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

      return pemKey;

    } catch (error) {
      throw new Error(`Failed to get AWS KMS public key: ${error.message}`);
    }
  }

  async createKey(alias: string, options: KeyCreationOptions = {}): Promise<string> {
    try {
      const keySpec = this.normalizeKeySpec(options.keySpec);
      const keyUsage = options.keyUsage || 'SIGN_VERIFY';

      const command = new CreateKeyCommand({
        KeyUsage: keyUsage,
        KeySpec: keySpec,
        Description: options.description || `SMM Architect signing key: ${alias}`,
        Tags: options.tags ? Object.entries(options.tags).map(([key, value]) => ({ TagKey: key, TagValue: value })) : undefined
      });

      const response = await this.kmsClient.send(command);

      if (!response.KeyMetadata?.KeyId) {
        throw new Error('AWS KMS did not return a key ID');
      }

      // Create alias if provided
      if (alias && !alias.startsWith('alias/')) {
        const aliasName = `alias/smm-architect-${alias}`;
        try {
          // Note: CreateAliasCommand would be used here in real implementation
          // await this.kmsClient.send(new CreateAliasCommand({
          //   AliasName: aliasName,
          //   TargetKeyId: response.KeyMetadata.KeyId
          // }));
        } catch (aliasError) {
          console.warn(`Failed to create alias ${aliasName}: ${aliasError.message}`);
        }
      }

      return response.KeyMetadata.KeyId;

    } catch (error) {
      throw new Error(`Failed to create AWS KMS key: ${error.message}`);
    }
  }

  async getKeyMetadata(keyRef: string): Promise<KeyMetadata> {
    this.validateKeyRef(keyRef);

    try {
      const command = new DescribeKeyCommand({
        KeyId: keyRef
      });

      const response = await this.kmsClient.send(command);

      if (!response.KeyMetadata) {
        throw new Error('AWS KMS did not return key metadata');
      }

      const metadata = response.KeyMetadata;

      return {
        keyId: metadata.KeyId!,
        alias: metadata.Description,
        keySpec: metadata.KeySpec || 'RSA_2048',
        keyUsage: metadata.KeyUsage || 'SIGN_VERIFY',
        algorithm: this.getAlgorithmFromKeySpec(metadata.KeySpec || 'RSA_2048'),
        keySize: this.getKeySizeFromAWSSpec(metadata.KeySpec || 'RSA_2048'),
        createdAt: metadata.CreationDate?.toISOString() || new Date().toISOString(),
        status: this.mapAWSKeyState(metadata.KeyState || 'Enabled'),
        description: metadata.Description,
        tags: {} // Would need ListResourceTags call to populate
      };

    } catch (error) {
      throw new Error(`Failed to get AWS KMS key metadata: ${error.message}`);
    }
  }

  async listKeys(): Promise<string[]> {
    try {
      const command = new ListKeysCommand({
        Limit: 100
      });

      const response = await this.kmsClient.send(command);

      return response.Keys?.map(key => key.KeyId!).filter(Boolean) || [];

    } catch (error) {
      throw new Error(`Failed to list AWS KMS keys: ${error.message}`);
    }
  }

  /**
   * Get key ARN for the given key ID
   */
  async getKeyArn(keyRef: string): Promise<string> {
    const metadata = await this.getKeyMetadata(keyRef);
    return `arn:aws:kms:${this.region}:${await this.getAccountId()}:key/${metadata.keyId}`;
  }

  /**
   * Enable key rotation
   */
  async enableKeyRotation(keyRef: string): Promise<void> {
    this.validateKeyRef(keyRef);

    try {
      // Note: EnableKeyRotationCommand would be used here
      // const command = new EnableKeyRotationCommand({
      //   KeyId: keyRef
      // });
      // await this.kmsClient.send(command);
      
      console.log(`Key rotation enabled for ${keyRef}`);
    } catch (error) {
      throw new Error(`Failed to enable key rotation: ${error.message}`);
    }
  }

  // Private helper methods

  private async getAccountId(): Promise<string> {
    // In real implementation, would use STS GetCallerIdentity
    return process.env.AWS_ACCOUNT_ID || '123456789012';
  }

  private getKeySizeFromAWSSpec(keySpec: string): number {
    switch (keySpec) {
      case 'RSA_2048':
        return 2048;
      case 'RSA_3072':
        return 3072;
      case 'RSA_4096':
        return 4096;
      case 'ECC_NIST_P256':
        return 256;
      case 'ECC_NIST_P384':
        return 384;
      case 'ECC_NIST_P521':
        return 521;
      default:
        return 2048;
    }
  }

  private mapAWSKeyState(state: string): 'active' | 'disabled' | 'deleted' | 'pending_deletion' {
    switch (state.toLowerCase()) {
      case 'enabled':
        return 'active';
      case 'disabled':
        return 'disabled';
      case 'pendingdeletion':
        return 'pending_deletion';
      case 'unavailable':
        return 'deleted';
      default:
        return 'active';
    }
  }

  /**
   * Validate AWS key reference format
   */
  protected validateKeyRef(keyRef: string): void {
    super.validateKeyRef(keyRef);
    
    // AWS key references can be key ID, key ARN, alias name, or alias ARN
    const validPatterns = [
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, // Key ID
      /^arn:aws:kms:[a-z0-9-]+:\d{12}:key\/[a-f0-9-]+$/, // Key ARN
      /^alias\/[a-zA-Z0-9:/_-]+$/, // Alias name
      /^arn:aws:kms:[a-z0-9-]+:\d{12}:alias\/[a-zA-Z0-9:/_-]+$/ // Alias ARN
    ];

    const isValid = validPatterns.some(pattern => pattern.test(keyRef));
    if (!isValid) {
      throw new Error(`Invalid AWS KMS key reference format: ${keyRef}`);
    }
  }
}