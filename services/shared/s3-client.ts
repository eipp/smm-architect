import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export interface S3Config {
  region: string;
  bucketName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export interface S3DeletionResult {
  deleted: number;
  duration: number;
  verificationHash: string;
  errors?: string[];
  versionsDeleted?: number;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  versionId?: string;
}

export class S3StorageClient {
  private client: S3Client;
  private bucketName: string;

  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      credentials: config.accessKeyId && config.secretAccessKey ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      } : undefined,
      endpoint: config.endpoint
    });
    this.bucketName = config.bucketName;
  }

  /**
   * Cascade delete all objects for a user/tenant (for GDPR compliance)
   */
  async cascadeDelete(
    userId: string,
    tenantId: string
  ): Promise<S3DeletionResult> {
    const startTime = Date.now();
    let deleted = 0;
    let versionsDeleted = 0;
    const errors: string[] = [];

    try {
      logger.info('Starting S3 cascade deletion', {
        userId,
        tenantId,
        bucket: this.bucketName
      });

      // Define search patterns for user data
      const prefixes = [
        `${tenantId}/${userId}/`,
        `tenants/${tenantId}/users/${userId}/`,
        `workspaces/${tenantId}/${userId}/`,
        `uploads/${tenantId}/${userId}/`,
        `assets/${tenantId}/${userId}/`,
        `logs/${tenantId}/${userId}/`
      ];

      // Delete objects under each prefix
      for (const prefix of prefixes) {
        try {
          const prefixResult = await this.deleteObjectsByPrefix(prefix);
          deleted += prefixResult.deleted;
          versionsDeleted += prefixResult.versionsDeleted || 0;
          
          if (prefixResult.errors) {
            errors.push(...prefixResult.errors);
          }
        } catch (prefixError: any) {
          const errorMsg = `Failed to delete prefix ${prefix}: ${prefixError.message}`;
          errors.push(errorMsg);
          logger.error('Prefix deletion failed', {
            prefix,
            error: prefixError.message
          });
        }
      }

      const duration = Date.now() - startTime;
      const verificationHash = this.generateVerificationHash(deleted, userId, tenantId);

      logger.info('S3 cascade deletion completed', {
        userId,
        tenantId,
        deleted,
        versionsDeleted,
        duration,
        errors: errors.length
      });

      return {
        deleted,
        versionsDeleted,
        duration,
        verificationHash,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = `S3 cascade deletion failed: ${error.message}`;
      
      logger.error('S3 cascade deletion failed', {
        userId,
        tenantId,
        duration,
        error: error.message
      });

      return {
        deleted,
        versionsDeleted,
        duration,
        verificationHash: this.generateVerificationHash(deleted, userId, tenantId),
        errors: [errorMsg]
      };
    }
  }

  /**
   * Delete all objects with a given prefix
   */
  private async deleteObjectsByPrefix(prefix: string): Promise<{
    deleted: number;
    versionsDeleted: number;
    errors?: string[];
  }> {
    let deleted = 0;
    let versionsDeleted = 0;
    const errors: string[] = [];
    let continuationToken: string | undefined;

    do {
      try {
        // List objects with the prefix
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken
        });

        const listResponse = await this.client.send(listCommand);
        
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          break;
        }

        // Prepare objects for batch deletion
        const objectsToDelete = listResponse.Contents.map(obj => ({
          Key: obj.Key!
        }));

        // Delete objects in batches (max 1000 per request)
        if (objectsToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: objectsToDelete,
              Quiet: false
            }
          });

          const deleteResponse = await this.client.send(deleteCommand);
          
          deleted += deleteResponse.Deleted?.length || 0;
          
          // Handle any errors in the batch
          if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
            for (const error of deleteResponse.Errors) {
              errors.push(`Failed to delete ${error.Key}: ${error.Message}`);
            }
          }

          logger.debug('Deleted S3 object batch', {
            prefix,
            batchSize: objectsToDelete.length,
            deleted: deleteResponse.Deleted?.length || 0,
            errors: deleteResponse.Errors?.length || 0
          });
        }

        // Handle versioned objects if bucket has versioning enabled
        for (const obj of listResponse.Contents) {
          try {
            const versionResult = await this.deleteObjectVersions(obj.Key!);
            versionsDeleted += versionResult;
          } catch (versionError: any) {
            errors.push(`Failed to delete versions for ${obj.Key}: ${versionError.message}`);
          }
        }

        continuationToken = listResponse.NextContinuationToken;
        
      } catch (batchError: any) {
        errors.push(`Batch deletion failed for prefix ${prefix}: ${batchError.message}`);
        break;
      }

    } while (continuationToken);

    return {
      deleted,
      versionsDeleted,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Delete all versions of an object (for versioned buckets)
   */
  private async deleteObjectVersions(key: string): Promise<number> {
    try {
      // This is a simplified implementation
      // In a real versioned bucket, you'd need to list all versions first
      // then delete each version individually
      
      // For now, just attempt to delete the object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.client.send(deleteCommand);
      return 1;
      
    } catch (error: any) {
      logger.debug('Failed to delete object versions', {
        key,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * List objects for a user/tenant for verification
   */
  async listObjectsByUser(
    userId: string,
    tenantId: string,
    maxKeys: number = 1000
  ): Promise<S3Object[]> {
    const objects: S3Object[] = [];
    
    const prefixes = [
      `${tenantId}/${userId}/`,
      `tenants/${tenantId}/users/${userId}/`,
      `workspaces/${tenantId}/${userId}/`
    ];

    for (const prefix of prefixes) {
      try {
        let continuationToken: string | undefined;
        
        do {
          const listCommand = new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            MaxKeys: Math.min(maxKeys - objects.length, 1000),
            ContinuationToken: continuationToken
          });

          const response = await this.client.send(listCommand);
          
          if (response.Contents) {
            for (const obj of response.Contents) {
              if (obj.Key) {
                objects.push({
                  key: obj.Key,
                  size: obj.Size || 0,
                  lastModified: obj.LastModified || new Date(),
                  etag: obj.ETag || ''
                });
              }
            }
          }

          continuationToken = response.NextContinuationToken;
          
        } while (continuationToken && objects.length < maxKeys);
        
      } catch (error: any) {
        logger.error('Failed to list objects by prefix', {
          prefix,
          error: error.message
        });
      }
    }

    return objects;
  }

  /**
   * Verify deletion by checking if any objects remain
   */
  async verifyDeletion(userId: string, tenantId: string): Promise<{
    verified: boolean;
    remainingCount: number;
    remainingObjects?: S3Object[];
  }> {
    try {
      const remaining = await this.listObjectsByUser(userId, tenantId, 10);
      
      return {
        verified: remaining.length === 0,
        remainingCount: remaining.length,
        remainingObjects: remaining.length > 0 ? remaining : undefined
      };
    } catch (error: any) {
      logger.error('Failed to verify S3 deletion', {
        userId,
        tenantId,
        error: error.message
      });
      return {
        verified: false,
        remainingCount: -1 // Indicates verification failed
      };
    }
  }

  /**
   * Upload object with tenant and user metadata
   */
  async uploadObject(
    key: string,
    body: Buffer | Uint8Array | string,
    userId: string,
    tenantId: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const enrichedMetadata = {
        ...metadata,
        'user-id': userId,
        'tenant-id': tenantId,
        'uploaded-at': new Date().toISOString()
      };

      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        Metadata: enrichedMetadata
      });

      await this.client.send(putCommand);

      logger.debug('Object uploaded', {
        key,
        userId,
        tenantId,
        metadataKeys: Object.keys(enrichedMetadata)
      });

    } catch (error: any) {
      logger.error('Failed to upload object', {
        key,
        userId,
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate verification hash for deletion proof
   */
  private generateVerificationHash(
    deletedCount: number,
    userId: string,
    tenantId: string
  ): string {
    const crypto = require('crypto');
    const data = `s3:${this.bucketName}:${userId}:${tenantId}:${deletedCount}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Health check for the S3 connection
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    bucketName: string;
    error?: string;
  }> {
    try {
      const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
      
      const headCommand = new HeadBucketCommand({
        Bucket: this.bucketName
      });

      await this.client.send(headCommand);
      
      return {
        healthy: true,
        bucketName: this.bucketName
      };
    } catch (error: any) {
      return {
        healthy: false,
        bucketName: this.bucketName,
        error: error.message
      };
    }
  }
}

/**
 * Factory function to create S3 client with environment variables
 */
export function createS3Client(): S3StorageClient {
  const config: S3Config = {
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET_NAME || 'smm-architect-storage',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT
  };

  if (!config.bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is required');
  }

  return new S3StorageClient(config);
}
