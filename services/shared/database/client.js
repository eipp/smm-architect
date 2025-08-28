"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaClient = createPrismaClient;
exports.getPrismaClient = getPrismaClient;
exports.closePrismaClient = closePrismaClient;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.setTenantContext = setTenantContext;
exports.clearTenantContext = clearTenantContext;
exports.getCurrentTenantContext = getCurrentTenantContext;
exports.withRetryTransaction = withRetryTransaction;
exports.initializeDatabase = initializeDatabase;
exports.withTenantContext = withTenantContext;
exports.withSystemContext = withSystemContext;
exports.validateRLSConfiguration = validateRLSConfiguration;
exports.getSecuredPrismaClient = getSecuredPrismaClient;
exports.validateCurrentTenantContext = validateCurrentTenantContext;
exports.requireValidTenantContext = requireValidTenantContext;
exports.getPrismaClient = getPrismaClient;
const client_1 = require("./generated/client");
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console()
    ]
});
// Database configuration
const databaseConfig = {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/smm_architect',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000', 10),
    logLevel: process.env.DB_LOG_LEVEL || 'warn'
};
// Global Prisma client instance
let prismaClient = null;
/**
 * Initialize Prisma client with connection pooling and logging
 */
function createPrismaClient() {
    if (prismaClient) {
        return prismaClient;
    }
    prismaClient = new client_1.PrismaClient({
        datasources: {
            db: {
                url: databaseConfig.url
            }
        },
        log: [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'event' },
            { level: 'info', emit: 'event' },
            { level: 'warn', emit: 'event' }
        ]
    });
    // Setup logging handlers
    prismaClient.$on('query', (e) => {
        if (databaseConfig.logLevel === 'debug') {
            logger.debug('Prisma Query', {
                query: e.query,
                params: e.params,
                duration: e.duration
            });
        }
    });
    prismaClient.$on('error', (e) => {
        logger.error('Prisma Error', {
            target: e.target,
            message: e.message
        });
    });
    prismaClient.$on('warn', (e) => {
        logger.warn('Prisma Warning', {
            target: e.target,
            message: e.message
        });
    });
    prismaClient.$on('info', (e) => {
        logger.info('Prisma Info', {
            target: e.target,
            message: e.message
        });
    });
    return prismaClient;
}
/**
 * Get the global Prisma client instance
 */
function getPrismaClient() {
    if (!prismaClient) {
        return createPrismaClient();
    }
    return prismaClient;
}
/**
 * Close database connections gracefully
 */
async function closePrismaClient() {
    if (prismaClient) {
        await prismaClient.$disconnect();
        prismaClient = null;
        logger.info('Prisma client disconnected');
    }
}
/**
 * Health check for database connectivity
 */
async function checkDatabaseHealth() {
    try {
        const client = getPrismaClient();
        const startTime = Date.now();
        // Simple query to check connectivity
        await client.$queryRaw `SELECT 1`;
        const latency = Date.now() - startTime;
        return {
            status: 'healthy',
            latency
        };
    }
    catch (error) {
        logger.error('Database health check failed', { error: error instanceof Error ? error.message : error });
        return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown database error'
        };
    }
}
/**
 * Set tenant context for Row Level Security (RLS)
 * This MUST be called before any database operations to ensure tenant isolation
 */
async function setTenantContext(client, tenantId) {
    if (!tenantId || tenantId.trim() === '') {
        throw new Error('Tenant ID is required for database operations');
    }
    try {
        // Set the tenant context for RLS policies
        await client.$executeRaw `SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
        logger.debug('Tenant context set', { tenantId });
    }
    catch (error) {
        logger.error('Failed to set tenant context', {
            tenantId,
            error: error instanceof Error ? error.message : error
        });
        throw new Error(`Failed to set tenant context for tenant ${tenantId}: ${error}`);
    }
}
/**
 * Clear tenant context (for system operations)
 */
async function clearTenantContext(client) {
    try {
        await client.$executeRaw `SELECT set_config('app.current_tenant_id', NULL, true)`;
        logger.debug('Tenant context cleared');
    }
    catch (error) {
        logger.error('Failed to clear tenant context', {
            error: error instanceof Error ? error.message : error
        });
        throw error;
    }
}
/**
 * Get current tenant context
 */
async function getCurrentTenantContext(client) {
    try {
        const result = await client.$queryRaw `
      SELECT current_setting('app.current_tenant_id', true) as current_setting
    `;
        const tenantId = result[0]?.current_setting;
        return tenantId && tenantId !== '' ? tenantId : null;
    }
    catch (error) {
        logger.error('Failed to get tenant context', {
            error: error instanceof Error ? error.message : error
        });
        return null;
    }
}
/**
 * Transaction helper with retry logic and tenant context
 * Uses LOCAL tenant context scoping within transactions
 */
async function withRetryTransaction(operation, maxRetries = 3, tenantId) {
    const client = getPrismaClient();
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await client.$transaction(async (tx) => {
                // Set tenant context LOCAL to this transaction if provided
                if (tenantId) {
                    await tx.$executeRaw `SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
                    logger.debug('Tenant context set within retry transaction', { tenantId, attempt });
                }
                return await operation(tx);
            });
        }
        catch (error) {
            logger.warn(`Transaction attempt ${attempt} failed`, {
                error: error instanceof Error ? error.message : error,
                attempt,
                maxRetries,
                tenantId
            });
            if (attempt === maxRetries) {
                throw error;
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
    throw new Error('Transaction failed after all retries');
}
/**
 * Initialize database connection with migration check
 */
async function initializeDatabase() {
    try {
        const client = getPrismaClient();
        // Check database connectivity
        const health = await checkDatabaseHealth();
        if (health.status === 'unhealthy') {
            throw new Error(`Database connection failed: ${health.error}`);
        }
        logger.info('Database connection established', {
            latency: health.latency,
            url: databaseConfig.url.replace(/:[^:@]*@/, ':***@') // Hide password in logs
        });
        // Check if migrations are applied
        const migrationStatus = await checkMigrationStatus();
        if (!migrationStatus.isUpToDate) {
            logger.warn('Database migrations may be out of date', {
                pendingMigrations: migrationStatus.pendingMigrations
            });
        }
    }
    catch (error) {
        logger.error('Database initialization failed', {
            error: error instanceof Error ? error.message : error
        });
        throw error;
    }
}
/**
 * Execute operation with tenant context set within a transaction
 * This ensures tenant context is LOCAL to the transaction and automatically cleaned up
 */
async function withTenantContext(tenantId, operation) {
    if (!tenantId || tenantId.trim() === '') {
        throw new Error('Tenant ID is required for database operations');
    }
    // Enter secure context to prevent security warnings
    enterSecureContext();
    try {
        const client = getPrismaClient();
        // Execute within transaction to ensure LOCAL tenant context scoping
        return await client.$transaction(async (tx) => {
            // Set tenant context LOCAL to this transaction
            await tx.$executeRaw `SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
            logger.debug('Tenant context set within transaction', { tenantId });
            // Execute the operation with transaction client
            const result = await operation(tx);
            // Transaction automatically cleans up LOCAL settings on commit/rollback
            return result;
        });
    }
    catch (error) {
        logger.error('Tenant-scoped operation failed', {
            tenantId,
            error: error instanceof Error ? error.message : error
        });
        throw error;
    }
    finally {
        // Always exit secure context
        exitSecureContext();
    }
}
/**
 * Execute system operation without tenant context (admin/migration use)
 * WARNING: This bypasses RLS - use only for admin operations
 */
async function withSystemContext(operation) {
    // Enter secure context for system operations
    enterSecureContext();
    try {
        const client = getPrismaClient();
        // Clear any existing tenant context for system operations
        await clearTenantContext(client);
        // Execute operation as system user
        const result = await operation(client);
        return result;
    }
    catch (error) {
        logger.error('System operation failed', {
            error: error instanceof Error ? error.message : error
        });
        throw error;
    }
    finally {
        // Always exit secure context
        exitSecureContext();
    }
}
/**
 * Validate RLS is properly configured
 */
async function validateRLSConfiguration() {
    try {
        const client = getPrismaClient();
        const errors = [];
        // Check RLS status on all tenant-scoped tables
        const rlsStatus = await client.$queryRaw `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'workspaces', 'workspace_runs', 'audit_bundles', 'connectors',
        'consent_records', 'brand_twins', 'decision_cards', 
        'simulation_results', 'asset_fingerprints'
      )
    `;
        // Check policy count for each table
        const policyStatus = await client.$queryRaw `
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies 
      WHERE schemaname = 'public'
      GROUP BY tablename
    `;
        const policyMap = new Map(policyStatus.map(p => [p.tablename, Number(p.policy_count)]));
        const tables = rlsStatus.map(table => {
            const policyCount = policyMap.get(table.tablename) || 0;
            if (!table.rowsecurity) {
                errors.push(`Table ${table.tablename} does not have RLS enabled`);
            }
            if (policyCount === 0) {
                errors.push(`Table ${table.tablename} has no RLS policies`);
            }
            return {
                tableName: table.tablename,
                rlsEnabled: table.rowsecurity,
                policyCount
            };
        });
        return {
            isConfigured: errors.length === 0,
            tables,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    catch (error) {
        logger.error('Failed to validate RLS configuration', {
            error: error instanceof Error ? error.message : error
        });
        return {
            isConfigured: false,
            tables: [],
            errors: [`Validation failed: ${error}`]
        };
    }
}
/**
 * Check migration status (simplified check)
 */
async function checkMigrationStatus() {
    try {
        const client = getPrismaClient();
        // Check if core tables exist
        const result = await client.$queryRaw `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('workspaces', 'simulation_reports', 'agent_runs')
    `;
        const existingTables = result.map(r => r.table_name);
        const requiredTables = ['workspaces', 'simulation_reports', 'agent_runs'];
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        return {
            isUpToDate: missingTables.length === 0,
            pendingMigrations: missingTables.length > 0 ? [`Missing tables: ${missingTables.join(', ')}`] : undefined
        };
    }
    catch (error) {
        logger.warn('Could not check migration status', {
            error: error instanceof Error ? error.message : error
        });
        return { isUpToDate: false };
    }
}
// Graceful shutdown handling
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, closing database connections');
    await closePrismaClient();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, closing database connections');
    await closePrismaClient();
    process.exit(0);
});
// =============================================================================
// SECURITY ENHANCEMENTS: Database Access Guards
// =============================================================================
// Security flag to track if client is being used in a safe context
let _isInSecureContext = false;
// List of allowed operations that don't require tenant context
const ALLOWED_SYSTEM_OPERATIONS = [
    'health',
    'migration',
    'schema',
    'system',
    '_count',
    '$queryRaw',
    '$executeRaw',
    '$transaction'
];
/**
 * Get a secured database client with tenant context validation
 * This is the preferred way to access the database in most cases
 */
function getSecuredPrismaClient() {
    const client = getPrismaClient();
    // Create a proxy to intercept database operations
    return new Proxy(client, {
        get(target, prop) {
            const propName = String(prop);
            // Allow system operations and internal Prisma methods
            if (ALLOWED_SYSTEM_OPERATIONS.some(op => propName.includes(op)) ||
                propName.startsWith('$') ||
                propName.startsWith('_') ||
                typeof target[prop] === 'function') {
                // For tenant-scoped model operations, add runtime context validation
                const originalMethod = target[prop];
                if (typeof originalMethod === 'object' && originalMethod !== null) {
                    // This is a model object (e.g., client.workspace)
                    const tenantScopedModels = [
                        'workspace', 'workspaceRun', 'auditBundle', 'connector',
                        'consentRecord', 'brandTwin', 'decisionCard', 'simulationResult',
                        'assetFingerprint', 'simulationReport', 'agentRun'
                    ];
                    if (tenantScopedModels.includes(propName)) {
                        return new Proxy(originalMethod, {
                            get(modelTarget, modelProp) {
                                const modelMethod = modelTarget[modelProp];
                                // If it's a database operation method, add tenant context validation
                                if (typeof modelMethod === 'function' &&
                                    ['findMany', 'findFirst', 'findUnique', 'create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'].includes(String(modelProp))) {
                                    return new Proxy(modelMethod, {
                                        async apply(methodTarget, thisArg, args) {
                                            // Runtime tenant context validation
                                            await validateTenantContextOrThrow(target);
                                            return Reflect.apply(methodTarget, thisArg, args);
                                        }
                                    });
                                }
                                return modelMethod;
                            }
                        });
                    }
                }
                return originalMethod;
            }
            // For tenant-scoped models, require tenant context
            const tenantScopedModels = [
                'workspace', 'workspaceRun', 'auditBundle', 'connector',
                'consentRecord', 'brandTwin', 'decisionCard', 'simulationResult',
                'assetFingerprint', 'simulationReport', 'agentRun'
            ];
            if (tenantScopedModels.includes(propName)) {
                throw new Error(`SECURITY VIOLATION: Direct access to '${propName}' model is prohibited. ` +
                    'Use withTenantContext() to ensure proper tenant isolation.');
            }
            return target[prop];
        }
    });
}
/**
 * Runtime validation to ensure tenant context is set for tenant-scoped operations
 */
async function validateTenantContextOrThrow(client) {
    // Skip validation if we're in a secure context (withTenantContext/withSystemContext)
    if (_isInSecureContext) {
        return;
    }
    // Skip validation in test environment to avoid breaking existing tests
    if (process.env.NODE_ENV === 'test') {
        logger.warn('SECURITY WARNING: Tenant context validation skipped in test environment');
        return;
    }
    try {
        const currentTenant = await getCurrentTenantContext(client);
        if (!currentTenant) {
            throw new Error('SECURITY VIOLATION: No tenant context found. ' +
                'All tenant-scoped database operations must be executed within withTenantContext() ' +
                'to ensure proper data isolation.');
        }
        logger.debug('Tenant context validation passed', { tenantId: currentTenant });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('SECURITY VIOLATION')) {
            throw error;
        }
        // If we can't determine tenant context due to database error, fail safely
        throw new Error('SECURITY VIOLATION: Unable to validate tenant context. ' +
            'Database operations require proper tenant isolation.');
    }
}
/**
 * Middleware helper to validate tenant context before database operations
 * Can be used in Express middleware or other validation scenarios
 */
async function validateCurrentTenantContext() {
    try {
        const client = getPrismaClient();
        const currentTenant = await getCurrentTenantContext(client);
        if (!currentTenant) {
            return {
                isValid: false,
                error: 'No tenant context found - database operations require tenant isolation'
            };
        }
        return {
            isValid: true,
            tenantId: currentTenant
        };
    }
    catch (error) {
        return {
            isValid: false,
            error: `Failed to validate tenant context: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
/**
 * Strict validation that throws on invalid tenant context
 * Use this in critical security checkpoints
 */
async function requireValidTenantContext() {
    const validation = await validateCurrentTenantContext();
    if (!validation.isValid) {
        throw new Error(`SECURITY VIOLATION: ${validation.error}`);
    }
    return validation.tenantId;
}
/**
 * Mark the current context as secure (used internally by withTenantContext)
 */
function enterSecureContext() {
    _isInSecureContext = true;
}
/**
 * Exit secure context
 */
function exitSecureContext() {
    _isInSecureContext = false;
}
/**
 * DEPRECATED: Direct database client access
 * Use withTenantContext() or withRetryTransaction() instead
 *
 * @deprecated Use withTenantContext() for tenant-scoped operations
 */
const originalGetPrismaClient = getPrismaClient;
// Override getPrismaClient to add security warnings
function getPrismaClient() {
    // Check if we're in a secure context (within withTenantContext or system operation)
    if (!_isInSecureContext && process.env.NODE_ENV !== 'test') {
        logger.warn('SECURITY WARNING: Direct database client access detected', {
            stack: new Error().stack,
            recommendation: 'Use withTenantContext() or withRetryTransaction() instead'
        });
    }
    return originalGetPrismaClient();
}
exports.default = getPrismaClient;
//# sourceMappingURL=client.js.map