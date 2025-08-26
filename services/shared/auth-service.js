"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const vault_client_1 = require("./vault-client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
class AuthenticationService {
    constructor(vaultConfig, jwtConfig) {
        this.vaultClient = new vault_client_1.VaultClient(vaultConfig);
        this.jwtSecret = jwtConfig.secret;
        this.jwtIssuer = jwtConfig.issuer;
        this.jwtAudience = jwtConfig.audience;
    }
    async initialize() {
        await this.vaultClient.initialize();
        await this.ensureAuthPoliciesExist();
        console.log('✓ Authentication service initialized');
    }
    async validateToken(token) {
        if (token.startsWith('hvs.') || token.startsWith('s.')) {
            return this.validateVaultToken(token);
        }
        else {
            return this.validateJWTToken(token);
        }
    }
    async createUserToken(options) {
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
            sessionId: options.sessionId || crypto_1.default.randomUUID()
        };
        return jsonwebtoken_1.default.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
    }
    async createServiceToken(options) {
        try {
            const displayName = `service-${options.serviceId}`;
            const metadata = {
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
        }
        catch (error) {
            throw new Error(`Failed to create service token: ${error.message}`);
        }
    }
    async createAgentToken(options) {
        try {
            const policies = this.generateAgentPolicies(options.agentType, options.workspaceId);
            const displayName = `agent-${options.agentType}-${options.workspaceId.substring(0, 8)}`;
            const metadata = {
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
        }
        catch (error) {
            throw new Error(`Failed to create agent token: ${error.message}`);
        }
    }
    async revokeToken(token) {
        try {
            if (token.startsWith('hvs.') || token.startsWith('s.')) {
                await this.vaultClient.revokeToken(token);
            }
            else {
                await this.blacklistJWTToken(token);
            }
        }
        catch (error) {
            throw new Error(`Failed to revoke token: ${error.message}`);
        }
    }
    async refreshToken(token) {
        if (token.startsWith('hvs.') || token.startsWith('s.')) {
            try {
                const tokenInfo = await this.vaultClient.lookupToken(token);
                if (!tokenInfo.renewable) {
                    throw new Error('Token is not renewable');
                }
                const currentToken = this.vaultClient['currentToken'];
                this.vaultClient['currentToken'] = token;
                try {
                    await this.vaultClient.renewSelf();
                    return token;
                }
                finally {
                    this.vaultClient['currentToken'] = currentToken;
                }
            }
            catch (error) {
                throw new Error(`Failed to refresh Vault token: ${error.message}`);
            }
        }
        else {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
                const newPayload = {
                    ...decoded,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
                };
                return jsonwebtoken_1.default.sign(newPayload, this.jwtSecret, { algorithm: 'HS256' });
            }
            catch (error) {
                throw new Error(`Failed to refresh JWT token: ${error.message}`);
            }
        }
    }
    async listWorkspaceTokens(workspaceId) {
        try {
            const accessors = await this.vaultClient.listTokenAccessors();
            const tokens = [];
            for (const accessor of accessors) {
                try {
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
                }
                catch {
                    continue;
                }
            }
            return tokens;
        }
        catch (error) {
            throw new Error(`Failed to list workspace tokens: ${error.message}`);
        }
    }
    async validateWorkspaceAccess(authContext, requiredWorkspaceId) {
        if (authContext.roles.includes('admin') || authContext.scopes.includes('admin')) {
            return true;
        }
        if (authContext.workspaceId === requiredWorkspaceId) {
            return true;
        }
        if (authContext.scopes.includes('workspace:*')) {
            return true;
        }
        return false;
    }
    async getHealthStatus() {
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
        }
        catch (error) {
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
    async validateVaultToken(token) {
        try {
            const tokenInfo = await this.vaultClient.lookupToken(token);
            const metadata = tokenInfo.meta || {};
            const tokenType = metadata.token_type || 'service';
            return {
                userId: metadata.user_id || metadata.service_id || metadata.agent_type || 'vault-token',
                workspaceId: metadata.workspace_id || 'default',
                scopes: this.policiesToScopes(tokenInfo.policies),
                tokenType,
                roles: this.policiesToRoles(tokenInfo.policies),
                expiresAt: tokenInfo.ttl > 0 ? new Date(Date.now() + tokenInfo.ttl * 1000) : undefined
            };
        }
        catch (error) {
            throw new Error(`Vault token validation failed: ${error.message}`);
        }
    }
    async validateJWTToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret, {
                issuer: this.jwtIssuer,
                audience: this.jwtAudience
            });
            return {
                userId: decoded.sub,
                workspaceId: decoded.workspaceId,
                scopes: decoded.scopes || [],
                tokenType: decoded.tokenType || 'user',
                roles: decoded.roles || [],
                sessionId: decoded.sessionId,
                expiresAt: new Date(decoded.exp * 1000)
            };
        }
        catch (error) {
            throw new Error(`JWT token validation failed: ${error.message}`);
        }
    }
    async blacklistJWTToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded?.jti) {
                await this.vaultClient.writeKVSecret(`auth/blacklist/${decoded.jti}`, {
                    revoked_at: new Date().toISOString(),
                    reason: 'manually_revoked'
                });
            }
        }
        catch (error) {
            console.error('Failed to blacklist JWT token:', error.message);
        }
    }
    generateAgentPolicies(agentType, workspaceId) {
        return [
            'default',
            `agent-${agentType}`,
            `workspace-${workspaceId}`,
            'toolhub-access'
        ];
    }
    policiesToScopes(policies) {
        const scopeMap = {
            'admin': ['admin'],
            'workspace-admin': ['workspace:*'],
            'toolhub-access': ['ingest:read', 'ingest:write', 'vector:read', 'vector:write'],
            'agent-research': ['ingest:read', 'vector:read', 'vector:write'],
            'agent-planner': ['vector:read', 'simulate:read', 'simulate:execute'],
            'agent-creative': ['vector:read', 'render:read', 'render:execute'],
            'agent-publisher': ['oauth:read', 'oauth:write', 'render:read']
        };
        const scopes = new Set();
        for (const policy of policies) {
            const policyScopes = scopeMap[policy] || [];
            policyScopes.forEach(scope => scopes.add(scope));
        }
        return Array.from(scopes);
    }
    policiesToRoles(policies) {
        const roles = [];
        if (policies.includes('admin'))
            roles.push('admin');
        if (policies.some(p => p.includes('workspace-admin')))
            roles.push('workspace-admin');
        if (policies.some(p => p.includes('agent-')))
            roles.push('agent');
        if (policies.includes('toolhub-access'))
            roles.push('service');
        return roles;
    }
    parseTTL(ttl) {
        const match = ttl.match(/^(\d+)([smhd])$/);
        if (!match)
            throw new Error(`Invalid TTL format: ${ttl}`);
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
    async ensureAuthPoliciesExist() {
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
            }
            catch (error) {
                console.error(`Failed to create policy ${name}:`, error.message);
            }
        }
    }
}
exports.AuthenticationService = AuthenticationService;
//# sourceMappingURL=auth-service.js.map