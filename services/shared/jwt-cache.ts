/**
 * JWT Token Cache Service
 * 
 * Provides Redis-based caching for JWT token validation to improve 
 * authentication performance and reduce cryptographic operations.
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface CachedTokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  cachedAt: number;
  expiresAt: number;
}

export interface TokenCacheConfig {
  redisUrl?: string;
  cacheTtlSeconds?: number;
  maxCacheSize?: number;
  enableCaching?: boolean;
}

class JWTTokenCache {
  private redis: Redis | null = null;
  private config: TokenCacheConfig;
  private isEnabled: boolean = false;

  constructor(config: TokenCacheConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      cacheTtlSeconds: config.cacheTtlSeconds || 300, // 5 minutes
      maxCacheSize: config.maxCacheSize || 10000,
      enableCaching: config.enableCaching ?? true,
      ...config
    };

    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    if (!this.config.enableCaching || !this.config.redisUrl) {
      logger.info('JWT token caching disabled');
      return;
    }

    try {
      this.redis = new Redis(this.config.redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error', { error: error.message });
        this.isEnabled = false;
      });

      this.redis.on('connect', () => {
        logger.info('JWT token cache connected to Redis');
        this.isEnabled = true;
      });

      this.redis.on('close', () => {
        logger.warn('JWT token cache Redis connection closed');
        this.isEnabled = false;
      });

      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to initialize JWT token cache', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      this.isEnabled = false;
    }
  }

  /**
   * Generate cache key for JWT token
   */
  private generateCacheKey(token: string): string {
    // Use SHA-256 hash of token for security (don't store raw token)
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return `jwt:${hash}`;
  }

  /**
   * Cache validated JWT token payload
   */
  async cacheToken(token: string, payload: CachedTokenPayload): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(token);
      const cacheData = {
        ...payload,
        cachedAt: Date.now()
      };

      // Use SETEX for atomic set with expiration
      await this.redis.setex(
        cacheKey, 
        this.config.cacheTtlSeconds!,
        JSON.stringify(cacheData)
      );

      logger.debug('JWT token cached', { 
        userId: payload.userId,
        tenantId: payload.tenantId,
        ttl: this.config.cacheTtlSeconds 
      });
    } catch (error) {
      logger.warn('Failed to cache JWT token', { 
        error: error instanceof Error ? error.message : String(error),
        userId: payload.userId 
      });
    }
  }

  /**
   * Retrieve cached JWT token payload
   */
  async getCachedToken(token: string): Promise<CachedTokenPayload | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(token);
      const cachedData = await this.redis.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      const payload = JSON.parse(cachedData) as CachedTokenPayload;

      // Additional expiration check
      if (payload.expiresAt && payload.expiresAt < Date.now()) {
        await this.invalidateToken(token);
        return null;
      }

      logger.debug('JWT token cache hit', { 
        userId: payload.userId,
        tenantId: payload.tenantId,
        cacheAge: Date.now() - payload.cachedAt
      });

      return payload;
    } catch (error) {
      logger.warn('Failed to retrieve cached JWT token', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Invalidate cached token
   */
  async invalidateToken(token: string): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(token);
      await this.redis.del(cacheKey);

      logger.debug('JWT token invalidated from cache');
    } catch (error) {
      logger.warn('Failed to invalidate JWT token', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Invalidate all tokens for a user (e.g., on password change)
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }

    try {
      // Scan for all JWT cache keys
      const pattern = 'jwt:*';
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100
      });

      const keysToDelete: string[] = [];

      for await (const keys of stream) {
        for (const key of keys) {
          try {
            const cachedData = await this.redis.get(key);
            if (cachedData) {
              const payload = JSON.parse(cachedData) as CachedTokenPayload;
              if (payload.userId === userId) {
                keysToDelete.push(key);
              }
            }
          } catch (parseError) {
            // Invalid cached data, delete it
            keysToDelete.push(key);
          }
        }
      }

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        logger.info('Invalidated user tokens from cache', { 
          userId, 
          tokenCount: keysToDelete.length 
        });
      }
    } catch (error) {
      logger.error('Failed to invalidate user tokens', { 
        userId,
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ 
    isEnabled: boolean; 
    connectionStatus: string;
    keyCount?: number;
    memoryUsage?: string;
  }> {
    const stats = {
      isEnabled: this.isEnabled,
      connectionStatus: this.redis?.status || 'disconnected'
    };

    if (this.isEnabled && this.redis) {
      try {
        const info = await this.redis.info('memory');
        const keyCount = await this.redis.dbsize();
        
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

        return {
          ...stats,
          keyCount,
          memoryUsage
        };
      } catch (error) {
        logger.warn('Failed to get cache stats', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return stats;
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    if (!this.isEnabled || !this.redis) {
      return { 
        healthy: false, 
        error: 'Cache service not enabled or Redis not connected' 
      };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('JWT token cache Redis connection closed');
      } catch (error) {
        logger.error('Error closing JWT token cache Redis connection', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  }
}

// Export singleton instance
export const jwtTokenCache = new JWTTokenCache();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await jwtTokenCache.shutdown();
});

process.on('SIGTERM', async () => {
  await jwtTokenCache.shutdown();
});

export { JWTTokenCache };