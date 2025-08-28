/**
 * Idempotency Middleware
 * 
 * Prevents duplicate POST create operations by using idempotency keys.
 * Stores operation results in Redis for replay protection.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';
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

export interface IdempotentRequest extends Request {
  idempotencyKey?: string;
  isReplay?: boolean;
}

interface StoredResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

export class IdempotencyManager {
  private redis: Redis;
  private keyPrefix: string;
  private ttl: number; // Time to live in seconds

  constructor(redisUrl?: string, keyPrefix = 'idempotency:', ttl = 24 * 60 * 60) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.keyPrefix = keyPrefix;
    this.ttl = ttl;
  }

  /**
   * Generate idempotency key from request content
   */
  private generateKey(tenantId: string, userId: string, method: string, path: string, body: any): string {
    const content = JSON.stringify({
      tenantId,
      userId,
      method,
      path,
      body
    });
    
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `${this.keyPrefix}${tenantId}:${hash}`;
  }

  /**
   * Store response for future replay
   */
  private async storeResponse(key: string, response: StoredResponse): Promise<void> {
    try {
      await this.redis.setex(key, this.ttl, JSON.stringify(response));
      logger.debug('Stored idempotent response', { key, statusCode: response.statusCode });
    } catch (error) {
      logger.error('Failed to store idempotent response', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Retrieve stored response
   */
  private async getStoredResponse(key: string): Promise<StoredResponse | null> {
    try {
      const stored = await this.redis.get(key);
      if (!stored) return null;
      
      return JSON.parse(stored);
    } catch (error) {
      logger.error('Failed to retrieve stored response', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Check if operation is in progress (prevent concurrent duplicate requests)
   */
  private async setOperationInProgress(key: string): Promise<boolean> {
    const lockKey = `${key}:lock`;
    const lockTtl = 300; // 5 minutes max operation time
    
    try {
      const result = await this.redis.set(lockKey, '1', 'EX', lockTtl, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error('Failed to set operation lock', {
        key: lockKey,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Clear operation in progress
   */
  private async clearOperationInProgress(key: string): Promise<void> {
    const lockKey = `${key}:lock`;
    
    try {
      await this.redis.del(lockKey);
    } catch (error) {
      logger.error('Failed to clear operation lock', {
        key: lockKey,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Create idempotency middleware
   */
  createMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Only apply to POST methods by default (or specify methods)
      if (req.method !== 'POST') {
        next();
        return;
      }

      const user = (req as any).user;
      if (!user || !user.tenantId) {
        // No user context - skip idempotency (will be caught by auth middleware)
        next();
        return;
      }

      // Extract idempotency key from header or generate from request
      let idempotencyKey = req.headers['idempotency-key'] as string;
      
      if (!idempotencyKey) {
        // Auto-generate key from request content for transparent idempotency
        idempotencyKey = this.generateKey(
          user.tenantId,
          user.userId,
          req.method,
          req.path,
          req.body
        );
      } else {
        // Validate provided key format
        if (!/^[a-zA-Z0-9_-]{1,255}$/.test(idempotencyKey)) {
          res.status(400).json({
            error: 'Invalid idempotency key format',
            code: 'INVALID_IDEMPOTENCY_KEY'
          });
          return;
        }
        
        // Namespace user-provided keys
        idempotencyKey = `${this.keyPrefix}${user.tenantId}:user:${idempotencyKey}`;
      }

      (req as IdempotentRequest).idempotencyKey = idempotencyKey;

      try {
        // Check for existing response
        const storedResponse = await this.getStoredResponse(idempotencyKey);
        
        if (storedResponse) {
          // Replay stored response
          (req as IdempotentRequest).isReplay = true;
          
          logger.info('Replaying idempotent response', {
            idempotencyKey,
            tenantId: user.tenantId,
            userId: user.userId,
            originalTimestamp: storedResponse.timestamp
          });

          // Set headers
          Object.entries(storedResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          
          // Add replay indicator
          res.setHeader('X-Idempotency-Replay', 'true');
          
          res.status(storedResponse.statusCode).json(storedResponse.body);
          return;
        }

        // Check if operation is already in progress
        const lockAcquired = await this.setOperationInProgress(idempotencyKey);
        
        if (!lockAcquired) {
          res.status(409).json({
            error: 'Operation in progress',
            code: 'OPERATION_IN_PROGRESS',
            retryAfter: 5
          });
          return;
        }

        // Override res.json to capture response
        const originalJson = res.json.bind(res);
        const originalStatus = res.status.bind(res);
        let statusCode = 200;

        res.status = (code: number) => {
          statusCode = code;
          return originalStatus(code);
        };

        res.json = (data: any) => {
          // Store successful responses for replay
          if (statusCode >= 200 && statusCode < 300) {
            const responseToStore: StoredResponse = {
              statusCode,
              headers: {
                'content-type': 'application/json',
                ...Object.fromEntries(
                  Object.entries(res.getHeaders()).map(([k, v]) => [k, String(v)])
                )
              },
              body: data,
              timestamp: Date.now()
            };

            this.storeResponse(idempotencyKey, responseToStore)
              .finally(() => {
                this.clearOperationInProgress(idempotencyKey);
              });
          } else {
            // Clear lock for failed operations
            this.clearOperationInProgress(idempotencyKey);
          }

          return originalJson(data);
        };

        next();

      } catch (error) {
        logger.error('Idempotency middleware error', {
          error: error instanceof Error ? error.message : String(error),
          idempotencyKey,
          tenantId: user.tenantId
        });

        // Clear lock on error
        await this.clearOperationInProgress(idempotencyKey);

        res.status(500).json({
          error: 'Internal server error',
          code: 'IDEMPOTENCY_ERROR'
        });
      }
    };
  }

  /**
   * Manually clear idempotency key (for admin operations)
   */
  async clearKey(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Failed to clear idempotency key', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get statistics about idempotency usage
   */
  async getStats(): Promise<{
    totalKeys: number;
    keysByTenant: Record<string, number>;
  }> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      const totalKeys = keys.length;
      
      const keysByTenant: Record<string, number> = {};
      
      for (const key of keys) {
        const tenantMatch = key.match(new RegExp(`${this.keyPrefix}([^:]+):`));
        if (tenantMatch) {
          const tenantId = tenantMatch[1];
          keysByTenant[tenantId] = (keysByTenant[tenantId] || 0) + 1;
        }
      }

      return { totalKeys, keysByTenant };
    } catch (error) {
      logger.error('Failed to get idempotency stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { totalKeys: 0, keysByTenant: {} };
    }
  }
}

// Global instance
let idempotencyManager: IdempotencyManager;

/**
 * Get or create idempotency manager instance
 */
export function getIdempotencyManager(): IdempotencyManager {
  if (!idempotencyManager) {
    idempotencyManager = new IdempotencyManager();
  }
  return idempotencyManager;
}

/**
 * Middleware factory for easy use
 */
export function idempotencyMiddleware() {
  return getIdempotencyManager().createMiddleware();
}

export default {
  IdempotencyManager,
  getIdempotencyManager,
  idempotencyMiddleware
};