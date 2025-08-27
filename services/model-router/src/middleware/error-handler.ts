import { Request, Response, NextFunction } from 'express';
import { ApiError } from './auth';

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
  console.error('Model Router API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    requestId,
    timestamp: new Date().toISOString(),
  });

  // Handle different error types
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
  }

  // Handle OpenAI API errors
  if (error.message.includes('OpenAI') || error.message.includes('openai')) {
    return res.status(502).json({
      success: false,
      error: {
        code: 'OPENAI_API_ERROR',
        message: 'OpenAI API error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
  }

  // Handle Anthropic API errors
  if (error.message.includes('Anthropic') || error.message.includes('claude')) {
    return res.status(502).json({
      success: false,
      error: {
        code: 'ANTHROPIC_API_ERROR',
        message: 'Anthropic API error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
  }

  // Handle rate limiting errors
  if (error.message.includes('rate limit') || error.message.includes('quota')) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'AI model rate limit exceeded. Please try again later.',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
  }

  // Handle timeout errors
  if (error.message.includes('timeout') || error.name === 'TimeoutError') {
    return res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'AI model request timed out',
        timestamp: new Date().toISOString(),
        requestId,
      },
    } as ErrorResponse);
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
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}