import { createHash } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  workspaceId?: string;
  agentType?: string;
  modelId?: string;
  operationId?: string;
  traceId?: string;
  spanId?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context: LogContext;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  service: string;
  environment: string;
  version: string;
}

// PII patterns to mask
const PII_PATTERNS = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  // Phone numbers (US format)
  { pattern: /\\(?\\d{3}\\)?[-\\s.]?\\d{3}[-\\s.]?\\d{4}/g, replacement: '[PHONE]' },
  // Social Security Numbers
  { pattern: /\\d{3}-\\d{2}-\\d{4}/g, replacement: '[SSN]' },
  // Credit card numbers (basic pattern)
  { pattern: /\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}/g, replacement: '[CARD]' },
  // API keys and tokens (common patterns)
  { pattern: /(?:api[_-]?key|token|secret)[\"']?\\s*[:=]\\s*[\"']?([a-zA-Z0-9_-]{20,})/gi, replacement: 'api_key=\"[REDACTED]\"' },
  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*/g, replacement: '[JWT_TOKEN]' },
  // Authorization headers
  { pattern: /Bearer\\s+[a-zA-Z0-9_-]+/gi, replacement: 'Bearer [REDACTED]' }
];

// Sensitive fields to mask in objects
const SENSITIVE_FIELDS = [
  'password', 'passwd', 'secret', 'token', 'key', 'authorization',
  'auth', 'credential', 'credentials', 'apiKey', 'api_key',
  'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  'sessionId', 'session_id', 'ssn', 'socialSecurityNumber',
  'creditCard', 'credit_card', 'ccNumber', 'cardNumber'
];

export class StructuredLogger {
  private static contextStorage = new AsyncLocalStorage<LogContext>();
  private service: string;
  private environment: string;
  private version: string;
  private enableConsole: boolean;
  private enableSentry: boolean;
  private logLevel: string;

  constructor(service: string, options: {
    environment?: string;
    version?: string;
    enableConsole?: boolean;
    enableSentry?: boolean;
    logLevel?: string;
  } = {}) {
    this.service = service;
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.version = options.version || process.env.npm_package_version || '1.0.0';
    this.enableConsole = options.enableConsole ?? true;
    this.enableSentry = options.enableSentry ?? false;
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
  }

  static setContext(context: LogContext): void {
    const currentContext = this.contextStorage.getStore() || {};
    const mergedContext = { ...currentContext, ...context };
    this.contextStorage.enterWith(mergedContext);
  }

  static getContext(): LogContext {
    return this.contextStorage.getStore() || {};
  }

  static withContext<T>(context: LogContext, fn: () => T): T {
    const currentContext = this.contextStorage.getStore() || {};
    const mergedContext = { ...currentContext, ...context };
    return this.contextStorage.run(mergedContext, fn);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any, error?: Error): void {
    this.log('warn', message, data, error);
  }

  error(message: string, error?: Error, data?: any): void {
    this.log('error', message, data, error);
  }

  fatal(message: string, error?: Error, data?: any): void {
    this.log('fatal', message, data, error);
  }

  // Timing utilities
  time(operationId: string): () => void {
    const startTime = Date.now();
    const context = StructuredLogger.getContext();
    StructuredLogger.setContext({ ...context, operationId });
    
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Operation completed: ${operationId}`, { duration });
    };
  }

  // Audit logging for compliance
  audit(action: string, resource: string, data?: any): void {
    const context = StructuredLogger.getContext();
    this.info(`AUDIT: ${action} on ${resource}`, {
      auditEvent: {
        action,
        resource,
        timestamp: new Date().toISOString(),
        actor: {
          userId: context.userId,
          tenantId: this.hashSensitive(context.tenantId)
        },
        ...data
      }
    });
  }

  // Security event logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any): void {
    this.warn(`SECURITY: ${event}`, {
      securityEvent: {
        event,
        severity,
        timestamp: new Date().toISOString(),
        ...data
      }
    });
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error' | 'fatal', message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const context = StructuredLogger.getContext();
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.maskPII(message),
      context: this.sanitizeContext(context),
      service: this.service,
      environment: this.environment,
      version: this.version
    };

    if (data) {
      logEntry.data = this.sanitizeData(data);
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: this.maskPII(error.message),
        stack: this.environment === 'development' ? error.stack : undefined,
        code: (error as any).code
      };
    }

    this.output(logEntry);
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private output(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry);

    if (this.enableConsole) {
      switch (logEntry.level) {
        case 'debug':
          console.debug(logString);
          break;
        case 'info':
          console.info(logString);
          break;
        case 'warn':
          console.warn(logString);
          break;
        case 'error':
        case 'fatal':
          console.error(logString);
          break;
      }
    }

    // Send to external logging services (implement as needed)
    if (this.enableSentry && (logEntry.level === 'error' || logEntry.level === 'fatal')) {
      this.sendToSentry(logEntry);
    }
  }

  private sendToSentry(logEntry: LogEntry): void {
    // This would integrate with Sentry SDK
    // Implementation depends on specific Sentry setup
    try {
      if (global.Sentry && global.Sentry.captureException) {
        const error = logEntry.error ? new Error(logEntry.error.message) : new Error(logEntry.message);
        global.Sentry.withScope((scope: any) => {
          scope.setTag('service', logEntry.service);
          scope.setTag('environment', logEntry.environment);
          scope.setTag('version', logEntry.version);
          scope.setLevel(logEntry.level === 'fatal' ? 'fatal' : 'error');
          
          // Add context without PII
          Object.entries(logEntry.context).forEach(([key, value]) => {
            if (value && !this.isSensitiveField(key)) {
              scope.setTag(key, String(value));
            }
          });
          
          if (logEntry.data) {
            scope.setExtra('data', logEntry.data);
          }
          
          global.Sentry.captureException(error);
        });
      }
    } catch (sentryError) {
      console.error('Failed to send to Sentry:', sentryError);
    }
  }

  private maskPII(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let maskedText = text;
    for (const { pattern, replacement } of PII_PATTERNS) {
      maskedText = maskedText.replace(pattern, replacement);
    }
    return maskedText;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null) {
        if (this.isSensitiveField(key)) {
          sanitized[key as keyof LogContext] = this.hashSensitive(String(value));
        } else {
          sanitized[key as keyof LogContext] = String(value);
        }
      }
    }
    
    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.maskPII(data);
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeData(item));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return SENSITIVE_FIELDS.some(sensitive => 
      lowerFieldName.includes(sensitive.toLowerCase())
    );
  }

  private hashSensitive(value: string): string {
    if (!value) return value;
    // Use first 8 characters of SHA256 hash for correlation while protecting PII
    return createHash('sha256').update(value).digest('hex').substring(0, 8);
  }
}

// Express middleware for correlation IDs and request logging
export function requestLoggingMiddleware(logger: StructuredLogger) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Extract or generate correlation IDs
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const correlationId = req.headers['x-correlation-id'] || requestId;
    const traceId = req.headers['traceparent']?.split('-')[1] || correlationId;
    const spanId = req.headers['traceparent']?.split('-')[2] || `span-${Math.random().toString(36).substr(2, 8)}`;
    
    // Set context for this request
    const context: LogContext = {
      requestId,
      correlationId,
      traceId,
      spanId,
      tenantId: req.tenantId,
      userId: req.userId
    };
    
    // Add headers to response for tracing
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);
    
    // Set context and continue with request
    StructuredLogger.withContext(context, () => {
      // Log request start (excluding sensitive routes)
      if (!req.path.includes('/auth') && !req.path.includes('/credentials')) {
        logger.info('Request started', {
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          query: req.query
        });
      }
      
      // Override res.end to log completion
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const duration = Date.now() - startTime;
        
        // Log request completion
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          contentLength: res.getHeader('content-length')
        });
        
        originalEnd.apply(this, args);
      };
      
      next();
    });
  };
}

// Factory function for creating service-specific loggers
export function createLogger(service: string, options?: {
  environment?: string;
  version?: string;
  enableConsole?: boolean;
  enableSentry?: boolean;
  logLevel?: string;
}): StructuredLogger {
  return new StructuredLogger(service, options);
}

// Export a default logger instance
export const logger = createLogger('default');