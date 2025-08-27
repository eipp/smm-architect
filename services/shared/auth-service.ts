import { VaultClient, VaultClientConfig } from './vault-client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface AuthContext {
  userId: string;
  workspaceId: string;
  scopes: string[];
  tokenType: 'user' | 'service' | 'agent';
  roles: string[];
  sessionId?: string;
  expiresAt?: Date;
}

export interface CreateUserTokenOptions {
  userId: string;
  workspaceId: string;
  scopes: string[];
  roles: string[];
  ttl?: string;
  sessionId?: string;
}

export interface CreateServiceTokenOptions {
  serviceId: string;
  workspaceId?: string;
  policies: string[];
  ttl?: string;
  metadata?: Record<string, string>;
}

export interface CreateAgentTokenOptions {
  agentType: string;
  workspaceId: string;
  agentInstanceId?: string;
  ttl?: string;
  executionId?: string;
}

export class AuthenticationService {
  private vaultClient: VaultClient;
  private jwtSecret: string;
  private jwtIssuer: string;
  private jwtAudience: string;

  constructor(
    vaultConfig: VaultClientConfig,
    jwtConfig: {
      secret: string;
      issuer: string;
      audience: string;
    }
  ) {
    this.vaultClient = new VaultClient(vaultConfig);
    this.jwtSecret = jwtConfig.secret;
    this.jwtIssuer = jwtConfig.issuer;
    this.jwtAudience = jwtConfig.audience;
  }

  /**
   * Initialize the authentication service
   */
  async initialize(): Promise<void> {
    await this.vaultClient.initialize();
    await this.ensureAuthPoliciesExist();
    console.log('✓ Authentication service initialized');
  }

  /**
   * Validate an authentication token (JWT or Vault token)
   */
  async validateToken(token: string): Promise<AuthContext> {
    // Determine token type
    if (token.startsWith('hvs.') || token.startsWith('s.')) {
      // Vault token
      return this.validateVaultToken(token);
    } else {
      // Assume JWT token
      return this.validateJWTToken(token);
    }
  }

  /**
   * Create a JWT token for user authentication
   */
  async createUserToken(options: CreateUserTokenOptions): Promise<string> {
    const payload = {
      sub: options.userId,
      aud: this.jwtAudience,
      iss: this.jwtIssuer,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseTTL(options.ttl || '24h'),
      workspaceId: options.workspaceId,
      scopes: options.scopes,
      roles: options.roles,
      tokenType: 'user',
      sessionId: options.sessionId || crypto.randomUUID()
    };

    return jwt.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Create a Vault service token
   */
  async createServiceToken(options: CreateServiceTokenOptions): Promise<string> {
    try {
      const displayName = `service-${options.serviceId}`;
      const metadata: Record<string, any> = {
        service_id: options.serviceId,
        token_type: 'service',
        created_at: new Date().toISOString(),
        ...options.metadata
      };

      if (options.workspaceId) {
        metadata.workspace_id = options.workspaceId;
      }

      const auth = await this.vaultClient.createToken({
        policies: options.policies,
        ttl: options.ttl || '24h',
        renewable: true,
        displayName,
        metadata
      });

      console.log(`✓ Created service token for ${options.serviceId}`);
      return auth.client_token;
    } catch (error) {
      throw new Error(`Failed to create service token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a Vault agent token with execution context
   */
  async createAgentToken(options: CreateAgentTokenOptions): Promise<string> {
    try {
      const policies = this.generateAgentPolicies(options.agentType, options.workspaceId);
      const displayName = `agent-${options.agentType}-${options.workspaceId.substring(0, 8)}`;
      const metadata: Record<string, any> = {
        agent_type: options.agentType,
        workspace_id: options.workspaceId,
        token_type: 'agent',
        created_at: new Date().toISOString()
      };

      if (options.agentInstanceId) {
        metadata.agent_instance_id = options.agentInstanceId;
      }

      if (options.executionId) {
        metadata.execution_id = options.executionId;
      }

      const auth = await this.vaultClient.createToken({
        policies,
        ttl: options.ttl || '2h',
        renewable: false,
        explicitMaxTtl: '4h',
        displayName,
        metadata
      });

      console.log(`✓ Created agent token for ${options.agentType} in workspace ${options.workspaceId}`);
      return auth.client_token;
    } catch (error) {
      throw new Error(`Failed to create agent token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Revoke a token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      if (token.startsWith('hvs.') || token.startsWith('s.')) {
        // Vault token
        await this.vaultClient.revokeToken(token);
      } else {
        // JWT token - add to blacklist (implementation depends on your blacklist strategy)
        await this.blacklistJWTToken(token);
      }
    } catch (error) {
      throw new Error(`Failed to revoke token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Refresh a token (extend its lifetime)
   */
  async refreshToken(token: string): Promise<string> {
    if (token.startsWith('hvs.') || token.startsWith('s.')) {
      // Vault token - renew it
      try {
        // First validate the token to get its info
        const tokenInfo = await this.vaultClient.lookupToken(token);
        
        if (!tokenInfo.renewable) {
          throw new Error('Token is not renewable');
        }

        // Renew the token (this requires switching to the token temporarily)
        const currentToken = this.vaultClient['currentToken'];
        this.vaultClient['currentToken'] = token;
        
        try {
          await this.vaultClient.renewSelf();
          return token; // Same token, but with extended lifetime
        } finally {
          this.vaultClient['currentToken'] = currentToken;
        }
      } catch (error) {
        throw new Error(`Failed to refresh Vault token: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // JWT token - decode and create new one
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        
        // Create new token with same data but extended expiry
        const newPayload = {
          ...decoded,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };

        return jwt.sign(newPayload, this.jwtSecret, { algorithm: 'HS256' });
      } catch (error) {
        throw new Error(`Failed to refresh JWT token: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * List active tokens for a workspace
   */
  async listWorkspaceTokens(workspaceId: string): Promise<Array<{
    accessor: string;
    displayName: string;
    tokenType: string;
    createdAt: string;
    ttl: number;
    metadata: Record<string, string>;
  }>> {
    try {
      const accessors = await this.vaultClient.listTokenAccessors();
      const tokens = [];

      for (const accessor of accessors) {
        try {
          // This would require enhanced Vault client method to lookup by accessor
          // Using simplified authentication for development environment
          const info = await this.vaultClient.lookupToken(accessor);
          
          if (info.meta?.workspace_id === workspaceId) {
            tokens.push({
              accessor,
              displayName: info.display_name,
              tokenType: info.meta.token_type || 'unknown',
              createdAt: info.creation_time,
              ttl: info.ttl,
              metadata: info.meta
            });
          }
        } catch {
          // Skip tokens we can't lookup
          continue;
        }
      }

      return tokens;
    } catch (error) {
      throw new Error(`Failed to list workspace tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate workspace access for a user/token
   */
  async validateWorkspaceAccess(authContext: AuthContext, requiredWorkspaceId: string): Promise<boolean> {
    // Admin users have access to all workspaces
    if (authContext.roles.includes('admin') || authContext.scopes.includes('admin')) {
      return true;
    }

    // Check if user has access to specific workspace
    if (authContext.workspaceId === requiredWorkspaceId) {
      return true;
    }

    // Check if user has cross-workspace access
    if (authContext.scopes.includes('workspace:*')) {
      return true;
    }

    return false;
  }

  /**
   * Get authentication health status
   */
  async getHealthStatus(): Promise<{
    vault: {
      connected: boolean;
      sealed: boolean;
      version: string;
    };
    jwt: {
      algorithm: string;
      issuer: string;
    };
  }> {
    try {
      const vaultHealth = await this.vaultClient.getHealth();
      
      return {
        vault: {
          connected: true,
          sealed: vaultHealth.sealed,
          version: vaultHealth.version
        },
        jwt: {
          algorithm: 'HS256',
          issuer: this.jwtIssuer
        }
      };
    } catch (error) {
      return {
        vault: {
          connected: false,
          sealed: true,
          version: 'unknown'
        },
        jwt: {
          algorithm: 'HS256',
          issuer: this.jwtIssuer
        }
      };
    }
  }

  // Private helper methods

  private async validateVaultToken(token: string): Promise<AuthContext> {
    try {
      const tokenInfo = await this.vaultClient.lookupToken(token);
      
      // Extract context from token metadata and policies
      const metadata = tokenInfo.meta || {};
      const tokenType = metadata.token_type as 'user' | 'service' | 'agent' || 'service';
      
      return {
        userId: metadata.user_id || metadata.service_id || metadata.agent_type || 'vault-token',
        workspaceId: metadata.workspace_id || 'default',
        scopes: this.policiesToScopes(tokenInfo.policies),
        tokenType,
        roles: this.policiesToRoles(tokenInfo.policies),
        expiresAt: tokenInfo.ttl > 0 ? new Date(Date.now() + tokenInfo.ttl * 1000) : undefined
      };
    } catch (error) {
      throw new Error(`Vault token validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateJWTToken(token: string): Promise<AuthContext> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience
      }) as any;

      return {
        userId: decoded.sub,
        workspaceId: decoded.workspaceId,
        scopes: decoded.scopes || [],
        tokenType: decoded.tokenType || 'user',
        roles: decoded.roles || [],
        sessionId: decoded.sessionId,
        expiresAt: new Date(decoded.exp * 1000)
      };
    } catch (error) {
      throw new Error(`JWT token validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async blacklistJWTToken(token: string): Promise<void> {
    // Implementation depends on your blacklist strategy
    // Could store in Redis, database, or Vault itself
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.jti) {
        // Store token ID in blacklist with expiry
        await this.vaultClient.writeKVSecret(`auth/blacklist/${decoded.jti}`, {
          revoked_at: new Date().toISOString(),
          reason: 'manually_revoked'
        });
      }
    } catch (error) {
      console.error('Failed to blacklist JWT token:', error instanceof Error ? error.message : String(error));
    }
  }

  private generateAgentPolicies(agentType: string, workspaceId: string): string[] {
    return [
      'default',
      `agent-${agentType}`,
      `workspace-${workspaceId}`,
      'toolhub-access'
    ];
  }

  private policiesToScopes(policies: string[]): string[] {
    const scopeMap: Record<string, string[]> = {
      'admin': ['admin'],
      'workspace-admin': ['workspace:*'],
      'toolhub-access': ['ingest:read', 'ingest:write', 'vector:read', 'vector:write'],
      'agent-research': ['ingest:read', 'vector:read', 'vector:write'],
      'agent-planner': ['vector:read', 'simulate:read', 'simulate:execute'],
      'agent-creative': ['vector:read', 'render:read', 'render:execute'],
      'agent-publisher': ['oauth:read', 'oauth:write', 'render:read']
    };

    const scopes = new Set<string>();
    for (const policy of policies) {
      const policyScopes = scopeMap[policy] || [];
      policyScopes.forEach(scope => scopes.add(scope));
    }

    return Array.from(scopes);
  }

  private policiesToRoles(policies: string[]): string[] {
    const roles = [];
    
    if (policies.includes('admin')) roles.push('admin');
    if (policies.some(p => p.includes('workspace-admin'))) roles.push('workspace-admin');
    if (policies.some(p => p.includes('agent-'))) roles.push('agent');
    if (policies.includes('toolhub-access')) roles.push('service');
    
    return roles;
  }

  private parseTTL(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match || !match[1]) throw new Error(`Invalid TTL format: ${ttl}`);
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: throw new Error(`Invalid TTL unit: ${unit}`);
    }
  }

  private async ensureAuthPoliciesExist(): Promise<void> {
    const policies = [
      {
        name: 'toolhub-access',
        policy: `
# ToolHub service access policy
path "secret/data/workspaces/+/toolhub/*" {
  capabilities = ["read"]
}

path "transit/encrypt/toolhub-*" {
  capabilities = ["update"]
}

path "transit/decrypt/toolhub-*" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}
`
      },
      {
        name: 'agent-research',
        policy: `
# Research agent policy
path "secret/data/workspaces/+/agents/research/*" {
  capabilities = ["read"]
}

path "secret/data/workspaces/+/brand-twin/*" {
  capabilities = ["read", "create", "update"]
}

path "transit/encrypt/research-*" {
  capabilities = ["update"]
}

path "transit/decrypt/research-*" {
  capabilities = ["update"]
}
`
      }
    ];

    for (const { name, policy } of policies) {
      try {
        const existingPolicy = await this.vaultClient.readPolicy(name);
        if (!existingPolicy) {
          await this.vaultClient.writePolicy(name, policy);
          console.log(`✓ Created policy: ${name}`);
        }
      } catch (error) {
        console.error(`Failed to create policy ${name}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
}