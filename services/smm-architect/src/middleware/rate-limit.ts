/**
 * Rate Limiting Middleware for SMM Architect
 *
 * Provides rate limiting functionality backed by Redis to prevent abuse
 * and brute force attacks on authentication endpoints and other sensitive
 * operations.
 */

import Redis from 'ioredis';

// Mock log implementation
const log = {
  info: (message: string, data?: any) => console.log('[INFO]', message, data),
  error: (message: string, data?: any) => console.error('[ERROR]', message, data),
  debug: (message: string, data?: any) => console.log('[DEBUG]', message, data),
  warn: (message: string, data?: any) => console.warn('[WARN]', message, data)
};

export interface RateLimitStoreConfig {
  redisUrl?: string;
  prefix?: string;
}

let redisClient: Redis;
let storeConfig: Required<RateLimitStoreConfig>;

/**
 * Configure the rate limit store connection
 */
export function configureRateLimitStore(config: RateLimitStoreConfig = {}): void {
  storeConfig = {
    redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: config.prefix || process.env.RATE_LIMIT_PREFIX || 'rate-limit'
  };

  if (redisClient) {
    redisClient.disconnect();
  }

  redisClient = new Redis(storeConfig.redisUrl, {
    maxRetriesPerRequest: 3
  });
}

// Initialize with default configuration
configureRateLimitStore();

/**
 * Rate limiting function
 * @param category - Category of operation (e.g., 'auth:login', 'auth:register')
 * @param identifier - Unique identifier (e.g., email, IP address)
 * @param maxAttempts - Maximum attempts allowed
 * @param windowSeconds - Time window in seconds
 */
export async function rateLimit(
  category: string,
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<void> {
  const key = `${storeConfig.prefix}:${category}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    const entry = await redisClient.hgetall(key);

    if (Object.keys(entry).length === 0) {
      await redisClient
        .multi()
        .hset(key, 'count', 1, 'firstAttempt', now.toString())
        .pexpire(key, windowMs)
        .exec();

      log.debug('Rate limit - new window', {
        category,
        identifier: maskIdentifier(identifier),
        count: 1,
        maxAttempts
      });

      return;
    }

    const count = await redisClient.hincrby(key, 'count', 1);

    if (count > maxAttempts) {
      const ttl = await redisClient.pttl(key);
      const timeUntilReset = Math.ceil(ttl / 1000);

      log.warn('Rate limit exceeded', {
        category,
        identifier: maskIdentifier(identifier),
        attempts: count,
        maxAttempts,
        resetInSeconds: timeUntilReset
      });

      throw new Error(
        `Rate limit exceeded. Too many attempts. Try again in ${timeUntilReset} seconds.`
      );
    }

    log.debug('Rate limit check', {
      category,
      identifier: maskIdentifier(identifier),
      count,
      maxAttempts,
      remaining: maxAttempts - count
    });
  } catch (error) {
    log.error('Rate limit error', {
      category,
      identifier: maskIdentifier(identifier),
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Check current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  category: string,
  identifier: string
): Promise<{
  count: number;
  remaining: number;
  resetTime: number;
  blocked: boolean;
}> {
  const key = `${storeConfig.prefix}:${category}:${identifier}`;
  const now = Date.now();

  try {
    const entry = await redisClient.hgetall(key);
    if (!entry.count) {
      return {
        count: 0,
        remaining: Infinity,
        resetTime: now,
        blocked: false
      };
    }

    const count = parseInt(entry.count, 10);
    const ttl = await redisClient.pttl(key);

    return {
      count,
      remaining: Math.max(0, 5 - count), // Default max of 5
      resetTime: now + ttl,
      blocked: count >= 5
    };
  } catch (error) {
    log.error('Rate limit status error', {
      category,
      identifier: maskIdentifier(identifier),
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      count: 0,
      remaining: Infinity,
      resetTime: now,
      blocked: false
    };
  }
}

/**
 * Clear rate limit for a specific identifier
 * (useful for successful operations or admin overrides)
 */
export async function clearRateLimit(
  category: string,
  identifier: string
): Promise<void> {
  const key = `${storeConfig.prefix}:${category}:${identifier}`;

  try {
    await redisClient.del(key);
    log.info('Rate limit cleared', {
      category,
      identifier: maskIdentifier(identifier)
    });
  } catch (error) {
    log.error('Failed to clear rate limit', {
      category,
      identifier: maskIdentifier(identifier),
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Cleanup expired entries
 * Redis manages expiration automatically, so this is a no-op.
 */
export async function cleanupExpiredEntries(): Promise<void> {
  return Promise.resolve();
}

/**
 * Get rate limit statistics
 */
export async function getRateLimitStats(): Promise<{
  totalEntries: number;
  categories: Record<string, number>;
  oldestEntry: number | null;
}> {
  const stats = {
    totalEntries: 0,
    categories: {} as Record<string, number>,
    oldestEntry: null as number | null
  };

  let cursor = '0';
  let oldestTime = Infinity;

  try {
    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        'MATCH',
        `${storeConfig.prefix}:*`,
        'COUNT',
        '100'
      );

      cursor = nextCursor;

      if (keys.length) {
        stats.totalEntries += keys.length;

        const pipeline = redisClient.pipeline();
        keys.forEach(key => pipeline.hget(key, 'firstAttempt'));
        const results = await pipeline.exec();

        keys.forEach((key, index) => {
          const category = key.split(':')[1];
          if (category) {
            stats.categories[category] = (stats.categories[category] || 0) + 1;
          }

          const firstAttemptStr = results[index][1] as string | null;
          const firstAttempt = firstAttemptStr ? parseInt(firstAttemptStr, 10) : NaN;
          if (!isNaN(firstAttempt) && firstAttempt < oldestTime) {
            oldestTime = firstAttempt;
          }
        });
      }
    } while (cursor !== '0');

    if (oldestTime !== Infinity) {
      stats.oldestEntry = oldestTime;
    }
  } catch (error) {
    log.error('Failed to get rate limit stats', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return stats;
}

/**
 * Mask sensitive identifiers for logging
 */
function maskIdentifier(identifier: string): string {
  if (identifier.includes('@')) {
    // Email masking
    const [username, domain] = identifier.split('@');
    if (username && domain) {
      const maskedUsername = username.length > 2
        ? username.substring(0, 2) + '*'.repeat(username.length - 2)
        : username;
      return `${maskedUsername}@${domain}`;
    }
  }

  if (identifier.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    // IP address masking
    const parts = identifier.split('.');
    return `${parts[0]}.${parts[1]}.***.**`;
    }

  // Generic masking
  return identifier.length > 4
    ? identifier.substring(0, 4) + '*'.repeat(identifier.length - 4)
    : identifier;
}

export default {
  configureRateLimitStore,
  rateLimit,
  getRateLimitStatus,
  clearRateLimit,
  cleanupExpiredEntries,
  getRateLimitStats
};
