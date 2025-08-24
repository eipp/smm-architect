import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Type definitions
export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  debug?: boolean;
  enabled?: boolean;
  enableLogs?: boolean;
  sendDefaultPii?: boolean;
}

export interface ServiceContext {
  serviceName: string;
  version?: string;
  environment: string;
}

/**
 * Initialize Sentry for a service
 * @param config Sentry configuration options
 * @param context Service context information
 */
export function initializeSentry(config: SentryConfig, context: ServiceContext): void {
  if (config.enabled === false) {
    console.log(`Sentry disabled for ${context.serviceName}`);
    return;
  }

  if (!config.dsn) {
    console.warn(`Sentry DSN not provided for ${context.serviceName}. Sentry will not be initialized.`);
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release || context.version,
    tracesSampleRate: config.tracesSampleRate || 0.1,
    profilesSampleRate: config.profilesSampleRate || 0.1,
    debug: config.debug || false,
    enableLogs: config.enableLogs ?? true,
    sendDefaultPii: config.sendDefaultPii ?? false,
    
    integrations: [
      // Profiling integration for performance monitoring
      nodeProfilingIntegration(),
      
      // HTTP integration for tracing HTTP requests
      new Sentry.Integrations.Http({
        tracing: true,
      }),
      
      // OnUncaughtException integration for handling uncaught exceptions
      new Sentry.Integrations.OnUncaughtException({
        exitEvenIfOtherHandlersAreRegistered: false,
      }),
      
      // OnUnhandledRejection integration for handling unhandled promise rejections
      new Sentry.Integrations.OnUnhandledRejection({
        mode: 'warn',
      }),
    ],
    
    // Before sending to Sentry, we can filter or modify events
    beforeSend(event, hint) {
      // Filter out network errors that are not actionable
      if (event.exception?.values?.[0]?.type === 'AbortError') {
        return null;
      }
      
      // Add service-specific tags
      if (!event.tags) {
        event.tags = {};
      }
      event.tags.service = context.serviceName;
      event.tags.environment = context.environment;
      
      return event;
    },
    
    // Before sending breadcrumbs, we can filter or modify them
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out console logs that are not errors or warnings in production
      if (context.environment === 'production' && 
          breadcrumb.category === 'console' && 
          breadcrumb.level !== 'error' && 
          breadcrumb.level !== 'warning') {
        return null;
      }
      
      return breadcrumb;
    },
  });

  // Set initial scope with service context
  Sentry.configureScope((scope) => {
    scope.setTag('service', context.serviceName);
    scope.setTag('environment', context.environment);
    if (context.version) {
      scope.setTag('version', context.version);
    }
  });

  console.log(`Sentry initialized for ${context.serviceName} in ${context.environment} environment`);
}

/**
 * Capture an exception with additional context
 * @param error The error to capture
 * @param context Additional context to attach to the event
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  return Sentry.captureException(error, {
    contexts: {
      service: context,
    },
  });
}

/**
 * Capture a message with level and additional context
 * @param message The message to capture
 * @param level The level of the message (default: 'info')
 * @param context Additional context to attach to the event
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): string {
  return Sentry.captureMessage(message, {
    level,
    contexts: {
      service: context,
    },
  });
}

/**
 * Create a transaction for performance monitoring
 * @param name Transaction name
 * @param op Operation name
 */
export function startTransaction(name: string, op: string): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Create a span for performance monitoring
 * @param transaction Parent transaction
 * @param op Operation name
 * @param description Description of the span
 */
export function startSpan(transaction: Sentry.Transaction, op: string, description: string): Sentry.Span {
  return transaction.startChild({
    op,
    description,
  });
}

/**
 * Close Sentry client and flush events
 * @param timeout Timeout in milliseconds
 */
export async function closeSentry(timeout: number = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

/**
 * Get the current Sentry hub
 */
export function getCurrentHub(): Sentry.Hub {
  return Sentry.getCurrentHub();
}

export default {
  initializeSentry,
  captureException,
  captureMessage,
  startTransaction,
  startSpan,
  closeSentry,
  getCurrentHub,
};