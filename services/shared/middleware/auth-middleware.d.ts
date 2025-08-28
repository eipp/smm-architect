/**
 * Centralized Authentication Middleware
 *
 * This middleware provides JWT-based authentication and tenant context
 * for all service API routes.
 */
import { Request, Response, NextFunction } from 'express';
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
export declare function generateSecureToken(user: AuthenticatedUser, scopes?: string[], options?: TokenGenerationOptions): string;
/**
 * Validate token without extracting user (for token introspection)
 */
export declare function validateTokenStructure(token: string): boolean;
export interface AuthRequest extends Request {
    user: AuthenticatedUser;
    tenantId: string;
}
export declare class AuthenticationError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class AuthorizationError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
/**
 * Main authentication middleware
 * Validates JWT token and sets up tenant context
 */
export declare function authMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication middleware (for public endpoints that benefit from auth context)
 */
export declare function optionalAuthMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Require specific roles
 */
export declare function requireRoles(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require specific permissions
 */
export declare function requirePermissions(...permissions: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Tenant isolation middleware - ensures user can only access their tenant's data
 */
export declare function requireTenantAccess(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * API Key authentication (for service-to-service communication)
 */
export declare function apiKeyAuth(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require specific scopes (fine-grained permissions)
 * Scopes are more granular than permissions and define specific actions
 */
export declare function requireScopes(...scopes: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require write access to specific resource types
 * Used for mutating operations (POST, PUT, PATCH, DELETE)
 */
export declare function requireWriteAccess(resourceType: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require admin access to specific resource types
 * Used for administrative operations
 */
export declare function requireAdminAccess(resourceType: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * HTTP method-based scope enforcement
 * Automatically applies appropriate scopes based on HTTP method
 */
export declare function requireMethodScopes(resourceType: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Scope definitions for SMM Architect resources
 */
export declare const RESOURCE_SCOPES: {
    WORKSPACE: string;
    MODEL: string;
    ROUTING: string;
    CANARY: string;
    CONFIG: string;
    DSR: string;
    AUDIT: string;
    USER: string;
    TENANT: string;
    SYSTEM: string;
};
/**
 * Pre-configured middleware for common resource types
 */
export declare const ScopeMiddleware: {
    models: {
        read: (req: Request, res: Response, next: NextFunction) => void;
        write: (req: Request, res: Response, next: NextFunction) => void;
        admin: (req: Request, res: Response, next: NextFunction) => void;
        method: (req: Request, res: Response, next: NextFunction) => void;
    };
    routing: {
        read: (req: Request, res: Response, next: NextFunction) => void;
        write: (req: Request, res: Response, next: NextFunction) => void;
        admin: (req: Request, res: Response, next: NextFunction) => void;
        method: (req: Request, res: Response, next: NextFunction) => void;
    };
    canary: {
        read: (req: Request, res: Response, next: NextFunction) => void;
        write: (req: Request, res: Response, next: NextFunction) => void;
        admin: (req: Request, res: Response, next: NextFunction) => void;
        method: (req: Request, res: Response, next: NextFunction) => void;
    };
    config: {
        read: (req: Request, res: Response, next: NextFunction) => void;
        write: (req: Request, res: Response, next: NextFunction) => void;
        admin: (req: Request, res: Response, next: NextFunction) => void;
        method: (req: Request, res: Response, next: NextFunction) => void;
    };
    workspace: {
        read: (req: Request, res: Response, next: NextFunction) => void;
        write: (req: Request, res: Response, next: NextFunction) => void;
        admin: (req: Request, res: Response, next: NextFunction) => void;
        method: (req: Request, res: Response, next: NextFunction) => void;
    };
};
//# sourceMappingURL=auth-middleware.d.ts.map