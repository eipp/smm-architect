export interface VaultClientConfig {
    address: string;
    token?: string;
    namespace?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    caCert?: string;
    clientCert?: string;
    clientKey?: string;
    skipTlsVerify?: boolean;
    roleId?: string;
    secretId?: string;
    k8sServiceAccount?: string;
    k8sRole?: string;
}
export interface VaultSecretResponse {
    data: {
        data?: any;
        metadata?: any;
    };
    lease_id?: string;
    lease_duration?: number;
    renewable?: boolean;
}
export interface VaultTokenInfo {
    accessor: string;
    creation_time: string;
    creation_ttl: number;
    display_name: string;
    entity_id: string;
    expire_time: string;
    explicit_max_ttl: number;
    id: string;
    issue_time: string;
    meta: Record<string, string>;
    num_uses: number;
    orphan: boolean;
    path: string;
    policies: string[];
    renewable: boolean;
    ttl: number;
    type: string;
}
export interface VaultAuthResponse {
    client_token: string;
    accessor: string;
    policies: string[];
    token_policies: string[];
    metadata: Record<string, string>;
    lease_duration: number;
    renewable: boolean;
}
export declare class VaultClient {
    private client;
    private config;
    private currentToken?;
    private tokenExpiry?;
    constructor(config: VaultClientConfig);
    /**
     * Initialize the client by authenticating with Vault
     */
    initialize(): Promise<void>;
    /**
     * Authenticate using AppRole method
     */
    authenticateAppRole(): Promise<VaultAuthResponse>;
    /**
     * Authenticate using Kubernetes service account
     */
    authenticateKubernetes(): Promise<VaultAuthResponse>;
    /**
     * Read secret from KV v2 store
     */
    readKVSecret(path: string, version?: number): Promise<any>;
    /**
     * Write secret to KV v2 store
     */
    writeKVSecret(path: string, data: Record<string, any>, options?: {
        cas?: number;
        deleteVersionAfter?: string;
    }): Promise<void>;
    /**
     * Delete secret from KV v2 store
     */
    deleteKVSecret(path: string, versions?: number[]): Promise<void>;
    /**
     * Create a new token
     */
    createToken(options: {
        policies?: string[];
        ttl?: string;
        renewable?: boolean;
        explicitMaxTtl?: string;
        displayName?: string;
        metadata?: Record<string, string>;
        numUses?: number;
    }): Promise<VaultAuthResponse>;
    /**
     * Revoke a token
     */
    revokeToken(token: string): Promise<void>;
    /**
     * Lookup token information
     */
    lookupToken(token: string): Promise<VaultTokenInfo>;
    /**
     * Lookup current token information
     */
    lookupSelf(): Promise<VaultTokenInfo>;
    /**
     * Renew current token
     */
    renewSelf(increment?: string): Promise<VaultAuthResponse>;
    /**
     * List token accessors
     */
    listTokenAccessors(): Promise<string[]>;
    /**
     * Create or update policy
     */
    writePolicy(name: string, policy: string): Promise<void>;
    /**
     * Read policy
     */
    readPolicy(name: string): Promise<string | null>;
    /**
     * Encrypt data using Transit engine
     */
    encrypt(keyName: string, plaintext: string, context?: string): Promise<string>;
    /**
     * Decrypt data using Transit engine
     */
    decrypt(keyName: string, ciphertext: string, context?: string): Promise<string>;
    /**
     * Get Vault health status
     */
    getHealth(): Promise<{
        initialized: boolean;
        sealed: boolean;
        standby: boolean;
        serverTimeUtc: number;
        version: string;
    }>;
    /**
     * Check if client is authenticated and token is valid
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Check if token needs renewal (expires within 5 minutes)
     */
    shouldRenewToken(): boolean;
    private requestInterceptor;
    private responseErrorInterceptor;
    private shouldRetryRequest;
    private extractErrorMessage;
}
//# sourceMappingURL=vault-client.d.ts.map