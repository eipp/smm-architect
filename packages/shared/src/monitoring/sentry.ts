/**
 * SMM Architect Unified Sentry Configuration
 * 
 * Provides consistent error tracking, performance monitoring,
 * and release tracking across all services and environments
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface SentryConfig {
  serviceName: string;
  version?: string;
  environment?: string;
  enableProfiling?: boolean;
  enableTracing?: boolean;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

/**
 * Service-specific Sentry configurations
 */
const serviceConfigs: Record<string, Partial<SentryConfig>> = {
  'smm-architect-service': {
    enableProfiling: true,
    enableTracing: true,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  },
  'toolhub-service': {
    enableProfiling: true,
    enableTracing: true,
    sampleRate: 1.0,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
  },
  'frontend-app': {
    enableProfiling: false,
    enableTracing: true,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.0,
  },
  'simulator-service': {
    enableProfiling: true,
    enableTracing: true,
    sampleRate: 1.0,
    tracesSampleRate: 0.05, // Lower for high-volume service
    profilesSampleRate: 0.05,
  },
  'model-router-service': {
    enableProfiling: true,
    enableTracing: true,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  },
  'audit-service': {
    enableProfiling: false,
    enableTracing: true,
    sampleRate: 1.0,
    tracesSampleRate: 0.2, // Higher for critical service
    profilesSampleRate: 0.0,
  },
};

/**
 * Initialize Sentry for a specific service
 */
export function initializeSentry(sentryConfig: SentryConfig): void {
  const appConfig = config.getConfig();
  const monitoringConfig = config.getMonitoringConfig();

  // Skip initialization if no DSN provided
  if (!monitoringConfig.sentryDsn) {
    logger.warn('Sentry DSN not provided, skipping Sentry initialization');
    return;
  }

  // Get service-specific configuration
  const serviceConfig = serviceConfigs[sentryConfig.serviceName] || {};
  const finalConfig = { ...sentryConfig, ...serviceConfig };

  const integrations: Sentry.Integration[] = [
    // Default Node.js integrations
    new Sentry.Integrations.Http({ tracing: finalConfig.enableTracing }),
    new Sentry.Integrations.Express({ app: undefined }),
    new Sentry.Integrations.Console(),
    new Sentry.Integrations.LinkedErrors(),
    new Sentry.Integrations.RequestData(),
  ];

  // Add profiling integration if enabled
  if (finalConfig.enableProfiling) {
    integrations.push(new ProfilingIntegration());
  }

  // Initialize Sentry
  Sentry.init({
    dsn: monitoringConfig.sentryDsn,
    environment: finalConfig.environment || monitoringConfig.sentryEnvironment,
    release: finalConfig.version || monitoringConfig.sentryRelease,
    
    // Sampling rates
    sampleRate: finalConfig.sampleRate || 1.0,
    tracesSampleRate: finalConfig.tracesSampleRate || 0.1,
    profilesSampleRate: finalConfig.profilesSampleRate || 0.1,
    
    // Integrations
    integrations,
    
    // Service identification
    serverName: finalConfig.serviceName,
    
    // Tags
    initialScope: {
      tags: {
        service: finalConfig.serviceName,
        version: finalConfig.version || '1.0.0',
        environment: finalConfig.environment || monitoringConfig.sentryEnvironment,
        node_env: appConfig.NODE_ENV,
      },
    },
    
    // Error filtering
    beforeSend: (event, hint) => {
      // Filter out non-critical errors in development
      if (appConfig.NODE_ENV === 'development') {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'code' in error) {
          // Skip common development errors
          const skipCodes = ['ECONNREFUSED', 'ENOTFOUND', 'TIMEOUT'];
          if (skipCodes.includes(error.code as string)) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // Performance monitoring
    tracesSampler: (samplingContext) => {
      // Custom sampling logic based on operation
      const { transactionContext } = samplingContext;
      
      if (transactionContext.name?.includes('health')) {
        return 0.01; // Low sampling for health checks
      }
      
      if (transactionContext.name?.includes('auth')) {
        return 0.5; // Higher sampling for auth operations
      }
      
      return finalConfig.tracesSampleRate || 0.1;
    },
    
    // Session tracking
    autoSessionTracking: true,
    
    // Release health
    enableTracing: finalConfig.enableTracing,
  });

  // Set additional context
  Sentry.setContext('service', {
    name: finalConfig.serviceName,
    version: finalConfig.version || '1.0.0',
    environment: finalConfig.environment || monitoringConfig.sentryEnvironment,
  });

  logger.info('Sentry initialized successfully', {
    service: finalConfig.serviceName,
    environment: finalConfig.environment || monitoringConfig.sentryEnvironment,
    enableProfiling: finalConfig.enableProfiling,
    enableTracing: finalConfig.enableTracing,
  });
}

/**
 * Express error handler middleware for Sentry
 */
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError: (error) => {
    // Handle all errors in production, only 5xx in development
    if (config.getConfig().NODE_ENV === 'production') {
      return true;
    }
    
    return error.status >= 500;
  },
});

/**
 * Express request handler middleware for Sentry
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  ip: false, // Don't capture IP addresses for privacy
  user: ['id', 'email'], // Only capture specific user fields
});

/**
 * Capture exception with additional context
 */
export function captureException(
  error: Error,
  context?: {
    user?: { id: string; email?: string };
    extra?: Record<string, any>;
    tags?: Record<string, string>;
    level?: Sentry.SeverityLevel;
  }
): string {
  Sentry.withScope((scope) => {
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    
    if (context?.tags) {
      scope.setTags(context.tags);
    }
    
    if (context?.level) {
      scope.setLevel(context.level);
    }
    
    return Sentry.captureException(error);
  });
  
  return 'Exception captured';
}

/**
 * Capture message with context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    extra?: Record<string, any>;
    tags?: Record<string, string>;
  }
): string {
  return Sentry.withScope((scope) => {
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    
    if (context?.tags) {
      scope.setTags(context.tags);
    }
    
    scope.setLevel(level);
    return Sentry.captureMessage(message);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  tenantId?: string;
}): void {
  Sentry.setUser(user);
}

/**
 * Set transaction context for performance monitoring
 */
export function startTransaction(
  name: string,
  operation: string,
  description?: string
): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op: operation,
    description,
  });
}

/**
 * Flush Sentry (useful for serverless or before shutdown)
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

/**
 * Close Sentry client
 */
export async function closeSentry(timeout = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

/**
 * Health check for Sentry
 */
export function checkSentryHealth(): boolean {
  try {
    const client = Sentry.getCurrentHub().getClient();
    return client !== undefined;
  } catch {
    return false;
  }
}

// Export Sentry for direct access if needed
export { Sentry };