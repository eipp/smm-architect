import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import crypto from 'crypto';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Main error handling middleware
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Log to console for development
  if (process.env.NODE_ENV !== 'production') {
    console.error('API Error:', errorDetails);
  }

  // Send to Sentry for production monitoring
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      scope.setTag('requestId', requestId);
      scope.setContext('request', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: req.query,
        params: req.params,
      });
      
      if (error instanceof ApiError) {
        scope.setLevel('warning');
        scope.setTag('errorCode', error.code);
      } else {
        scope.setLevel('error');
      }
      
      Sentry.captureException(error);
    });
  }

  // Handle different error types
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  // Handle Multer errors (file upload)
  if (error.name === 'MulterError') {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds the maximum allowed limit';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'UNEXPECTED_FILE';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        code = 'FIELD_NAME_TOO_LONG';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        code = 'FIELD_VALUE_TOO_LONG';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        code = 'TOO_MANY_FIELDS';
        break;
    }

    res.status(400).json({
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  // Handle database errors
  if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  if (error.message.includes('foreign key constraint') || error.message.includes('violates foreign key')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  // Handle timeout errors
  if (error.message.includes('timeout') || error.name === 'TimeoutError') {
    res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  // Handle network/connection errors
  if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
    res.status(502).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'External service temporarily unavailable',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
    return;
  }

  // Default to internal server error
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      details: isDevelopment ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    },
  } as ErrorResponse);
}

/**
 * Not found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  } as ErrorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error formatter
 */
export function formatValidationError(errors: any[]): any {
  return errors.map(error => ({
    field: error.path || error.param,
    message: error.msg || error.message,
    value: error.value,
    location: error.location,
  }));
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

/**
 * Error response helper function
 */
export function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: any,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: requestId || generateRequestId(),
    },
  };
}

/**
 * Success response helper function
 */
export function createSuccessResponse(data: any, message?: string): any {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle promise rejections and uncaught exceptions
 */
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(reason);
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error);
    }
    
    // Give Sentry time to send the error
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

/**
 * Health check error types
 */
export class HealthCheckError extends ApiError {
  constructor(service: string, details?: any) {
    super(503, 'SERVICE_UNHEALTHY', `${service} health check failed`, details);
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(429, 'RATE_LIMITED', 'Too many requests', { retryAfter });
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super(403, 'FORBIDDEN', message);
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

/**
 * Business logic error
 */
export class BusinessLogicError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, 'BUSINESS_LOGIC_ERROR', message, details);
  }
}