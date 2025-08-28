/**
 * Advanced Security Middleware
 * 
 * Covers final security requirements:
 * - Task 26: Enhanced rate limiting per API key/tenant/user
 * - Task 27: Brute-force protection and lockout alerts
 * - Task 28: CSP hardening without unsafe-inline/unsafe-eval
 * - Task 29: CSP nonce/hash for necessary inline scripts
 * - Task 30: CSP verification with Sentry/analytics endpoints
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import crypto from 'crypto';
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

// =============================================================================
// Task 26: Enhanced Rate Limiting per API Key/Tenant/User
// =============================================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // API endpoints by user role
  admin: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5000
  },
  
  premium: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 2000
  },
  
  standard: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000
  },
  
  // API key based limits
  apiKey: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10000 // Higher limits for API keys
  },
  
  // Expensive operations
  expensive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100
  }
};

export function createEnhancedRateLimit(configKey: string = 'standard') {
  const config = RATE_LIMIT_CONFIGS[configKey];
  const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args)
    }),
    windowMs: config.windowMs,
    max: config.maxRequests,
    
    // Multi-tier key generation
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const apiKey = req.headers['x-api-key'] as string;
      
      // API key rate limiting (highest priority)
      if (apiKey) {
        return `api_key:${crypto.createHash('sha256').update(apiKey).digest('hex')}`;
      }
      
      // User-based rate limiting
      if (user) {
        const userTier = user.roles?.includes('admin') ? 'admin' : 
                        user.roles?.includes('premium') ? 'premium' : 'standard';
        return `user:${user.tenantId}:${user.userId}:${userTier}`;
      }
      
      // IP-based fallback
      return `ip:${req.ip}`;
    },
    
    // Dynamic max based on context
    max: (req: Request) => {
      const user = (req as any).user;
      const apiKey = req.headers['x-api-key'] as string;
      
      if (apiKey) {
        return RATE_LIMIT_CONFIGS.apiKey.maxRequests;
      }
      
      if (user?.roles?.includes('admin')) {
        return RATE_LIMIT_CONFIGS.admin.maxRequests;
      }
      
      if (user?.roles?.includes('premium')) {
        return RATE_LIMIT_CONFIGS.premium.maxRequests;
      }
      
      return config.maxRequests;
    },
    
    handler: (req: Request, res: Response) => {
      const user = (req as any).user;
      
      logger.warn('Enhanced rate limit exceeded', {
        type: 'rate_limit',
        tenantId: user?.tenantId,
        userId: user?.userId,
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.windowMs / 1000),
        limits: {
          window: `${config.windowMs / 1000} seconds`,
          max: config.maxRequests
        }
      });
    },
    
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/metrics';
    },
    
    skipSuccessfulRequests: config.skipSuccessfulRequests,
    skipFailedRequests: config.skipFailedRequests,
    standardHeaders: true,
    legacyHeaders: false
  });
}

// =============================================================================
// Task 27: Brute Force Protection and Lockout Alerts
// =============================================================================

interface BruteForceAttempt {
  ip: string;
  userId?: string;
  timestamp: number;
  endpoint: string;
  success: boolean;
}

interface LockoutStatus {
  isLocked: boolean;
  lockUntil?: number;
  attemptCount: number;
  lastAttempt: number;
}

class BruteForceProtection {
  private redis: Redis;
  private maxAttempts: number;
  private lockoutDuration: number; // in milliseconds
  private windowMs: number;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.maxAttempts = parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '5');
    this.lockoutDuration = parseInt(process.env.BRUTE_FORCE_LOCKOUT_MS || '900000'); // 15 minutes
    this.windowMs = parseInt(process.env.BRUTE_FORCE_WINDOW_MS || '300000'); // 5 minutes
  }
  
  private getKey(identifier: string, type: 'ip' | 'user'): string {
    return `brute_force:${type}:${identifier}`;\n  }\n  \n  async recordAttempt(req: Request, success: boolean): Promise<void> {\n    const ip = req.ip;\n    const user = (req as any).user;\n    const endpoint = req.path;\n    \n    const attempt: BruteForceAttempt = {\n      ip,\n      userId: user?.userId,\n      timestamp: Date.now(),\n      endpoint,\n      success\n    };\n    \n    // Record attempt for IP\n    await this.recordAttemptForIdentifier(this.getKey(ip, 'ip'), attempt, success);\n    \n    // Record attempt for user if authenticated\n    if (user?.userId) {\n      await this.recordAttemptForIdentifier(this.getKey(user.userId, 'user'), attempt, success);\n    }\n    \n    // Alert on lockout\n    if (!success) {\n      const ipStatus = await this.getLockoutStatus(this.getKey(ip, 'ip'));\n      if (ipStatus.attemptCount >= this.maxAttempts) {\n        await this.sendLockoutAlert('ip', ip, ipStatus, attempt);\n      }\n      \n      if (user?.userId) {\n        const userStatus = await this.getLockoutStatus(this.getKey(user.userId, 'user'));\n        if (userStatus.attemptCount >= this.maxAttempts) {\n          await this.sendLockoutAlert('user', user.userId, userStatus, attempt);\n        }\n      }\n    }\n  }\n  \n  private async recordAttemptForIdentifier(\n    key: string, \n    attempt: BruteForceAttempt, \n    success: boolean\n  ): Promise<void> {\n    const now = Date.now();\n    \n    if (success) {\n      // Clear attempts on successful login\n      await this.redis.del(key);\n    } else {\n      // Increment failed attempts\n      const pipeline = this.redis.pipeline();\n      pipeline.hincrby(key, 'attempts', 1);\n      pipeline.hset(key, 'lastAttempt', now);\n      pipeline.expire(key, Math.ceil(this.windowMs / 1000));\n      await pipeline.exec();\n    }\n  }\n  \n  async getLockoutStatus(key: string): Promise<LockoutStatus> {\n    const data = await this.redis.hmget(key, 'attempts', 'lastAttempt', 'lockUntil');\n    const attempts = parseInt(data[0] || '0');\n    const lastAttempt = parseInt(data[1] || '0');\n    const lockUntil = parseInt(data[2] || '0');\n    \n    const now = Date.now();\n    const isLocked = attempts >= this.maxAttempts && \n                    (lockUntil > now || (now - lastAttempt) < this.lockoutDuration);\n    \n    return {\n      isLocked,\n      lockUntil: isLocked ? Math.max(lockUntil, lastAttempt + this.lockoutDuration) : undefined,\n      attemptCount: attempts,\n      lastAttempt\n    };\n  }\n  \n  async isBlocked(req: Request): Promise<{ blocked: boolean; reason?: string; retryAfter?: number }> {\n    const ip = req.ip;\n    const user = (req as any).user;\n    \n    // Check IP lockout\n    const ipStatus = await this.getLockoutStatus(this.getKey(ip, 'ip'));\n    if (ipStatus.isLocked) {\n      return {\n        blocked: true,\n        reason: 'IP address temporarily blocked due to repeated failed attempts',\n        retryAfter: ipStatus.lockUntil ? Math.ceil((ipStatus.lockUntil - Date.now()) / 1000) : undefined\n      };\n    }\n    \n    // Check user lockout\n    if (user?.userId) {\n      const userStatus = await this.getLockoutStatus(this.getKey(user.userId, 'user'));\n      if (userStatus.isLocked) {\n        return {\n          blocked: true,\n          reason: 'Account temporarily locked due to repeated failed attempts',\n          retryAfter: userStatus.lockUntil ? Math.ceil((userStatus.lockUntil - Date.now()) / 1000) : undefined\n        };\n      }\n    }\n    \n    return { blocked: false };\n  }\n  \n  private async sendLockoutAlert(\n    type: 'ip' | 'user',\n    identifier: string,\n    status: LockoutStatus,\n    attempt: BruteForceAttempt\n  ): Promise<void> {\n    const alert = {\n      type: 'brute_force_lockout',\n      severity: 'high',\n      identifier: {\n        type,\n        value: identifier\n      },\n      lockoutDetails: {\n        attemptCount: status.attemptCount,\n        lockUntil: status.lockUntil,\n        lastAttempt: status.lastAttempt\n      },\n      context: {\n        endpoint: attempt.endpoint,\n        ip: attempt.ip,\n        userId: attempt.userId,\n        timestamp: attempt.timestamp,\n        userAgent: (attempt as any).userAgent\n      }\n    };\n    \n    logger.error('Brute force lockout triggered', alert);\n    \n    // Send to security monitoring system\n    // This could integrate with PagerDuty, Slack, etc.\n    if (process.env.SECURITY_WEBHOOK_URL) {\n      try {\n        await fetch(process.env.SECURITY_WEBHOOK_URL, {\n          method: 'POST',\n          headers: {\n            'Content-Type': 'application/json',\n            'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN}`\n          },\n          body: JSON.stringify(alert)\n        });\n      } catch (error) {\n        logger.error('Failed to send security alert', { error });\n      }\n    }\n  }\n}\n\nconst bruteForceProtection = new BruteForceProtection();\n\nexport function bruteForceMiddleware() {\n  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {\n    try {\n      const blockStatus = await bruteForceProtection.isBlocked(req);\n      \n      if (blockStatus.blocked) {\n        logger.warn('Request blocked by brute force protection', {\n          ip: req.ip,\n          path: req.path,\n          reason: blockStatus.reason\n        });\n        \n        res.status(429).json({\n          error: 'Too many failed attempts',\n          code: 'BRUTE_FORCE_PROTECTION',\n          message: blockStatus.reason,\n          retryAfter: blockStatus.retryAfter\n        });\n        return;\n      }\n      \n      // Record attempt result after response\n      const originalSend = res.send;\n      res.send = function(data: any) {\n        const isAuthEndpoint = req.path.includes('/auth') || req.path.includes('/login');\n        if (isAuthEndpoint) {\n          const success = res.statusCode >= 200 && res.statusCode < 300;\n          bruteForceProtection.recordAttempt(req, success).catch(err => {\n            logger.error('Failed to record brute force attempt', { error: err });\n          });\n        }\n        return originalSend.call(this, data);\n      };\n      \n      next();\n    } catch (error) {\n      logger.error('Brute force middleware error', { error });\n      next(); // Continue on error to avoid blocking legitimate traffic\n    }\n  };\n}\n\n// =============================================================================\n// Task 28-30: Content Security Policy Hardening\n// =============================================================================\n\ninterface CSPDirectives {\n  [key: string]: string | string[];\n}\n\ninterface CSPNonce {\n  script: string;\n  style: string;\n}\n\n/**\n * Generate cryptographically secure nonces for CSP\n */\nexport function generateCSPNonces(): CSPNonce {\n  return {\n    script: crypto.randomBytes(16).toString('base64'),\n    style: crypto.randomBytes(16).toString('base64')\n  };\n}\n\n/**\n * Production-hardened CSP configuration\n * Removes unsafe-inline and unsafe-eval, allows only necessary hosts\n */\nexport function createProductionCSP(nonces?: CSPNonce): CSPDirectives {\n  const environment = process.env.NODE_ENV || 'development';\n  \n  // Base configuration - very strict\n  const baseDirectives: CSPDirectives = {\n    'default-src': [\"'self'\"],\n    'script-src': [\n      \"'self'\",\n      // Nonce for necessary inline scripts\n      ...(nonces ? [`'nonce-${nonces.script}'`] : []),\n      // Trusted CDNs only\n      'https://cdn.jsdelivr.net',\n      'https://unpkg.com'\n    ],\n    'style-src': [\n      \"'self'\",\n      // Nonce for necessary inline styles\n      ...(nonces ? [`'nonce-${nonces.style}'`] : []),\n      // Trusted style sources\n      'https://fonts.googleapis.com',\n      'https://cdn.jsdelivr.net'\n    ],\n    'img-src': [\n      \"'self'\",\n      'data:',\n      'https:',\n      // Specific trusted image sources\n      'https://gravatar.com',\n      'https://avatars.githubusercontent.com'\n    ],\n    'font-src': [\n      \"'self'\",\n      'https://fonts.gstatic.com',\n      'https://cdn.jsdelivr.net'\n    ],\n    'connect-src': [\n      \"'self'\",\n      // API endpoints\n      'https://api.smm-architect.com',\n      // Sentry error reporting (Task 30)\n      'https://sentry.io',\n      'https://*.ingest.sentry.io',\n      // Analytics endpoints (Task 30)\n      'https://analytics.smm-architect.com',\n      // WebSocket connections\n      'wss://api.smm-architect.com'\n    ],\n    'frame-src': [\"'none'\"],\n    'object-src': [\"'none'\"],\n    'media-src': [\"'self'\"],\n    'worker-src': [\"'self'\"],\n    'child-src': [\"'none'\"],\n    'form-action': [\"'self'\"],\n    'frame-ancestors': [\"'none'\"],\n    'base-uri': [\"'self'\"],\n    'upgrade-insecure-requests': []\n  };\n  \n  // Environment-specific adjustments\n  if (environment === 'development') {\n    // Allow localhost for development\n    (baseDirectives['connect-src'] as string[]).push(\n      'http://localhost:*',\n      'ws://localhost:*',\n      'wss://localhost:*'\n    );\n    \n    // Allow webpack dev server\n    (baseDirectives['script-src'] as string[]).push('http://localhost:*');\n  }\n  \n  if (environment === 'staging') {\n    // Staging-specific endpoints\n    (baseDirectives['connect-src'] as string[]).push(\n      'https://staging-api.smm-architect.com',\n      'wss://staging-api.smm-architect.com'\n    );\n  }\n  \n  return baseDirectives;\n}\n\n/**\n * CSP middleware with nonce support\n */\nexport function cspMiddleware() {\n  return (req: Request, res: Response, next: NextFunction): void => {\n    // Generate nonces for this request\n    const nonces = generateCSPNonces();\n    \n    // Make nonces available to templates\n    (req as any).nonces = nonces;\n    res.locals.nonces = nonces;\n    \n    // Create CSP header\n    const cspDirectives = createProductionCSP(nonces);\n    \n    // Convert directives to header string\n    const cspHeader = Object.entries(cspDirectives)\n      .map(([directive, sources]) => {\n        if (Array.isArray(sources) && sources.length === 0) {\n          return directive; // For directives like upgrade-insecure-requests\n        }\n        const sourceList = Array.isArray(sources) ? sources.join(' ') : sources;\n        return `${directive} ${sourceList}`;\n      })\n      .join('; ');\n    \n    // Set CSP header\n    const environment = process.env.NODE_ENV || 'development';\n    \n    if (environment === 'production') {\n      // Enforce CSP in production\n      res.setHeader('Content-Security-Policy', cspHeader);\n    } else {\n      // Report-only mode for development/staging (Task 30)\n      res.setHeader('Content-Security-Policy-Report-Only', cspHeader);\n    }\n    \n    // Additional security headers\n    res.setHeader('X-Content-Type-Options', 'nosniff');\n    res.setHeader('X-Frame-Options', 'DENY');\n    res.setHeader('X-XSS-Protection', '1; mode=block');\n    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');\n    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');\n    \n    next();\n  };\n}\n\n/**\n * CSP violation reporting endpoint\n */\nexport function cspReportingEndpoint() {\n  return (req: Request, res: Response): void => {\n    const report = req.body;\n    \n    logger.warn('CSP violation reported', {\n      type: 'csp_violation',\n      report,\n      ip: req.ip,\n      userAgent: req.headers['user-agent']\n    });\n    \n    // Send to security monitoring\n    if (process.env.SECURITY_WEBHOOK_URL) {\n      fetch(process.env.SECURITY_WEBHOOK_URL, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n          'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN}`\n        },\n        body: JSON.stringify({\n          type: 'csp_violation',\n          report,\n          timestamp: new Date().toISOString()\n        })\n      }).catch(error => {\n        logger.error('Failed to send CSP violation alert', { error });\n      });\n    }\n    \n    res.status(204).end();\n  };\n}\n\n// =============================================================================\n// Combined Advanced Security Middleware\n// =============================================================================\n\nexport function advancedSecurityMiddleware() {\n  return [\n    bruteForceMiddleware(),\n    createEnhancedRateLimit(),\n    cspMiddleware()\n  ];\n}\n\nexport default {\n  createEnhancedRateLimit,\n  bruteForceMiddleware,\n  generateCSPNonces,\n  createProductionCSP,\n  cspMiddleware,\n  cspReportingEndpoint,\n  advancedSecurityMiddleware\n};"