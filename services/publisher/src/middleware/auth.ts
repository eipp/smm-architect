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
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable not set');
      return res.status(500).json({
        code: 'CONFIGURATION_ERROR',
        message: 'Authentication configuration error'
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
          code: 'TOKEN_EXPIRED',
          message: 'JWT token has expired'
        });
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          code: 'INVALID_TOKEN',
          message: 'Invalid JWT token'
        });
      } else {
        return res.status(401).json({
          code: 'TOKEN_VERIFICATION_FAILED',
          message: 'Token verification failed'
        });
      }
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      code: 'AUTH_ERROR',
      message: 'Authentication processing error'
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
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
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
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Missing required scopes: ${missingScopes.join(', ')}`,
        requiredScopes,
        userScopes
      });
    }

    next();
  };
}

/**
 * Workspace access middleware
 */
export function requireWorkspaceAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
  
  if (!workspaceId) {
    return res.status(400).json({
      code: 'MISSING_WORKSPACE_ID',
      message: 'Workspace ID is required'
    });
  }

  // Admin users have access to all workspaces
  if (req.user.scopes.includes('admin')) {
    return next();
  }

  // Check if user has access to the specific workspace
  if (req.user.workspaceId !== workspaceId) {
    return res.status(403).json({
      code: 'WORKSPACE_ACCESS_DENIED',
      message: 'Access denied to workspace',
      workspaceId
    });
  }

  next();
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without authentication
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    return next(); // Continue without authentication if no secret
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
  } catch (error) {
    // Ignore token errors for optional auth
    console.warn('Optional auth token validation failed:', error instanceof Error ? error.message : error);
  }

  next();
}

/**
 * Rate limiting per user middleware
 */
export function rateLimitPerUser(windowMs: number, maxRequests: number) {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required for rate limiting'
      });
    }

    const userId = req.user.userId;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize user limit
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }

    userLimit.count++;
    next();
  };
}

/**
 * Generate JWT token for user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '24h'): string {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  return jwt.sign(payload, jwtSecret, { expiresIn });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  return jwt.verify(token, jwtSecret) as JWTPayload;
}

/**
 * Check if user has specific scope
 */
export function hasScope(user: AuthenticatedRequest['user'], scope: string): boolean {
  if (!user) return false;
  return user.scopes.includes('admin') || user.scopes.includes(scope);
}

/**
 * Check if user has any of the specified scopes
 */
export function hasAnyScope(user: AuthenticatedRequest['user'], scopes: string[]): boolean {
  if (!user) return false;
  if (user.scopes.includes('admin')) return true;
  return scopes.some(scope => user.scopes.includes(scope));
}

/**
 * Check if user has all of the specified scopes
 */
export function hasAllScopes(user: AuthenticatedRequest['user'], scopes: string[]): boolean {
  if (!user) return false;
  if (user.scopes.includes('admin')) return true;
  return scopes.every(scope => user.scopes.includes(scope));
}