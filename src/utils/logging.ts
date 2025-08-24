import { createLogger, format, transports, Logger } from 'winston';
import { randomUUID } from 'crypto';

export interface LogContext {
  requestId?: string;
  workspaceId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface LogFields {
  [key: string]: any;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export class SMMLogger {
  private logger: Logger;
  private context: LogContext;
  private serviceName: string;
  private environment: string;

  constructor(serviceName: string, context: LogContext = {}) {
    this.serviceName = serviceName;
    this.context = { ...context };
    this.environment = process.env.NODE_ENV || 'production';

    // Create winston logger with structured format
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
        }),
        format.errors({ stack: true }),
        format.json(),
        format.printf((info) => {
          const logEntry = {
            '@timestamp': info.timestamp,
            level: info.level,
            service: this.serviceName,
            environment: this.environment,
            message: info.message,
            ...this.context,
            ...info.fields,
            ...(info.stack && { stack: info.stack }),
            ...(info.error && { error: this.serializeError(info.error) })
          };

          // Remove undefined values
          Object.keys(logEntry).forEach(key => {
            if (logEntry[key] === undefined) {
              delete logEntry[key];
            }
          });

          return JSON.stringify(logEntry);
        })
      ),
      transports: [
        new transports.Console({
          stderrLevels: ['error'],
          consoleWarnLevels: ['warn']
        }),
        // File transport for local development
        ...(this.environment === 'development' ? [
          new transports.File({
            filename: `logs/${this.serviceName}-error.log`,
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          }),
          new transports.File({
            filename: `logs/${this.serviceName}-combined.log`,
            maxsize: 5242880, // 5MB
            maxFiles: 5
          })
        ] : [])
      ],
      exitOnError: false
    });
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): SMMLogger {
    const childContext = { ...this.context, ...additionalContext };
    return new SMMLogger(this.serviceName, childContext);
  }

  // Update context for current logger
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  // Generate correlation ID
  generateCorrelationId(): string {
    const correlationId = randomUUID();
    this.setContext({ correlationId });
    return correlationId;
  }

  // Structured logging methods
  info(message: string, fields?: LogFields): void {
    this.logger.info(message, { fields });
  }

  warn(message: string, fields?: LogFields): void {
    this.logger.warn(message, { fields });
  }

  error(message: string, error?: Error, fields?: LogFields): void {
    this.logger.error(message, { error, fields });
  }

  debug(message: string, fields?: LogFields): void {
    this.logger.debug(message, { fields });
  }

  // Domain-specific logging methods
  audit(action: string, resource: string, result: 'success' | 'failure', details?: any): void {
    this.logger.info('Audit event', {
      fields: {
        event_type: 'audit',
        action,
        resource,
        result,
        details,
        ip_address: this.context.requestId ? 'from-request' : 'system',
        user_agent: 'SMM-Service'
      }
    });
  }

  security(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    this.logger.warn('Security event', {
      fields: {
        event_type: 'security',
        security_event_type: eventType,
        severity,
        details,
        risk_score: this.calculateRiskScore(severity),
        detection_method: 'application'
      }
    });
  }

  performance(operation: string, duration: number, success: boolean, details?: any): void {
    this.logger.info('Performance metric', {
      fields: {
        event_type: 'performance',
        operation,
        duration_ms: duration,
        success,
        details
      }
    });
  }

  // Agent-specific logging
  agentExecution(agentType: string, status: 'started' | 'completed' | 'failed', details?: any): void {
    this.logger.info(`Agent execution ${status}`, {
      fields: {
        event_type: 'agent_execution',
        agent_type: agentType,
        status,
        details
      }
    });
  }

  // Connector-specific logging
  connectorCall(platform: string, endpoint: string, responseTime: number, statusCode: number, details?: any): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    this.logger.log(level, 'Connector API call', {
      fields: {
        event_type: 'connector_call',
        platform,
        endpoint,
        response_time: responseTime,
        status_code: statusCode,
        details
      }
    });
  }

  // Simulation-specific logging
  simulationEvent(simulationId: string, iteration: number, event: string, details?: any): void {
    this.logger.info('Simulation event', {
      fields: {
        event_type: 'simulation',
        simulation_id: simulationId,
        iteration,
        event,
        details
      }
    });
  }

  // Workflow-specific logging
  workflowEvent(workflowId: string, executionId: string, nodeType: string, status: string, details?: any): void {
    this.logger.info('Workflow event', {
      fields: {
        event_type: 'workflow',
        workflow_id: workflowId,
        execution_id: executionId,
        node_type: nodeType,
        workflow_status: status,
        details
      }
    });
  }

  // Business metrics logging
  businessMetric(metric: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.logger.info('Business metric', {
      fields: {
        event_type: 'business_metric',
        metric_name: metric,
        metric_value: value,
        metric_unit: unit,
        tags
      }
    });
  }

  // Helper methods
  private serializeError(error: Error): any {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause && { cause: error.cause })
    };
  }

  private calculateRiskScore(severity: string): number {
    const scores = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100
    };
    return scores[severity] || 0;
  }
}

// Factory function for creating loggers
export function createSMMLogger(serviceName: string, context?: LogContext): SMMLogger {
  return new SMMLogger(serviceName, context);
}

// Express middleware for request logging
export function requestLoggingMiddleware(serviceName: string) {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    const startTime = Date.now();
    
    // Add request ID to headers
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    // Create logger with request context
    const logger = createSMMLogger(serviceName, {
      requestId,
      userId: req.user?.id,
      workspaceId: req.headers['x-workspace-id'],
      sessionId: req.sessionID
    });

    // Attach logger to request
    req.logger = logger;

    // Log request start
    logger.info('Request started', {
      method: req.method,
      url: req.url,
      user_agent: req.headers['user-agent'],
      ip_address: req.ip || req.connection.remoteAddress,
      content_length: req.headers['content-length']
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        status_code: res.statusCode,
        duration_ms: duration,
        content_length: res.get('content-length')
      });

      // Log performance metrics
      logger.performance(
        `${req.method} ${req.url}`,
        duration,
        res.statusCode < 400,
        {
          status_code: res.statusCode,
          method: req.method,
          url: req.url
        }
      );

      originalEnd.call(res, chunk, encoding);
    };

    next();
  };
}

// Correlation ID middleware
export function correlationMiddleware() {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  };
}

// Global error handler with logging
export function errorLoggingHandler(serviceName: string) {
  return (error: Error, req: any, res: any, next: any) => {
    const logger = req.logger || createSMMLogger(serviceName, { requestId: req.requestId });
    
    logger.error('Unhandled request error', error, {
      method: req.method,
      url: req.url,
      user_id: req.user?.id,
      status_code: res.statusCode
    });

    // Security logging for potential attacks
    if (error.name === 'ValidationError' || error.message.includes('SQL')) {
      logger.security('potential_injection_attempt', 'medium', {
        error_type: error.name,
        url: req.url,
        method: req.method,
        user_agent: req.headers['user-agent']
      });
    }

    next(error);
  };
}

// Structured error class
export class SMMError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: any;

  constructor(message: string, code: string, statusCode: number = 500, context?: any) {
    super(message);
    this.name = 'SMMError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }

  toLogFormat(): any {
    return {
      error_code: this.code,
      error_message: this.message,
      status_code: this.statusCode,
      context: this.context,
      stack: this.stack
    };
  }
}

// Export default logger instance
export const defaultLogger = createSMMLogger('smm-system');