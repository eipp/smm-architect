/**
 * Tiered Rate Limiting Middleware
 * 
 * Provides different rate limiting tiers based on endpoint sensitivity
 * and user authentication status.
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getSecurityMetrics } from './security-metrics';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface TierConfig {
  auth: RateLimitConfig;
  api: RateLimitConfig;
  public: RateLimitConfig;
  admin: RateLimitConfig;
}

const defaultTierConfig: TierConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Very strict for auth endpoints
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    skipFailedRequests: false
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 100, // Moderate for authenticated API endpoints
    message: 'Too many API requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  },
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Stricter for public endpoints
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  },
  admin: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Very strict for admin endpoints
    message: 'Too many admin requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }
};

class TieredRateLimiter {
  private redis: Redis | null = null;
  private config: TierConfig;
  private limiters: Map<string, any> = new Map();

  constructor(config: Partial<TierConfig> = {}) {
    this.config = { ...defaultTierConfig, ...config };
    this.initializeRedis();
    this.createLimiters();
  }

  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      this.redis.on('error', (error) => {
        logger.error('Rate limiter Redis connection error', { 
          error: error.message 
        });
      });

      this.redis.on('connect', () => {
        logger.info('Rate limiter connected to Redis');
      });
    } catch (error) {
      logger.error('Failed to initialize rate limiter Redis', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // Fall back to memory store
    }
  }

  private createLimiters(): void {
    Object.entries(this.config).forEach(([tier, config]) => {
      const store = this.redis ? new RedisStore({
        sendCommand: (...args: string[]) => this.redis!.call(...args),
        prefix: `rate_limit:${tier}:`
      }) : undefined;

      const limiter = rateLimit({
        ...config,
        store,
        keyGenerator: (req: Request) => this.getKeyForTier(req, tier),
        handler: (req: Request, res: Response) => {
          const securityMetrics = getSecurityMetrics();
          const user = (req as any).user;
          
          // Record rate limit violation metric
          securityMetrics.recordRateLimitViolation(
            req.path,
            req.ip || 'unknown',
            config.max,
            config.max + 1, // Current is over the limit
            user?.tenantId,
            user?.userId,
            'tiered-rate-limiter'
          ).catch(err => {
            logger.warn('Failed to record rate limit violation metric:', err);
          });
          
          logger.warn('Rate limit exceeded', {
            tier,
            ip: req.ip,
            path: req.path,
            userAgent: req.headers['user-agent'],
            userId: user?.userId
          });

          res.status(429).json({
            error: config.message,
            code: 'RATE_LIMIT_EXCEEDED',
            tier,
            retryAfter: Math.ceil(config.windowMs / 1000)
          });
        },
        onLimitReached: (req: Request) => {
          logger.warn('Rate limit threshold reached', {
            tier,
            ip: req.ip,
            path: req.path,
            userId: (req as any).user?.userId
          });
        }
      });

      this.limiters.set(tier, limiter);
    });
  }

  private getKeyForTier(req: Request, tier: string): string {
    const baseKey = req.ip;
    const user = (req as any).user;

    switch (tier) {
      case 'auth':
        // For auth endpoints, also key by email if available in body
        const identifier = req.body?.email || req.body?.username || baseKey;
        return `${baseKey}:${identifier}`;
      
      case 'api':
      case 'admin':
        // For authenticated endpoints, key by user ID if available
        return user?.userId ? `${baseKey}:${user.userId}` : baseKey;
      
      default:
        return baseKey;
    }
  }

  /**
   * Get rate limiter for authentication endpoints
   */
  auth() {
    return this.limiters.get('auth');
  }

  /**
   * Get rate limiter for general API endpoints
   */
  api() {
    return this.limiters.get('api');
  }

  /**
   * Get rate limiter for public endpoints
   */
  public() {
    return this.limiters.get('public');
  }

  /**
   * Get rate limiter for admin endpoints
   */
  admin() {
    return this.limiters.get('admin');
  }

  /**
   * Custom rate limiter for specific use cases
   */
  custom(config: Partial<RateLimitConfig> & { tier: string }) {
    const { tier, ...rateLimitConfig } = config;
    
    if (this.limiters.has(tier)) {
      return this.limiters.get(tier);
    }

    const fullConfig = { ...defaultTierConfig.api, ...rateLimitConfig };
    
    const store = this.redis ? new RedisStore({
      sendCommand: (...args: string[]) => this.redis!.call(...args),
      prefix: `rate_limit:${tier}:`
    }) : undefined;

    const limiter = rateLimit({
      ...fullConfig,
      store,
      keyGenerator: (req: Request) => this.getKeyForTier(req, tier),
      handler: (req: Request, res: Response) => {
        logger.warn('Custom rate limit exceeded', {
          tier,
          ip: req.ip,
          path: req.path,
          userAgent: req.headers['user-agent'],
          userId: (req as any).user?.userId
        });

        res.status(429).json({
          error: fullConfig.message,
          code: 'RATE_LIMIT_EXCEEDED',
          tier,
          retryAfter: Math.ceil(fullConfig.windowMs / 1000)
        });
      }
    });

    this.limiters.set(tier, limiter);
    return limiter;
  }

  /**
   * Adaptive rate limiter that adjusts based on user behavior
   */
  adaptive() {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      const isAuthenticated = !!user;
      const userRoles = user?.roles || [];
      
      // Determine appropriate tier based on context
      let tier = 'public';
      
      if (req.path.includes('/admin') || userRoles.includes('admin')) {
        tier = 'admin';
      } else if (req.path.includes('/auth') || req.path.includes('/login')) {
        tier = 'auth';
      } else if (isAuthenticated) {
        tier = 'api';
      }

      const limiter = this.limiters.get(tier);
      if (limiter) {
        return limiter(req, res, next);
      }
      
      next();
    };
  }

  /**
   * IP-based suspicious activity detection
   */
  suspiciousActivityDetector() {
    const suspiciousStore = this.redis ? new RedisStore({
      sendCommand: (...args: string[]) => this.redis!.call(...args),
      prefix: 'suspicious_activity:'
    }) : undefined;

    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 500, // High threshold for suspicious activity
      store: suspiciousStore,
      keyGenerator: (req: Request) => req.ip,
      skip: (req: Request) => {
        // Skip successful requests
        return !req.path.includes('/auth') && res.statusCode < 400;
      },
      handler: (req: Request, res: Response) => {
        logger.error('Suspicious activity detected', {
          ip: req.ip,
          path: req.path,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        });

        res.status(429).json({
          error: 'Suspicious activity detected. Access temporarily restricted.',
          code: 'SUSPICIOUS_ACTIVITY',
          contact: 'Please contact support if you believe this is an error'
        });
      }
    });
  }

  /**
   * Health check for rate limiter
   */
  async healthCheck(): Promise<{ healthy: boolean; store: string; error?: string }> {
    try {
      if (this.redis) {
        await this.redis.ping();
        return { healthy: true, store: 'redis' };
      } else {
        return { healthy: true, store: 'memory' };
      }
    } catch (error) {
      return { 
        healthy: false, 
        store: this.redis ? 'redis' : 'memory',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{ [tier: string]: any }> {
    const stats: { [tier: string]: any } = {};

    if (this.redis) {
      try {
        const keys = await this.redis.keys('rate_limit:*');
        const tierCounts: { [tier: string]: number } = {};

        keys.forEach(key => {
          const tier = key.split(':')[1];
          tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });

        for (const [tier, count] of Object.entries(tierCounts)) {
          stats[tier] = { activeKeys: count };
        }
      } catch (error) {
        logger.error('Failed to get rate limit stats', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return stats;
  }
}

// Export singleton instance
export const tieredRateLimiter = new TieredRateLimiter();

// Convenience exports for common use cases
export const authRateLimit = tieredRateLimiter.auth();
export const apiRateLimit = tieredRateLimiter.api();
export const publicRateLimit = tieredRateLimiter.public();
export const adminRateLimit = tieredRateLimiter.admin();
export const adaptiveRateLimit = tieredRateLimiter.adaptive();
export const suspiciousActivityLimit = tieredRateLimiter.suspiciousActivityDetector();

export { TieredRateLimiter };