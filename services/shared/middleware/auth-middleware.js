"use strict";
/**
 * Centralized Authentication Middleware
 *
 * This middleware provides JWT-based authentication and tenant context
 * for all service API routes.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeMiddleware = exports.RESOURCE_SCOPES = exports.AuthorizationError = exports.AuthenticationError = void 0;
exports.generateSecureToken = generateSecureToken;
exports.validateTokenStructure = validateTokenStructure;
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
exports.requireRoles = requireRoles;
exports.requirePermissions = requirePermissions;
exports.requireTenantAccess = requireTenantAccess;
exports.apiKeyAuth = apiKeyAuth;
exports.requireScopes = requireScopes;
exports.requireWriteAccess = requireWriteAccess;
exports.requireAdminAccess = requireAdminAccess;
exports.requireMethodScopes = requireMethodScopes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const winston_1 = __importDefault(require("winston"));
const client_1 = require("../database/client");
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console()
    ]
});
/**
 * Generate a secure JWT token with hardened settings
 */
function generateSecureToken(user, scopes = [], options = {}) {
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
    const signOptions = {
        algorithm: 'HS256', // Pin to secure algorithm
        expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '1h',
        audience: options.audience || process.env.JWT_AUDIENCE || 'smm-architect-api',
        issuer: options.issuer || process.env.JWT_ISSUER || 'smm-architect',
        notBefore: options.notBefore || '0s',
        jwtid: options.jwtId,
        subject: options.subject || user.userId
    };
    return jsonwebtoken_1.default.sign(payload, secretKey, signOptions);
}
/**
 * Validate token without extracting user (for token introspection)
 */
function validateTokenStructure(token) {
    try {
        const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
        if (!decoded || typeof decoded === 'string') {
            return false;
        }
        // Check token structure
        const header = decoded.header;
        const payload = decoded.payload;
        // Validate algorithm
        if (!['HS256', 'RS256', 'ES256'].includes(header.alg)) {
            return false;
        }
        // Validate required claims
        if (!payload.userId || !payload.tenantId || !payload.iss || !payload.aud) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
class AuthenticationError extends Error {
    constructor(message, statusCode = 401, code = 'AUTHENTICATION_FAILED') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message, statusCode = 403, code = 'AUTHORIZATION_FAILED') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Extract and validate JWT token from request with security hardening
 */
async function extractUserFromToken(token) {
    try {
        const secretKey = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET;
        if (!secretKey) {
            throw new AuthenticationError('JWT secret not configured');
        }
        // JWT verification options with security hardening
        const verifyOptions = {
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
        const decoded = jsonwebtoken_1.default.verify(token, secretKey, verifyOptions);
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
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
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
function authMiddleware() {
    return async (req, res, next) => {
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
            req.user = user;
            req.tenantId = user.tenantId;
            // Set tenant context for database operations
            await (0, client_1.withTenantContext)(user.tenantId, async () => {
                // Tenant context is now set for this request
                logger.debug('Authentication successful', {
                    userId: user.userId,
                    tenantId: user.tenantId,
                    roles: user.roles,
                    path: req.path
                });
            });
            next();
        }
        catch (error) {
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
function optionalAuthMiddleware() {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                // No auth provided - continue without user context
                next();
                return;
            }
            const token = authHeader.substring(7);
            const user = await extractUserFromToken(token);
            req.user = user;
            req.tenantId = user.tenantId;
            await (0, client_1.withTenantContext)(user.tenantId, async () => {
                logger.debug('Optional authentication successful', {
                    userId: user.userId,
                    tenantId: user.tenantId
                });
            });
            next();
        }
        catch (error) {
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
function requireRoles(...roles) {
    return (req, res, next) => {
        const user = req.user;
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
function requirePermissions(...permissions) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const hasAllPermissions = permissions.every(permission => user.permissions.includes(permission));
        if (!hasAllPermissions) {
            const missingPermissions = permissions.filter(permission => !user.permissions.includes(permission));
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
function requireTenantAccess() {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTHENTICATION_REQUIRED'
                });
                return;
            }
            // Validate tenant context is properly set
            await (0, client_1.requireValidTenantContext)();
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
        }
        catch (error) {
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
function apiKeyAuth() {
    return (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
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
        req.serviceAuth = true;
        next();
    };
}
/**
 * Require specific scopes (fine-grained permissions)
 * Scopes are more granular than permissions and define specific actions
 */
function requireScopes(...scopes) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        // Extract scopes from JWT token (should be included during token generation)
        const userScopes = user.scopes || [];
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
function requireWriteAccess(resourceType) {
    return requireScopes(`${resourceType}:write`, `${resourceType}:admin`);
}
/**
 * Require admin access to specific resource types
 * Used for administrative operations
 */
function requireAdminAccess(resourceType) {
    return requireScopes(`${resourceType}:admin`);
}
/**
 * HTTP method-based scope enforcement
 * Automatically applies appropriate scopes based on HTTP method
 */
function requireMethodScopes(resourceType) {
    return (req, res, next) => {
        const method = req.method.toUpperCase();
        let requiredScopes;
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
exports.RESOURCE_SCOPES = {
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
exports.ScopeMiddleware = {
    // Model management routes
    models: {
        read: requireScopes(`${exports.RESOURCE_SCOPES.MODEL}:read`),
        write: requireWriteAccess(exports.RESOURCE_SCOPES.MODEL),
        admin: requireAdminAccess(exports.RESOURCE_SCOPES.MODEL),
        method: requireMethodScopes(exports.RESOURCE_SCOPES.MODEL)
    },
    // Routing configuration routes
    routing: {
        read: requireScopes(`${exports.RESOURCE_SCOPES.ROUTING}:read`),
        write: requireWriteAccess(exports.RESOURCE_SCOPES.ROUTING),
        admin: requireAdminAccess(exports.RESOURCE_SCOPES.ROUTING),
        method: requireMethodScopes(exports.RESOURCE_SCOPES.ROUTING)
    },
    // Canary deployment routes
    canary: {
        read: requireScopes(`${exports.RESOURCE_SCOPES.CANARY}:read`),
        write: requireWriteAccess(exports.RESOURCE_SCOPES.CANARY),
        admin: requireAdminAccess(exports.RESOURCE_SCOPES.CANARY),
        method: requireMethodScopes(exports.RESOURCE_SCOPES.CANARY)
    },
    // Configuration management routes
    config: {
        read: requireScopes(`${exports.RESOURCE_SCOPES.CONFIG}:read`),
        write: requireWriteAccess(exports.RESOURCE_SCOPES.CONFIG),
        admin: requireAdminAccess(exports.RESOURCE_SCOPES.CONFIG),
        method: requireMethodScopes(exports.RESOURCE_SCOPES.CONFIG)
    },
    // Workspace management routes
    workspace: {
        read: requireScopes(`${exports.RESOURCE_SCOPES.WORKSPACE}:read`),
        write: requireWriteAccess(exports.RESOURCE_SCOPES.WORKSPACE),
        admin: requireAdminAccess(exports.RESOURCE_SCOPES.WORKSPACE),
        method: requireMethodScopes(exports.RESOURCE_SCOPES.WORKSPACE)
    }
};
//# sourceMappingURL=auth-middleware.js.map