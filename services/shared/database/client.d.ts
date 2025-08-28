import { PrismaClient } from './generated/client';
/**
 * Initialize Prisma client with connection pooling and logging
 */
export declare function createPrismaClient(): PrismaClient;
/**
 * Close database connections gracefully
 */
export declare function closePrismaClient(): Promise<void>;
/**
 * Health check for database connectivity
 */
export declare function checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
}>;
/**
 * Set tenant context for Row Level Security (RLS)
 * This MUST be called before any database operations to ensure tenant isolation
 */
export declare function setTenantContext(client: PrismaClient, tenantId: string): Promise<void>;
/**
 * Clear tenant context (for system operations)
 */
export declare function clearTenantContext(client: PrismaClient): Promise<void>;
/**
 * Get current tenant context
 */
export declare function getCurrentTenantContext(client: PrismaClient): Promise<string | null>;
/**
 * Transaction helper with retry logic and tenant context
 * Uses LOCAL tenant context scoping within transactions
 */
export declare function withRetryTransaction<T>(operation: (client: PrismaClient) => Promise<T>, maxRetries?: number, tenantId?: string): Promise<T>;
/**
 * Initialize database connection with migration check
 */
export declare function initializeDatabase(): Promise<void>;
/**
 * Execute operation with tenant context set within a transaction
 * This ensures tenant context is LOCAL to the transaction and automatically cleaned up
 */
export declare function withTenantContext<T>(tenantId: string, operation: (client: PrismaClient) => Promise<T>): Promise<T>;
/**
 * Execute system operation without tenant context (admin/migration use)
 * WARNING: This bypasses RLS - use only for admin operations
 */
export declare function withSystemContext<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T>;
/**
 * Validate RLS is properly configured
 */
export declare function validateRLSConfiguration(): Promise<{
    isConfigured: boolean;
    tables: Array<{
        tableName: string;
        rlsEnabled: boolean;
        policyCount: number;
    }>;
    errors?: string[];
}>;
/**
 * Get a secured database client with tenant context validation
 * This is the preferred way to access the database in most cases
 */
export declare function getSecuredPrismaClient(): PrismaClient;
/**
 * Middleware helper to validate tenant context before database operations
 * Can be used in Express middleware or other validation scenarios
 */
export declare function validateCurrentTenantContext(): Promise<{
    isValid: boolean;
    tenantId?: string;
    error?: string;
}>;
/**
 * Strict validation that throws on invalid tenant context
 * Use this in critical security checkpoints
 */
export declare function requireValidTenantContext(): Promise<string>;
export default getPrismaClient;
//# sourceMappingURL=client.d.ts.map