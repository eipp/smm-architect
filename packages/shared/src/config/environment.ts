/**
 * SMM Architect Centralized Configuration Manager
 * 
 * Provides type-safe environment configuration with validation
 * and centralized management across all services
 */

import { z } from 'zod';
import { logger } from '../utils/logger';

// Base configuration schema
const BaseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
});

// Database configuration schema
const DatabaseConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('smm_architect'),
  DB_USER: z.string().default('smm_user'),
  DB_PASSWORD: z.string().min(1),
  DB_SSL: z.boolean().default(false),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(10),
});

// Redis configuration schema
const RedisConfigSchema = z.object({
  REDIS_URL: z.string().url(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TTL: z.coerce.number().default(3600),
});

// External services configuration
const ExternalServicesConfigSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  VAULT_URL: z.string().url().optional(),
  VAULT_TOKEN: z.string().optional(),
  N8N_URL: z.string().url().optional(),
  AGENTUITY_URL: z.string().url().optional(),
});

// Monitoring configuration
const MonitoringConfigSchema = z.object({
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_RELEASE: z.string().optional(),
  PROMETHEUS_ENABLED: z.boolean().default(false),
  METRICS_PORT: z.coerce.number().default(9090),
});

// Security configuration
const SecurityConfigSchema = z.object({
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  CORS_ORIGIN: z.string().or(z.array(z.string())).default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

// Complete configuration schema
const ConfigSchema = BaseConfigSchema
  .merge(DatabaseConfigSchema)
  .merge(RedisConfigSchema)
  .merge(ExternalServicesConfigSchema)
  .merge(MonitoringConfigSchema)
  .merge(SecurityConfigSchema);

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Environment-specific configuration overrides
 */
const environmentDefaults: Partial<Record<string, Partial<Config>>> = {
  development: {
    LOG_LEVEL: 'debug',
    DB_SSL: false,
    PROMETHEUS_ENABLED: false,
    CORS_ORIGIN: '*',
  },
  staging: {
    LOG_LEVEL: 'info',
    DB_SSL: true,
    PROMETHEUS_ENABLED: true,
    SENTRY_ENVIRONMENT: 'staging',
  },
  production: {
    LOG_LEVEL: 'warn',
    DB_SSL: true,
    PROMETHEUS_ENABLED: true,
    SENTRY_ENVIRONMENT: 'production',
    CORS_ORIGIN: ['https://app.smm-architect.com', 'https://admin.smm-architect.com'],
  },
};

/**
 * Configuration Manager Class
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load and validate configuration from environment
   */
  private loadConfig(): Config {
    try {
      // Get current environment
      const nodeEnv = process.env['NODE_ENV'] || 'development';
      
      // Merge environment-specific defaults
      const envDefaults = environmentDefaults[nodeEnv] || {};
      
      // Create configuration object from environment
      const envConfig = {
        ...envDefaults,
        ...this.getEnvVars(),
      };

      // Validate configuration
      const validatedConfig = ConfigSchema.parse(envConfig);
      
      logger.info('Configuration loaded successfully', {
        environment: validatedConfig.NODE_ENV,
        logLevel: validatedConfig.LOG_LEVEL,
        port: validatedConfig.PORT,
      });

      return validatedConfig;
    } catch (error) {
      logger.error('Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error}`);
    }
  }

  /**
   * Extract environment variables
   */
  private getEnvVars(): Record<string, any> {
    const env = process.env;
    
    return {
      NODE_ENV: env['NODE_ENV'],
      LOG_LEVEL: env['LOG_LEVEL'],
      PORT: env['PORT'],
      
      // Database
      DATABASE_URL: env['DATABASE_URL'],
      DB_HOST: env['DB_HOST'],
      DB_PORT: env['DB_PORT'],
      DB_NAME: env['DB_NAME'],
      DB_USER: env['DB_USER'],
      DB_PASSWORD: env['DB_PASSWORD'],
      DB_SSL: env['DB_SSL'],
      DB_POOL_MIN: env['DB_POOL_MIN'],
      DB_POOL_MAX: env['DB_POOL_MAX'],
      
      // Redis
      REDIS_URL: env['REDIS_URL'],
      REDIS_HOST: env['REDIS_HOST'],
      REDIS_PORT: env['REDIS_PORT'],
      REDIS_PASSWORD: env['REDIS_PASSWORD'],
      REDIS_DB: env['REDIS_DB'],
      REDIS_TTL: env['REDIS_TTL'],
      
      // External Services
      OPENAI_API_KEY: env['OPENAI_API_KEY'],
      VAULT_URL: env['VAULT_URL'],
      VAULT_TOKEN: env['VAULT_TOKEN'],
      N8N_URL: env['N8N_URL'],
      AGENTUITY_URL: env['AGENTUITY_URL'],
      
      // Monitoring
      SENTRY_DSN: env['SENTRY_DSN'],
      SENTRY_ENVIRONMENT: env['SENTRY_ENVIRONMENT'],
      SENTRY_RELEASE: env['SENTRY_RELEASE'],
      PROMETHEUS_ENABLED: env['PROMETHEUS_ENABLED'],
      METRICS_PORT: env['METRICS_PORT'],
      
      // Security
      JWT_SECRET: env['JWT_SECRET'],
      ENCRYPTION_KEY: env['ENCRYPTION_KEY'],
      CORS_ORIGIN: env['CORS_ORIGIN'],
      RATE_LIMIT_WINDOW_MS: env['RATE_LIMIT_WINDOW_MS'],
      RATE_LIMIT_MAX_REQUESTS: env['RATE_LIMIT_MAX_REQUESTS'],
    };
  }

  /**
   * Get complete configuration
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Get specific configuration section
   */
  public getDatabaseConfig() {
    return {
      url: this.config.DATABASE_URL,
      host: this.config.DB_HOST,
      port: this.config.DB_PORT,
      database: this.config.DB_NAME,
      username: this.config.DB_USER,
      password: this.config.DB_PASSWORD,
      ssl: this.config.DB_SSL,
      pool: {
        min: this.config.DB_POOL_MIN,
        max: this.config.DB_POOL_MAX,
      },
    };
  }

  public getRedisConfig() {
    return {
      url: this.config.REDIS_URL,
      host: this.config.REDIS_HOST,
      port: this.config.REDIS_PORT,
      password: this.config.REDIS_PASSWORD,
      db: this.config.REDIS_DB,
      ttl: this.config.REDIS_TTL,
    };
  }

  public getMonitoringConfig() {
    return {
      sentryDsn: this.config.SENTRY_DSN,
      sentryEnvironment: this.config.SENTRY_ENVIRONMENT,
      sentryRelease: this.config.SENTRY_RELEASE,
      prometheusEnabled: this.config.PROMETHEUS_ENABLED,
      metricsPort: this.config.METRICS_PORT,
    };
  }

  public getSecurityConfig() {
    return {
      jwtSecret: this.config.JWT_SECRET,
      encryptionKey: this.config.ENCRYPTION_KEY,
      corsOrigin: this.config.CORS_ORIGIN,
      rateLimit: {
        windowMs: this.config.RATE_LIMIT_WINDOW_MS,
        maxRequests: this.config.RATE_LIMIT_MAX_REQUESTS,
      },
    };
  }

  /**
   * Validate configuration at runtime
   */
  public validateConfig(): boolean {
    try {
      ConfigSchema.parse(this.config);
      return true;
    } catch (error) {
      logger.error('Runtime configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Get masked configuration for logging (sensitive data hidden)
   */
  public getMaskedConfig(): Partial<Config> {
    const { 
      DB_PASSWORD, 
      JWT_SECRET, 
      ENCRYPTION_KEY, 
      OPENAI_API_KEY, 
      VAULT_TOKEN,
      ...safeConfig 
    } = this.config;

    return {
      ...safeConfig,
      DB_PASSWORD: DB_PASSWORD ? '***MASKED***' : undefined,
      JWT_SECRET: JWT_SECRET ? '***MASKED***' : undefined,
      ENCRYPTION_KEY: ENCRYPTION_KEY ? '***MASKED***' : undefined,
      OPENAI_API_KEY: OPENAI_API_KEY ? '***MASKED***' : undefined,
      VAULT_TOKEN: VAULT_TOKEN ? '***MASKED***' : undefined,
    };
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();