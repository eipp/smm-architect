"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultClient = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
class VaultClient {
    client;
    config;
    currentToken;
    tokenExpiry;
    constructor(config) {
        this.config = {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            skipTlsVerify: false,
            ...config
        };
        // Create HTTPS agent with TLS configuration
        const httpsAgent = new https_1.default.Agent({
            rejectUnauthorized: !this.config.skipTlsVerify,
            ca: this.config.caCert,
            cert: this.config.clientCert,
            key: this.config.clientKey
        });
        this.client = axios_1.default.create({
            baseURL: this.config.address.replace(/\/$/, ''),
            timeout: this.config.timeout ?? 30000,
            httpsAgent,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Add request interceptor for authentication
        this.client.interceptors.request.use((config) => this.requestInterceptor(config), (error) => Promise.reject(error));
        // Add response interceptor for error handling and retries
        this.client.interceptors.response.use(response => response, this.responseErrorInterceptor.bind(this));
        this.currentToken = this.config.token ?? undefined;
    }
    /**
     * Initialize the client by authenticating with Vault
     */
    async initialize() {
        if (this.config.token) {
            // Validate existing token
            try {
                await this.lookupSelf();
                console.log('✓ Vault client initialized with provided token');
                return;
            }
            catch (error) {
                console.warn('Provided token is invalid, attempting alternative authentication');
            }
        }
        // Try alternative authentication methods
        if (this.config.roleId && this.config.secretId) {
            await this.authenticateAppRole();
        }
        else if (this.config.k8sServiceAccount && this.config.k8sRole) {
            await this.authenticateKubernetes();
        }
        else {
            throw new Error('No valid authentication method configured');
        }
        console.log('✓ Vault client initialized and authenticated');
    }
    /**
     * Authenticate using AppRole method
     */
    async authenticateAppRole() {
        try {
            const response = await this.client.post('/v1/auth/approle/login', {
                role_id: this.config.roleId,
                secret_id: this.config.secretId
            });
            const auth = response.data.auth;
            this.currentToken = auth.client_token;
            this.tokenExpiry = new Date(Date.now() + (auth.lease_duration * 1000));
            console.log('✓ Authenticated with AppRole');
            return auth;
        }
        catch (error) {
            throw new Error(`AppRole authentication failed: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Authenticate using Kubernetes service account
     */
    async authenticateKubernetes() {
        try {
            // Read service account token
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const serviceAccountToken = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
            const response = await this.client.post('/v1/auth/kubernetes/login', {
                role: this.config.k8sRole,
                jwt: serviceAccountToken
            });
            const auth = response.data.auth;
            this.currentToken = auth.client_token;
            this.tokenExpiry = new Date(Date.now() + (auth.lease_duration * 1000));
            console.log('✓ Authenticated with Kubernetes service account');
            return auth;
        }
        catch (error) {
            throw new Error(`Kubernetes authentication failed: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Read secret from KV v2 store
     */
    async readKVSecret(path, version) {
        try {
            const url = version
                ? `/v1/secret/data/${path}?version=${version}`
                : `/v1/secret/data/${path}`;
            const response = await this.client.get(url);
            return response.data.data?.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw new Error(`Failed to read secret ${path}: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Write secret to KV v2 store
     */
    async writeKVSecret(path, data, options) {
        try {
            const payload = { data };
            if (options?.cas !== undefined) {
                payload.options = { cas: options.cas };
            }
            if (options?.deleteVersionAfter) {
                payload.options = {
                    ...payload.options,
                    delete_version_after: options.deleteVersionAfter
                };
            }
            await this.client.post(`/v1/secret/data/${path}`, payload);
        }
        catch (error) {
            throw new Error(`Failed to write secret ${path}: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Delete secret from KV v2 store
     */
    async deleteKVSecret(path, versions) {
        try {
            if (versions && versions.length > 0) {
                // Delete specific versions
                await this.client.post(`/v1/secret/delete/${path}`, {
                    versions
                });
            }
            else {
                // Delete latest version
                await this.client.delete(`/v1/secret/data/${path}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to delete secret ${path}: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Create a new token
     */
    async createToken(options) {
        try {
            const payload = {};
            if (options.policies)
                payload.policies = options.policies;
            if (options.ttl)
                payload.ttl = options.ttl;
            if (options.renewable !== undefined)
                payload.renewable = options.renewable;
            if (options.explicitMaxTtl)
                payload.explicit_max_ttl = options.explicitMaxTtl;
            if (options.displayName)
                payload.display_name = options.displayName;
            if (options.metadata)
                payload.meta = options.metadata;
            if (options.numUses)
                payload.num_uses = options.numUses;
            const response = await this.client.post('/v1/auth/token/create', payload);
            return response.data.auth;
        }
        catch (error) {
            throw new Error(`Failed to create token: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Revoke a token
     */
    async revokeToken(token) {
        try {
            await this.client.post('/v1/auth/token/revoke', { token });
        }
        catch (error) {
            throw new Error(`Failed to revoke token: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Lookup token information
     */
    async lookupToken(token) {
        try {
            const response = await this.client.post('/v1/auth/token/lookup', { token });
            return response.data.data;
        }
        catch (error) {
            throw new Error(`Failed to lookup token: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Lookup current token information
     */
    async lookupSelf() {
        try {
            const response = await this.client.get('/v1/auth/token/lookup-self');
            return response.data.data;
        }
        catch (error) {
            throw new Error(`Failed to lookup self: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Renew current token
     */
    async renewSelf(increment) {
        try {
            const payload = increment ? { increment } : {};
            const response = await this.client.post('/v1/auth/token/renew-self', payload);
            // Update token expiry
            const auth = response.data.auth;
            this.tokenExpiry = new Date(Date.now() + (auth.lease_duration * 1000));
            return auth;
        }
        catch (error) {
            throw new Error(`Failed to renew token: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * List token accessors
     */
    async listTokenAccessors() {
        try {
            const response = await this.client.request({
                method: 'LIST',
                url: '/v1/auth/token/accessors'
            });
            return response.data.data?.keys || [];
        }
        catch (error) {
            throw new Error(`Failed to list token accessors: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Create or update policy
     */
    async writePolicy(name, policy) {
        try {
            await this.client.put(`/v1/sys/policies/acl/${name}`, { policy });
        }
        catch (error) {
            throw new Error(`Failed to write policy ${name}: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Read policy
     */
    async readPolicy(name) {
        try {
            const response = await this.client.get(`/v1/sys/policies/acl/${name}`);
            return response.data.data?.policy || response.data.policy;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw new Error(`Failed to read policy ${name}: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Encrypt data using Transit engine
     */
    async encrypt(keyName, plaintext, context) {
        try {
            const payload = {
                plaintext: Buffer.from(plaintext).toString('base64')
            };
            if (context) {
                payload.context = Buffer.from(context).toString('base64');
            }
            const response = await this.client.post(`/v1/transit/encrypt/${keyName}`, payload);
            return response.data.data.ciphertext;
        }
        catch (error) {
            throw new Error(`Failed to encrypt with key ${keyName}: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Decrypt data using Transit engine
     */
    async decrypt(keyName, ciphertext, context) {
        try {
            const payload = { ciphertext };
            if (context) {
                payload.context = Buffer.from(context).toString('base64');
            }
            const response = await this.client.post(`/v1/transit/decrypt/${keyName}`, payload);
            return Buffer.from(response.data.data.plaintext, 'base64').toString();
        }
        catch (error) {
            throw new Error(`Failed to decrypt with key ${keyName}: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Get Vault health status
     */
    async getHealth() {
        try {
            const response = await this.client.get('/v1/sys/health');
            return {
                initialized: response.data.initialized,
                sealed: response.data.sealed,
                standby: response.data.standby,
                serverTimeUtc: response.data.server_time_utc,
                version: response.data.version
            };
        }
        catch (error) {
            throw new Error(`Failed to get health status: ${this.extractErrorMessage(error)}`);
        }
    }
    /**
     * Check if client is authenticated and token is valid
     */
    async isAuthenticated() {
        try {
            await this.lookupSelf();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if token needs renewal (expires within 5 minutes)
     */
    shouldRenewToken() {
        if (!this.tokenExpiry)
            return false;
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        return this.tokenExpiry <= fiveMinutesFromNow;
    }
    // Private helper methods
    async requestInterceptor(config) {
        // Add namespace header if configured
        if (this.config.namespace) {
            config.headers = {
                ...config.headers,
                'X-Vault-Namespace': this.config.namespace
            };
        }
        // Add authentication token
        if (this.currentToken) {
            config.headers = {
                ...config.headers,
                'X-Vault-Token': this.currentToken
            };
        }
        return config;
    }
    async responseErrorInterceptor(error) {
        const config = error.config;
        // Don't retry if we've already retried too many times
        if (config.__retryCount >= (this.config.retries || 3)) {
            return Promise.reject(error);
        }
        config.__retryCount = config.__retryCount || 0;
        // Retry on specific error conditions
        const shouldRetry = this.shouldRetryRequest(error);
        if (shouldRetry) {
            config.__retryCount++;
            // Exponential backoff
            const delay = this.config.retryDelay * Math.pow(2, config.__retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(config);
        }
        return Promise.reject(error);
    }
    shouldRetryRequest(error) {
        // Retry on network errors
        if (!error.response)
            return true;
        const status = error.response.status;
        // Retry on server errors (5xx) but not client errors (4xx)
        return status >= 500 && status <= 599;
    }
    extractErrorMessage(error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.response?.data?.errors) {
                return error.response.data.errors.join(', ');
            }
            if (error.response?.data?.error) {
                return error.response.data.error;
            }
            return error.message;
        }
        return error instanceof Error ? error.message : String(error);
    }
}
exports.VaultClient = VaultClient;
//# sourceMappingURL=vault-client.js.map