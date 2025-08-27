import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
// Mock Sentry implementation for toolhub service
function captureException(error: Error, context?: any) {
  console.error('Sentry capture:', error.message, context);
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

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // Capture exception with Sentry
  captureException(error, {
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error.name === 'SyntaxError' && 'body' in error) {
    res.status(400).json({
      code: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Default error response
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
}