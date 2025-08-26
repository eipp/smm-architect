import { VaultClientConfig } from './vault-client';
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
export declare class AuthenticationService {
    private vaultClient;
    private jwtSecret;
    private jwtIssuer;
    private jwtAudience;
    constructor(vaultConfig: VaultClientConfig, jwtConfig: {
        secret: string;
        issuer: string;
        audience: string;
    });
    initialize(): Promise<void>;
    validateToken(token: string): Promise<AuthContext>;
    createUserToken(options: CreateUserTokenOptions): Promise<string>;
    createServiceToken(options: CreateServiceTokenOptions): Promise<string>;
    createAgentToken(options: CreateAgentTokenOptions): Promise<string>;
    revokeToken(token: string): Promise<void>;
    refreshToken(token: string): Promise<string>;
    listWorkspaceTokens(workspaceId: string): Promise<Array<{
        accessor: string;
        displayName: string;
        tokenType: string;
        createdAt: string;
        ttl: number;
        metadata: Record<string, string>;
    }>>;
    validateWorkspaceAccess(authContext: AuthContext, requiredWorkspaceId: string): Promise<boolean>;
    getHealthStatus(): Promise<{
        vault: {
            connected: boolean;
            sealed: boolean;
            version: string;
        };
        jwt: {
            algorithm: string;
            issuer: string;
        };
    }>;
    private validateVaultToken;
    private validateJWTToken;
    private blacklistJWTToken;
    private generateAgentPolicies;
    private policiesToScopes;
    private policiesToRoles;
    private parseTTL;
    private ensureAuthPoliciesExist;
}
//# sourceMappingURL=auth-service.d.ts.map