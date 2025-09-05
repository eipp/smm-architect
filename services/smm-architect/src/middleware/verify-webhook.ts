import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';
import winston from 'winston';
import { readFileSync } from 'fs';

// Type definition for VaultClient (unused but kept for compatibility)
interface VaultClient {
  read(path: string): Promise<any>;
  write(path: string, data: any): Promise<any>;
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

function getRedisPassword(): string | undefined {
  if (process.env.REDIS_PASSWORD) {
    return process.env.REDIS_PASSWORD;
  }
  if (process.env.REDIS_PASSWORD_FILE) {
    try {
      return readFileSync(process.env.REDIS_PASSWORD_FILE, 'utf8').trim();
    } catch (error) {
      logger.error('Failed to read Redis password file', error);
    }
  }
  return undefined;
}

export interface WebhookVerificationConfig {
  secretPath: string; // Vault path for webhook secret (e.g., 'secret/data/tenants/{tenantId}/webhooks/{connectorId}')
  timestampTolerance: number; // seconds (default: 300 = 5 minutes)
  replayWindow: number; // seconds (default: 600 = 10 minutes)
  signatureHeader?: string; // header name (default: 'X-Signature')
  timestampHeader?: string; // header name (default: 'X-Timestamp')
  nonceHeader?: string; // header name (default: 'X-Nonce')
  tenantIdExtractor?: (req: Request) => string; // function to extract tenant ID from request
  connectorIdExtractor?: (req: Request) => string; // function to extract connector ID from request
}

export interface WebhookSecurityContext {
  tenantId: string;
  connectorId: string;
  signature: string;
  timestamp: number;
  nonce: string;
  body: Buffer;
}

export class WebhookVerificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

export class WebhookVerifier {
  private redisClient: Redis;
  private config: Required<WebhookVerificationConfig>;

  constructor(
    config: WebhookVerificationConfig,
    vaultClient?: any, // Unused parameter for compatibility
    redisClient?: Redis
  ) {
    this.config = {
      secretPath: config.secretPath,
      timestampTolerance: config.timestampTolerance || 300,
      replayWindow: config.replayWindow || 600,
      signatureHeader: config.signatureHeader || 'X-Signature',
      timestampHeader: config.timestampHeader || 'X-Timestamp',
      nonceHeader: config.nonceHeader || 'X-Nonce',
      tenantIdExtractor: config.tenantIdExtractor || this.defaultTenantExtractor,
      connectorIdExtractor: config.connectorIdExtractor || this.defaultConnectorExtractor
    };

    const redisPassword = getRedisPassword();
    this.redisClient = redisClient || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: redisPassword,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3
    });
  }

  /**
   * Extract security context from request headers and body
   */
  private extractSecurityContext(req: Request): WebhookSecurityContext {
    const signature = req.headers[this.config.signatureHeader.toLowerCase()] as string;
    const timestampHeader = req.headers[this.config.timestampHeader.toLowerCase()] as string;
    const nonce = req.headers[this.config.nonceHeader.toLowerCase()] as string;

    if (!signature) {
      throw new WebhookVerificationError(
        `Missing ${this.config.signatureHeader} header`,
        'MISSING_SIGNATURE'
      );
    }

    if (!timestampHeader) {
      throw new WebhookVerificationError(
        `Missing ${this.config.timestampHeader} header`,
        'MISSING_TIMESTAMP'
      );
    }

    if (!nonce) {
      throw new WebhookVerificationError(
        `Missing ${this.config.nonceHeader} header`,
        'MISSING_NONCE'
      );
    }

    const timestamp = parseInt(timestampHeader);
    if (isNaN(timestamp)) {
      throw new WebhookVerificationError(
        'Invalid timestamp format',
        'INVALID_TIMESTAMP'
      );
    }

    const tenantId = this.config.tenantIdExtractor(req);
    const connectorId = this.config.connectorIdExtractor(req);

    if (!tenantId) {
      throw new WebhookVerificationError(
        'Unable to extract tenant ID from request',
        'MISSING_TENANT_ID'
      );
    }

    if (!connectorId) {
      throw new WebhookVerificationError(
        'Unable to extract connector ID from request',
        'MISSING_CONNECTOR_ID'
      );
    }

    return {
      tenantId,
      connectorId,
      signature,
      timestamp,
      nonce,
      body: req.body
    };
  }

  /**
   * Validate timestamp is within tolerance window
   */
  private validateTimestamp(timestamp: number): void {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);

    if (diff > this.config.timestampTolerance) {
      throw new WebhookVerificationError(
        `Timestamp outside tolerance window. Diff: ${diff}s, Max: ${this.config.timestampTolerance}s`,
        'TIMESTAMP_OUT_OF_RANGE'
      );
    }
  }

  /**
   * Check for replay attacks using nonce
   */
  private async validateNonce(nonce: string, tenantId: string): Promise<void> {
    const nonceKey = `webhook:nonce:${tenantId}:${nonce}`;
    
    // Check if nonce was already used
    const exists = await this.redisClient.exists(nonceKey);
    if (exists) {
      throw new WebhookVerificationError(
        'Nonce already used - possible replay attack',
        'REPLAY_ATTACK_DETECTED'
      );
    }

    // Store nonce for replay window
    await this.redisClient.setex(nonceKey, this.config.replayWindow, '1');
  }

  /**
   * Retrieve webhook secret from environment
   */
  private async getWebhookSecret(tenantId: string, connectorId: string): Promise<string> {
    try {
      // In production, this would retrieve from a secure secret store
      // For now, use a combination of environment variable and tenant/connector IDs
      const baseSecret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
      return crypto.createHash('sha256')
        .update(`${baseSecret}-${tenantId}-${connectorId}`)
        .digest('hex');
    } catch (error) {
      logger.error('Failed to retrieve webhook secret', {
        tenantId,
        connectorId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new WebhookVerificationError(
        'Failed to retrieve webhook secret',
        'SECRET_RETRIEVAL_FAILED',
        500
      );
    }
  }

  /**
   * Verify HMAC-SHA256 signature using timing-safe comparison
   */
  private verifySignature(
    body: Buffer,
    signature: string,
    secret: string,
    timestamp: number,
    nonce: string
  ): boolean {
    try {
      // Create payload for signing: timestamp + nonce + body
      const payload = `${timestamp}.${nonce}.${body.toString('utf8')}`;
      
      // Calculate HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Extract signature from header (handle both 'sha256=' prefix and raw hex)
      const receivedSignature = signature.startsWith('sha256=')
        ? signature.slice(7)
        : signature;

      // Timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature verification failed', {
        error: error instanceof Error ? error.message : String(error),
        signatureLength: signature.length
      });
      return false;
    }
  }

  /**
   * Verify webhook authenticity
   */
  async verify(req: Request): Promise<void> {
    try {
      // Extract security context
      const context = this.extractSecurityContext(req);

      // Validate timestamp
      this.validateTimestamp(context.timestamp);

      // Validate nonce (replay protection)
      await this.validateNonce(context.nonce, context.tenantId);

      // Get webhook secret from Vault
      const secret = await this.getWebhookSecret(context.tenantId, context.connectorId);

      // Verify signature
      const isValid = this.verifySignature(
        context.body,
        context.signature,
        secret,
        context.timestamp,
        context.nonce
      );

      if (!isValid) {
        throw new WebhookVerificationError(
          'Invalid webhook signature',
          'INVALID_SIGNATURE'
        );
      }

      logger.info('Webhook verification successful', {
        tenantId: context.tenantId,
        connectorId: context.connectorId,
        timestamp: context.timestamp,
        nonce: context.nonce
      });

    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw error;
      }
      
      logger.error('Webhook verification error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new WebhookVerificationError(
        'Webhook verification failed',
        'VERIFICATION_ERROR',
        500
      );
    }
  }

  /**
   * Default tenant ID extractor from URL params
   */
  private defaultTenantExtractor(req: Request): string {
    return req.params.tenantId || req.headers['x-tenant-id'] as string;
  }

  /**
   * Default connector ID extractor from URL params
   */
  private defaultConnectorExtractor(req: Request): string {
    return req.params.connectorId || req.headers['x-connector-id'] as string;
  }
}

/**
 * Express middleware factory for webhook verification
 */
export function verifyWebhookSignature(
  config: WebhookVerificationConfig,
  vaultClient?: VaultClient,
  redisClient?: Redis
) {
  const verifier = new WebhookVerifier(config, vaultClient, redisClient);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await verifier.verify(req);
      next();
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        logger.warn('Webhook verification failed', {
          code: error.code,
          message: error.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });

        res.status(error.statusCode).json({
          error: 'Webhook verification failed',
          code: error.code,
          message: error.message
        });
        return;
      }

      logger.error('Unexpected webhook verification error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
        path: req.path
      });

      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Convenience middleware for tenant-scoped webhooks
 */
export function verifyTenantWebhook(timestampTolerance = 300, replayWindow = 600) {
  return verifyWebhookSignature({
    secretPath: 'secret/data/tenants/{tenantId}/webhooks/{connectorId}',
    timestampTolerance,
    replayWindow
  });
}

/**
 * Convenience middleware for connector-specific webhooks
 */
export function verifyConnectorWebhook(
  connectorType: string,
  timestampTolerance = 300,
  replayWindow = 600
) {
  return verifyWebhookSignature({
    secretPath: `secret/data/connectors/${connectorType}/{tenantId}/webhook`,
    timestampTolerance,
    replayWindow,
    connectorIdExtractor: () => connectorType
  });
}