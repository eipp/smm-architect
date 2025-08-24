import { Header } from "encore.dev/api";
import log from "encore.dev/log";
import { AuthenticationService } from '../../../shared/auth-service';
import { VaultClient } from '../../../shared/vault-client';
import { setTenantContext, getPrismaClient } from '../../../shared/database/client';

// Initialize authentication service
const authService = new AuthenticationService(
  {
    address: process.env.VAULT_ADDR || 'http://localhost:8200',
    token: process.env.VAULT_TOKEN
  },
  {
    secret: process.env.JWT_SECRET || 'dev-secret',
    issuer: 'smm-architect',
    audience: 'smm-architect'
  }
);

// Initialize once
let authServiceInitialized = false;
const initAuthService = async () => {
  if (!authServiceInitialized) {
    await authService.initialize();
    authServiceInitialized = true;
  }
};

export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
  scopes: string[];
}

export async function authMiddleware(
  authorization: Header<"authorization">
): Promise<AuthContext> {
  if (!authorization) {
    throw new Error("Authorization header is required");
  }

  try {
    // Parse the authorization header
    const [scheme, token] = authorization.split(" ");
    
    if (scheme !== "Bearer") {
      throw new Error("Invalid authorization scheme. Expected 'Bearer'");
    }

    if (!token) {
      throw new Error("Authorization token is required");
    }

    // Validate the token
    const authContext = await validateToken(token);
    
    // CRITICAL: Set tenant context for RLS immediately after authentication
    await setTenantContextForRequest(authContext.tenantId);
    
    log.info("User authenticated and tenant context set", { 
      userId: authContext.userId, 
      tenantId: authContext.tenantId 
    });

    return authContext;

  } catch (error) {
    log.error("Authentication failed", { error: error.message });
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Set tenant context for the current request
 * This ensures all database operations are properly isolated to the tenant
 */
async function setTenantContextForRequest(tenantId: string): Promise<void> {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('Valid tenant ID is required for database operations');
  }

  try {
    const client = getPrismaClient();
    await setTenantContext(client, tenantId);
    
    log.debug('Tenant context set for request', { tenantId });
  } catch (error) {
    log.error('Failed to set tenant context for request', {
      tenantId,
      error: error instanceof Error ? error.message : error
    });
    throw new Error(`Critical security error: Failed to set tenant context for ${tenantId}`);
  }
}

async function validateToken(token: string): Promise<AuthContext> {
  // Ensure auth service is initialized
  await initAuthService();

  try {
    // Use real authentication service for validation
    const authContext = await authService.validateToken(token);
    return authContext;
  } catch (error) {
    throw new Error(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function checkScope(requiredScope: string, userScopes: string[]): boolean {
  // Check for exact match
  if (userScopes.includes(requiredScope)) {
    return true;
  }

  // Check for wildcard matches
  const [resource, action] = requiredScope.split(":");
  const wildcardScope = `${resource}:*`;
  
  if (userScopes.includes(wildcardScope)) {
    return true;
  }

  // Check for admin wildcard
  if (userScopes.includes("*")) {
    return true;
  }

  return false;
}

export function checkRole(requiredRole: string, userRoles: string[]): boolean {
  return userRoles.includes(requiredRole) || userRoles.includes("admin");
}

export function requireScope(scope: string) {
  return function(authContext: AuthContext) {
    if (!checkScope(scope, authContext.scopes)) {
      throw new Error(`Insufficient permissions. Required scope: ${scope}`);
    }
  };
}

export function requireRole(role: string) {
  return function(authContext: AuthContext) {
    if (!checkRole(role, authContext.roles)) {
      throw new Error(`Insufficient permissions. Required role: ${role}`);
    }
  };
}

export function requireTenant(tenantId: string) {
  return function(authContext: AuthContext) {
    if (authContext.tenantId !== tenantId && authContext.tenantId !== "system") {
      throw new Error(`Access denied. Required tenant: ${tenantId}`);
    }
  };
}