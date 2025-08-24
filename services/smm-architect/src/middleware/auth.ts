import { Header } from "encore.dev/api";
import log from "encore.dev/log";

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
    
    log.info("User authenticated", { 
      userId: authContext.userId, 
      tenantId: authContext.tenantId 
    });

    return authContext;

  } catch (error) {
    log.error("Authentication failed", { error: error.message });
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

async function validateToken(token: string): Promise<AuthContext> {
  // Check if it's a Vault token
  if (token.startsWith("vault:")) {
    return await validateVaultToken(token);
  }

  // Check if it's a JWT token
  if (token.includes(".")) {
    return await validateJWTToken(token);
  }

  throw new Error("Unrecognized token format");
}

async function validateVaultToken(token: string): Promise<AuthContext> {
  // Parse vault token format: vault:<token>
  const vaultToken = token.substring(6); // Remove "vault:" prefix

  // In real implementation, would validate with Vault API
  // For now, mock validation
  
  if (vaultToken.length < 20) {
    throw new Error("Invalid Vault token format");
  }

  // Mock: decode basic info from token (in real implementation would call Vault)
  const mockPayload = {
    userId: "vault-service-account",
    tenantId: "system",
    roles: ["workspace-operator"],
    scopes: ["workspace:read", "workspace:write", "simulate", "audit"]
  };

  return mockPayload;
}

async function validateJWTToken(token: string): Promise<AuthContext> {
  try {
    // In real implementation, would verify JWT signature and decode payload
    // For now, mock validation
    
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Mock decode payload (in real implementation would verify signature first)
    const mockPayload = {
      userId: "user:alice@example.com",
      tenantId: "tenant-example",
      roles: ["workspace-admin"],
      scopes: ["workspace:*", "audit:read"]
    };

    return mockPayload;

  } catch (error) {
    throw new Error(`JWT validation failed: ${error.message}`);
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