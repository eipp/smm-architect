import { Pinecone } from '@pinecone-database/pinecone';
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

export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
}

export interface VectorDeletionResult {
  deleted: number;
  duration: number;
  verificationHash: string;
  errors?: string[];
}

export interface VectorQueryResult {
  vectors: Array<{
    id: string;
    metadata?: Record<string, any>;
    score?: number;
  }>;
  totalCount: number;
}

export class PineconeClient {
  private client: Pinecone;
  private indexName: string;
  private index: any;

  constructor(config: PineconeConfig) {
    this.client = new Pinecone({
      apiKey: config.apiKey,
      environment: config.environment
    });
    this.indexName = config.indexName;
  }

  /**
   * Initialize the Pinecone client and index connection
   */
  async initialize(): Promise<void> {
    try {
      this.index = this.client.index(this.indexName);
      logger.info('Pinecone client initialized', {
        indexName: this.indexName
      });
    } catch (error: any) {
      logger.error('Failed to initialize Pinecone client', {
        error: error.message,
        indexName: this.indexName
      });
      throw error;
    }
  }

  /**
   * Delete vectors by metadata filter (for GDPR compliance)
   * This is the main method for DSR cascade deletion
   */
  async cascadeDelete(
    userId: string,
    tenantId: string
  ): Promise<VectorDeletionResult> {
    const startTime = Date.now();
    let deleted = 0;
    const errors: string[] = [];

    try {
      if (!this.index) {
        throw new Error('Pinecone client not initialized');
      }

      logger.info('Starting vector cascade deletion', {
        userId,
        tenantId,
        indexName: this.indexName
      });

      // Query vectors to identify what will be deleted
      const vectorsToDelete = await this.queryVectorsByUser(userId, tenantId);
      
      if (vectorsToDelete.totalCount === 0) {
        logger.info('No vectors found for deletion', { userId, tenantId });
        return {
          deleted: 0,
          duration: Date.now() - startTime,
          verificationHash: this.generateVerificationHash(0, userId, tenantId)
        };
      }

      // Delete vectors in batches to avoid API limits
      const batchSize = 1000;
      const vectorIds = vectorsToDelete.vectors.map(v => v.id);
      
      for (let i = 0; i < vectorIds.length; i += batchSize) {
        const batch = vectorIds.slice(i, i + batchSize);
        
        try {
          await this.index.deleteMany(batch);
          deleted += batch.length;
          
          logger.debug('Deleted vector batch', {
            batchSize: batch.length,
            totalDeleted: deleted,
            remaining: vectorIds.length - deleted
          });
        } catch (batchError: any) {
          const errorMsg = `Failed to delete batch ${i}-${i + batch.length}: ${batchError.message}`;
          errors.push(errorMsg);
          logger.error('Vector batch deletion failed', {
            batchStart: i,
            batchSize: batch.length,
            error: batchError.message
          });
        }
      }

      // Alternative approach: Delete by metadata filter if supported
      // This is more efficient but not all Pinecone plans support it
      try {
        await this.index.deleteMany({
          filter: {
            tenant_id: { $eq: tenantId },
            user_id: { $eq: userId }
          }
        });
        logger.info('Deleted vectors by metadata filter', {
          userId,
          tenantId
        });
      } catch (filterError: any) {
        // Fallback to individual deletion if filter deletion fails
        logger.warn('Metadata filter deletion not supported, using individual deletion', {
          error: filterError.message
        });
      }

      const duration = Date.now() - startTime;
      const verificationHash = this.generateVerificationHash(deleted, userId, tenantId);

      logger.info('Vector cascade deletion completed', {
        userId,
        tenantId,
        deleted,
        duration,
        errors: errors.length
      });

      return {
        deleted,
        duration,
        verificationHash,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = `Vector cascade deletion failed: ${error.message}`;
      
      logger.error('Vector cascade deletion failed', {
        userId,
        tenantId,
        duration,
        error: error.message
      });

      return {
        deleted,
        duration,
        verificationHash: this.generateVerificationHash(deleted, userId, tenantId),
        errors: [errorMsg]
      };
    }
  }

  /**
   * Query vectors by user and tenant for verification
   */
  async queryVectorsByUser(
    userId: string,
    tenantId: string,
    limit: number = 10000
  ): Promise<VectorQueryResult> {
    try {
      if (!this.index) {
        throw new Error('Pinecone client not initialized');
      }

      // Query by metadata filter
      const queryResponse = await this.index.query({
        filter: {
          tenant_id: { $eq: tenantId },
          user_id: { $eq: userId }
        },
        topK: limit,
        includeMetadata: true
      });

      const vectors = queryResponse.matches || [];
      
      return {
        vectors: vectors.map((match: any) => ({
          id: match.id,
          metadata: match.metadata,
          score: match.score
        })),
        totalCount: vectors.length
      };

    } catch (error: any) {
      logger.error('Failed to query vectors by user', {
        userId,
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify deletion by checking if any vectors remain
   */
  async verifyDeletion(userId: string, tenantId: string): Promise<{
    verified: boolean;
    remainingCount: number;
  }> {
    try {
      const remaining = await this.queryVectorsByUser(userId, tenantId, 1);
      
      return {
        verified: remaining.totalCount === 0,
        remainingCount: remaining.totalCount
      };
    } catch (error: any) {
      logger.error('Failed to verify vector deletion', {
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
   * Store vector with tenant and user metadata
   */
  async storeVector(
    id: string,
    vector: number[],
    metadata: Record<string, any>,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      if (!this.index) {
        throw new Error('Pinecone client not initialized');
      }

      const enrichedMetadata = {
        ...metadata,
        user_id: userId,
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      };

      await this.index.upsert([{
        id,
        values: vector,
        metadata: enrichedMetadata
      }]);

      logger.debug('Vector stored', {
        id,
        userId,
        tenantId,
        metadataKeys: Object.keys(enrichedMetadata)
      });

    } catch (error: any) {
      logger.error('Failed to store vector', {
        id,
        userId,
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      if (!this.index) {
        throw new Error('Pinecone client not initialized');
      }

      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error: any) {
      logger.error('Failed to get index stats', {
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
    const data = `pinecone:${this.indexName}:${userId}:${tenantId}:${deletedCount}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Health check for the Pinecone connection
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    indexName: string;
    error?: string;
  }> {
    try {
      if (!this.index) {
        return {
          healthy: false,
          indexName: this.indexName,
          error: 'Client not initialized'
        };
      }

      await this.getIndexStats();
      
      return {
        healthy: true,
        indexName: this.indexName
      };
    } catch (error: any) {
      return {
        healthy: false,
        indexName: this.indexName,
        error: error.message
      };
    }
  }
}

/**
 * Factory function to create Pinecone client with environment variables
 */
export function createPineconeClient(): PineconeClient {
  const config: PineconeConfig = {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
    indexName: process.env.PINECONE_INDEX || 'smm-architect-vectors'
  };

  if (!config.apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  return new PineconeClient(config);
}
