import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    workspaceId: string;
    scopes: string[];
    email?: string;
    name?: string;
  };
}

export interface JWTPayload {
  userId: string;
  workspaceId: string;
  scopes: string[];
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication middleware that validates JWT tokens
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable not set');
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Authentication configuration error'
        }
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      req.user = {
        userId: decoded.userId,
        workspaceId: decoded.workspaceId,
        scopes: decoded.scopes || [],
        email: decoded.email,
        name: decoded.name
      };

      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'JWT token has expired'
          }
        });
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid JWT token'
          }
        });
      } else {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_VERIFICATION_FAILED',
            message: 'Token verification failed'
          }
        });
      }
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication processing error'
      }
    });
  }
}

/**
 * Authorization middleware that checks required scopes
 */
export function requireScopes(requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const userScopes = req.user.scopes || [];
    
    // Check if user has admin scope (grants all permissions)
    if (userScopes.includes('admin')) {
      return next();
    }

    // Check if user has all required scopes
    const hasAllScopes = requiredScopes.every(scope => userScopes.includes(scope));
    
    if (!hasAllScopes) {
      const missingScopes = requiredScopes.filter(scope => !userScopes.includes(scope));
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Missing required scopes: ${missingScopes.join(', ')}`,
          requiredScopes,
          userScopes
        }
      });
    }

    next();
  };
}

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
    Error.captureStackTrace(this, this.constructor);
  }
}