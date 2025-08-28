/**
 * Centralized Authentication Middleware
 * 
 * This middleware provides JWT-based authentication and tenant context
 * for all service API routes.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { withTenantContext, requireValidTenantContext } from '../database/client';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
}

export interface TokenGenerationOptions {
  expiresIn?: string;
  audience?: string;
  issuer?: string;
  notBefore?: string;
  jwtId?: string;
  subject?: string;
}

/**
 * Generate a secure JWT token with hardened settings
 */
export function generateSecureToken(
  user: AuthenticatedUser, 
  scopes: string[] = [],
  options: TokenGenerationOptions = {}
): string {
  const secretKey = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET;
  if (!secretKey) {
    throw new Error('JWT secret not configured');
  }
  
  const payload = {
    userId: user.userId,
    tenantId: user.tenantId,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
    scopes,
    sessionId: user.sessionId,
    version: process.env.JWT_VERSION || '1',
    // Security metadata
    security: {
      algorithm: 'HS256',
      keyId: process.env.JWT_KEY_ID || 'default'
    }
  };
  
  const signOptions: jwt.SignOptions = {
    algorithm: 'HS256', // Pin to secure algorithm
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '1h',
    audience: options.audience || process.env.JWT_AUDIENCE || 'smm-architect-api',
    issuer: options.issuer || process.env.JWT_ISSUER || 'smm-architect',
    notBefore: options.notBefore || '0s',
    jwtid: options.jwtId,
    subject: options.subject || user.userId
  };
  
  return jwt.sign(payload, secretKey, signOptions);
}

/**
 * Validate token without extracting user (for token introspection)
 */
export function validateTokenStructure(token: string): boolean {
  try {
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || typeof decoded === 'string') {
      return false;
    }
    
    // Check token structure
    const header = decoded.header;
    const payload = decoded.payload as any;
    
    // Validate algorithm
    if (!['HS256', 'RS256', 'ES256'].includes(header.alg)) {
      return false;
    }
    
    // Validate required claims
    if (!payload.userId || !payload.tenantId || !payload.iss || !payload.aud) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export interface AuthRequest extends Request {
  user: AuthenticatedUser;
  tenantId: string;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'AUTHENTICATION_FAILED'
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403,
    public code: string = 'AUTHORIZATION_FAILED'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Extract and validate JWT token from request with security hardening
 */
async function extractUserFromToken(token: string): Promise<AuthenticatedUser> {
  try {
    const secretKey = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET;
    if (!secretKey) {
      throw new AuthenticationError('JWT secret not configured');
    }

    // JWT verification options with security hardening
    const verifyOptions: jwt.VerifyOptions = {
      // Algorithm pinning - only allow specific secure algorithms
      algorithms: ['HS256', 'RS256', 'ES256'], // Pin to secure algorithms only
      
      // Issuer validation
      issuer: process.env.JWT_ISSUER || 'smm-architect',
      
      // Audience validation
      audience: process.env.JWT_AUDIENCE || 'smm-architect-api',
      
      // Clock tolerance (small window to account for clock skew)
      clockTolerance: 30, // 30 seconds tolerance
      
      // Ensure token is not expired
      ignoreExpiration: false,
      
      // Ensure token is active (not before check)
      ignoreNotBefore: false,
      
      // Maximum token age (additional security)
      maxAge: process.env.JWT_MAX_AGE || '24h'
    };

    const decoded = jwt.verify(token, secretKey, verifyOptions) as any;
    
    // Validate required fields
    if (!decoded.userId || !decoded.tenantId) {
      throw new AuthenticationError('Invalid token: missing required claims');
    }
    
    // Validate token version for rotation support
    const expectedVersion = process.env.JWT_VERSION || '1';
    if (decoded.version && decoded.version !== expectedVersion) {
      throw new AuthenticationError('Invalid token: version mismatch');
    }
    
    // Additional security checks
    if (decoded.iat && decoded.exp) {
      const tokenLifetime = decoded.exp - decoded.iat;
      const maxLifetime = 24 * 60 * 60; // 24 hours in seconds
      
      if (tokenLifetime > maxLifetime) {
        throw new AuthenticationError('Invalid token: excessive lifetime');
      }
    }
    
    // Validate scopes format if present
    if (decoded.scopes && !Array.isArray(decoded.scopes)) {
      throw new AuthenticationError('Invalid token: malformed scopes');
    }
    
    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Log security events for monitoring
      logger.warn('JWT validation failed', {
        error: error.message,
        errorType: error.constructor.name,
        tokenLength: token?.length || 0
      });
      
      throw new AuthenticationError(`Invalid token: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Main authentication middleware
 * Validates JWT token and sets up tenant context
 */
export function authMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Missing or invalid Authorization header');
      }
      
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Extract and validate user
      const user = await extractUserFromToken(token);
      
      // Add user context to request
      (req as AuthRequest).user = user;
      (req as AuthRequest).tenantId = user.tenantId;
      
      // Set tenant context for database operations
      await withTenantContext(user.tenantId, async () => {
        // Tenant context is now set for this request
        logger.debug('Authentication successful', {
          userId: user.userId,
          tenantId: user.tenantId,
          roles: user.roles,
          path: req.path
        });
      });
      
      next();
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        logger.warn('Authentication failed', {
          error: error.message,
          ip: req.ip,
          path: req.path,
          userAgent: req.headers['user-agent']
        });
        
        res.status(error.statusCode).json({
          error: 'Authentication failed',
          code: error.code,
          message: error.message
        });
        return;
      }
      
      logger.error('Authentication middleware error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        path: req.path
      });
      
      res.status(500).json({
        error: 'Internal authentication error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Optional authentication middleware (for public endpoints that benefit from auth context)
 */
export function optionalAuthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No auth provided - continue without user context
        next();
        return;
      }
      
      const token = authHeader.substring(7);
      const user = await extractUserFromToken(token);
      
      (req as AuthRequest).user = user;
      (req as AuthRequest).tenantId = user.tenantId;
      
      await withTenantContext(user.tenantId, async () => {
        logger.debug('Optional authentication successful', {
          userId: user.userId,
          tenantId: user.tenantId
        });
      });
      
      next();
    } catch (error) {
      // For optional auth, continue without user context on auth errors
      logger.debug('Optional authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path
      });
      next();
    }
  };
}

/**
 * Require specific roles
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
    
    const hasAnyRole = roles.some(role => user.roles.includes(role));
    if (!hasAnyRole) {
      logger.warn('Insufficient roles', {
        userId: user.userId,
        tenantId: user.tenantId,
        requiredRoles: roles,
        userRoles: user.roles,
        path: req.path
      });
      
      res.status(403).json({
        error: 'Insufficient roles',
        code: 'INSUFFICIENT_ROLES',
        required: roles,
        current: user.roles
      });
      return;
    }
    
    next();
  };
}

/**
 * Require specific permissions
 */
export function requirePermissions(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
    
    const hasAllPermissions = permissions.every(permission => 
      user.permissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      const missingPermissions = permissions.filter(permission => 
        !user.permissions.includes(permission)
      );
      
      logger.warn('Insufficient permissions', {
        userId: user.userId,
        tenantId: user.tenantId,
        requiredPermissions: permissions,
        userPermissions: user.permissions,
        missingPermissions,
        path: req.path
      });
      
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        missing: missingPermissions
      });
      return;
    }
    
    next();
  };
}

/**
 * Tenant isolation middleware - ensures user can only access their tenant's data
 */
export function requireTenantAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }
      
      // Validate tenant context is properly set
      await requireValidTenantContext();
      
      // Extract tenant ID from request (path param, header, etc.)
      const requestTenantId = req.params.tenantId || 
                             req.headers['x-tenant-id'] || 
                             user.tenantId;
      
      if (requestTenantId && requestTenantId !== user.tenantId) {
        logger.warn('Tenant access violation attempt', {
          userId: user.userId,
          userTenantId: user.tenantId,
          requestedTenantId: requestTenantId,
          path: req.path,
          ip: req.ip
        });
        
        res.status(403).json({
          error: 'Access denied to tenant data',
          code: 'TENANT_ACCESS_DENIED'
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Tenant access middleware error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path
      });
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * API Key authentication (for service-to-service communication)
 */
export function apiKeyAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      logger.warn('Invalid API key', {
        providedKey: apiKey ? 'PROVIDED' : 'MISSING',
        path: req.path,
        ip: req.ip
      });
      
      res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
      return;
    }
    
    // Add service context
    (req as any).serviceAuth = true;
    
    next();
  };
}

/**
 * Require specific scopes (fine-grained permissions)
 * Scopes are more granular than permissions and define specific actions
 */
export function requireScopes(...scopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
    
    // Extract scopes from JWT token (should be included during token generation)
    const userScopes = (user as any).scopes || [];
    
    const hasAllScopes = scopes.every(scope => userScopes.includes(scope));
    
    if (!hasAllScopes) {
      const missingScopes = scopes.filter(scope => !userScopes.includes(scope));
      
      logger.warn('Insufficient scopes', {
        userId: user.userId,
        tenantId: user.tenantId,
        requiredScopes: scopes,
        userScopes,
        missingScopes,
        path: req.path
      });
      
      res.status(403).json({
        error: 'Insufficient scopes',
        code: 'INSUFFICIENT_SCOPES',
        required: scopes,
        missing: missingScopes
      });
      return;
    }
    
    next();
  };
}

/**
 * Require write access to specific resource types
 * Used for mutating operations (POST, PUT, PATCH, DELETE)
 */
export function requireWriteAccess(resourceType: string) {
  return requireScopes(`${resourceType}:write`, `${resourceType}:admin`);
}

/**
 * Require admin access to specific resource types
 * Used for administrative operations
 */
export function requireAdminAccess(resourceType: string) {
  return requireScopes(`${resourceType}:admin`);
}

/**
 * HTTP method-based scope enforcement
 * Automatically applies appropriate scopes based on HTTP method
 */
export function requireMethodScopes(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();
    
    let requiredScopes: string[];
    
    switch (method) {
      case 'GET':
      case 'HEAD':
        requiredScopes = [`${resourceType}:read`];
        break;
      case 'POST':
        requiredScopes = [`${resourceType}:create`, `${resourceType}:write`];
        break;
      case 'PUT':
      case 'PATCH':
        requiredScopes = [`${resourceType}:update`, `${resourceType}:write`];
        break;
      case 'DELETE':
        requiredScopes = [`${resourceType}:delete`, `${resourceType}:write`];
        break;
      default:
        res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
        return;
    }
    
    // Apply scope requirement
    requireScopes(...requiredScopes)(req, res, next);
  };
}

/**
 * Scope definitions for SMM Architect resources
 */
export const RESOURCE_SCOPES = {
  // Core resources
  WORKSPACE: 'workspace',
  MODEL: 'model',
  ROUTING: 'routing', 
  CANARY: 'canary',
  CONFIG: 'config',
  
  // Data Subject Rights
  DSR: 'dsr',
  
  // Audit and compliance
  AUDIT: 'audit',
  
  // User management
  USER: 'user',
  TENANT: 'tenant',
  
  // System administration
  SYSTEM: 'system'
};

/**
 * Pre-configured middleware for common resource types
 */
export const ScopeMiddleware = {
  // Model management routes
  models: {
    read: requireScopes(`${RESOURCE_SCOPES.MODEL}:read`),
    write: requireWriteAccess(RESOURCE_SCOPES.MODEL),
    admin: requireAdminAccess(RESOURCE_SCOPES.MODEL),
    method: requireMethodScopes(RESOURCE_SCOPES.MODEL)
  },
  
  // Routing configuration routes
  routing: {
    read: requireScopes(`${RESOURCE_SCOPES.ROUTING}:read`),
    write: requireWriteAccess(RESOURCE_SCOPES.ROUTING),
    admin: requireAdminAccess(RESOURCE_SCOPES.ROUTING),
    method: requireMethodScopes(RESOURCE_SCOPES.ROUTING)
  },
  
  // Canary deployment routes
  canary: {
    read: requireScopes(`${RESOURCE_SCOPES.CANARY}:read`),
    write: requireWriteAccess(RESOURCE_SCOPES.CANARY),
    admin: requireAdminAccess(RESOURCE_SCOPES.CANARY),
    method: requireMethodScopes(RESOURCE_SCOPES.CANARY)
  },
  
  // Configuration management routes
  config: {
    read: requireScopes(`${RESOURCE_SCOPES.CONFIG}:read`),
    write: requireWriteAccess(RESOURCE_SCOPES.CONFIG),
    admin: requireAdminAccess(RESOURCE_SCOPES.CONFIG),
    method: requireMethodScopes(RESOURCE_SCOPES.CONFIG)
  },
  
  // Workspace management routes
  workspace: {
    read: requireScopes(`${RESOURCE_SCOPES.WORKSPACE}:read`),
    write: requireWriteAccess(RESOURCE_SCOPES.WORKSPACE),
    admin: requireAdminAccess(RESOURCE_SCOPES.WORKSPACE),
    method: requireMethodScopes(RESOURCE_SCOPES.WORKSPACE)
  }
};