// Mock Header type definition
interface Header {
  [key: string]: string | undefined;
}
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { withTenantContext } from '../../shared/database/client';

// Mock Prisma client for tenant context
interface MockPrismaClient {
  $executeRaw: (query: any, ...args: any[]) => Promise<any>;
}

// Mock functions for tenant context management
function getPrismaClient(): MockPrismaClient {
  return {
    async $executeRaw(query: any, ...args: any[]) {
      // Mock implementation
      return Promise.resolve([]);
    }
  };
}

async function getCurrentTenantContext(client: MockPrismaClient): Promise<string | null> {
  // Mock implementation - in production this would query current tenant context from DB
  return process.env.CURRENT_TENANT_ID || null;
}

async function setTenantContext(client: MockPrismaClient, tenantId: string): Promise<void> {
  // Mock implementation - in production this would set RLS context
  process.env.CURRENT_TENANT_ID = tenantId;
}

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

export interface TenantContext {
  tenantId: string;
  tenantName?: string;
  subscription?: string;
  features?: string[];
}

// Extend Express Request to include auth context
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenant?: TenantContext;
      tenantId?: string; // For backward compatibility
    }
  }
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

export class TenantContextError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'TENANT_CONTEXT_ERROR'
  ) {
    super(message);
    this.name = 'TenantContextError';
  }
}

/**
 * Extract tenant ID from various sources in order of preference:
 * 1. JWT token claim
 * 2. X-Tenant-ID header  \
 * 3. URL path parameter
 * 4. Subdomain
 */
export function extractTenantId(req: Request): string | null {
  // 1. From JWT token (most secure)
  if (req.user?.tenantId) {
    return req.user.tenantId;
  }
  
  // 2. From X-Tenant-ID header
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId) {
    return headerTenantId;
  }
  
  // 3. From URL path parameter
  if (req.params.tenantId) {
    return req.params.tenantId;
  }
  
  // 4. From subdomain (format: tenant.smm-architect.com)
  const host = req.headers.host;
  if (host && host.includes('.')) {
    const subdomain = host.split('.')[0];
    // Exclude common subdomains
    if (subdomain && !['www', 'api', 'app', 'admin'].includes(subdomain)) {
      return subdomain;
    }
  }
  
  return null;
}

/**
 * Extract user from JWT token
 */
export async function extractUserFromToken(token: string): Promise<AuthenticatedUser> {
  try {
    const secretKey = process.env.JWT_SECRET || await getJWTSecret();
    const decoded = jwt.verify(token, secretKey) as any;
    
    // Validate required fields
    if (!decoded.userId || !decoded.tenantId) {
      throw new AuthenticationError('Invalid token: missing required claims');
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
      throw new AuthenticationError(`Invalid token: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get JWT secret from environment
 */
async function getJWTSecret(): Promise<string> {
  return process.env.JWT_SECRET || 'fallback-secret-key';
}

/**
 * Middleware to authenticate and extract user from JWT token
 */
export function authenticateUser() {
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
      req.user = user;
      
      logger.debug('User authenticated', {
        userId: user.userId,
        tenantId: user.tenantId,
        roles: user.roles
      });
      
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.warn('Authentication failed', {
          error: error.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(error.statusCode).json({
          error: 'Authentication failed',
          code: error.code,
          message: error.message
        });
        return;
      }
      
      logger.error('Unexpected authentication error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Middleware to automatically set tenant context for database operations
 * This MUST be used after authentication middleware
 */
export function setAutomaticTenantContext() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract tenant ID from multiple sources
      const tenantId = extractTenantId(req);
      
      if (!tenantId) {
        throw new TenantContextError('Tenant ID is required but not found in request');
      }
      
      // Validate tenant ID format
      if (!isValidTenantId(tenantId)) {
        throw new TenantContextError(`Invalid tenant ID format: ${tenantId}`);
      }
      
      // If user is authenticated, verify tenant access
      if (req.user && req.user.tenantId !== tenantId) {
        throw new AuthorizationError(
          `User does not have access to tenant: ${tenantId}`,
          403,
          'TENANT_ACCESS_DENIED'
        );
      }
      
      // Set tenant context in database session using secure context
      await withTenantContext(tenantId, async () => {
        // Tenant context is now set for this request scope
        logger.debug('Database tenant context established', { tenantId });
      });
      
      // Add tenant context to request
      req.tenantId = tenantId;
      req.tenant = {
        tenantId,
        // Additional tenant info could be loaded here
      };
      
      logger.debug('Tenant context set', {
        tenantId,
        userId: req.user?.userId,
        path: req.path
      });
      
      next();
    } catch (error) {
      if (error instanceof TenantContextError || error instanceof AuthorizationError) {
        logger.warn('Tenant context error', {
          error: error.message,
          ip: req.ip,
          path: req.path,
          headers: {
            'x-tenant-id': req.headers['x-tenant-id'],
            'host': req.headers.host
          }
        });
        
        res.status(error.statusCode).json({
          error: 'Tenant context error',
          code: error.code,
          message: error.message
        });
        return;
      }
      
      logger.error('Unexpected tenant context error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Combined middleware for authentication and automatic tenant context
 */
export function requireAuthWithTenantContext() {
  return [
    authenticateUser(),
    setAutomaticTenantContext()
  ];
}

/**
 * Middleware for tenant context only (no authentication required)
 * Useful for webhook endpoints or public APIs that need tenant context
 */
export function requireTenantContext() {
  return setAutomaticTenantContext();
}

/**
 * Middleware to require specific permissions
 */
export function requirePermissions(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
    
    const hasAllPermissions = permissions.every(permission => 
      req.user!.permissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      const missingPermissions = permissions.filter(permission => 
        !req.user!.permissions.includes(permission)
      );
      
      logger.warn('Insufficient permissions', {
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions,
        missingPermissions
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
 * Middleware to require specific roles
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
    
    const hasAnyRole = roles.some(role => req.user!.roles.includes(role));
    
    if (!hasAnyRole) {
      logger.warn('Insufficient roles', {
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        requiredRoles: roles,
        userRoles: req.user.roles
      });
      
      res.status(403).json({
        error: 'Insufficient roles',
        code: 'INSUFFICIENT_ROLES',
        required: roles,
        current: req.user.roles
      });
      return;
    }
    
    next();
  };
}

/**
 * Validate tenant ID format
 */
function isValidTenantId(tenantId: string): boolean {
  // Tenant ID should be alphanumeric with hyphens, between 3-50 characters
  const tenantIdRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,48}[a-zA-Z0-9]$/;
  return tenantIdRegex.test(tenantId);
}

/**
 * Middleware to verify tenant context is properly set
 * Use this in critical endpoints to ensure RLS is working
 */
export function verifyTenantContext() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { validateCurrentTenantContext } = await import('../../shared/database/client');
      const validation = await validateCurrentTenantContext();
      
      if (!validation.isValid || !validation.tenantId) {
        throw new TenantContextError('Database tenant context is not set');
      }
      
      if (req.tenantId && validation.tenantId !== req.tenantId) {
        throw new TenantContextError(
          `Database tenant context mismatch: expected ${req.tenantId}, got ${validation.tenantId}`
        );
      }
      
      logger.debug('Tenant context verified', {
        tenantId: validation.tenantId,
        requestTenantId: req.tenantId
      });
      
      next();
    } catch (error) {
      logger.error('Tenant context verification failed', {
        error: error instanceof Error ? error.message : String(error),
        requestTenantId: req.tenantId,
        path: req.path
      });
      
      res.status(500).json({
        error: 'Tenant context verification failed',
        code: 'TENANT_CONTEXT_VERIFICATION_FAILED'
      });
    }
  };
}

/**
 * Helper function to be used in job queues and background tasks
 */
export async function withTenantContextForJob<T>(
  tenantId: string,
  operation: () => Promise<T>
): Promise<T> {
  const prismaClient = getPrismaClient();
  
  try {
    await setTenantContext(prismaClient, tenantId);
    return await operation();
  } catch (error) {
    logger.error('Job with tenant context failed', {
      tenantId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Audit middleware to log tenant-scoped operations
 */
export function auditTenantOperations() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json;
    
    res.json = function(obj) {
      // Log the operation after successful completion
      if (res.statusCode < 400 && req.tenantId) {
        logger.info('Tenant operation completed', {
          tenantId: req.tenantId,
          userId: req.user?.userId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }
      
      return originalJson.call(this, obj);
    };
    
    next();
  };
}
