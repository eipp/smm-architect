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
    initialize(): Promise<void>;
    authenticateAppRole(): Promise<VaultAuthResponse>;
    authenticateKubernetes(): Promise<VaultAuthResponse>;
    readKVSecret(path: string, version?: number): Promise<any>;
    writeKVSecret(path: string, data: Record<string, any>, options?: {
        cas?: number;
        deleteVersionAfter?: string;
    }): Promise<void>;
    deleteKVSecret(path: string, versions?: number[]): Promise<void>;
    createToken(options: {
        policies?: string[];
        ttl?: string;
        renewable?: boolean;
        explicitMaxTtl?: string;
        displayName?: string;
        metadata?: Record<string, string>;
        numUses?: number;
    }): Promise<VaultAuthResponse>;
    revokeToken(token: string): Promise<void>;
    lookupToken(token: string): Promise<VaultTokenInfo>;
    lookupSelf(): Promise<VaultTokenInfo>;
    renewSelf(increment?: string): Promise<VaultAuthResponse>;
    listTokenAccessors(): Promise<string[]>;
    writePolicy(name: string, policy: string): Promise<void>;
    readPolicy(name: string): Promise<string | null>;
    encrypt(keyName: string, plaintext: string, context?: string): Promise<string>;
    decrypt(keyName: string, ciphertext: string, context?: string): Promise<string>;
    getHealth(): Promise<{
        initialized: boolean;
        sealed: boolean;
        standby: boolean;
        serverTimeUtc: number;
        version: string;
    }>;
    isAuthenticated(): Promise<boolean>;
    shouldRenewToken(): boolean;
    private requestInterceptor;
    private responseErrorInterceptor;
    private shouldRetryRequest;
    private extractErrorMessage;
}
//# sourceMappingURL=vault-client.d.ts.map