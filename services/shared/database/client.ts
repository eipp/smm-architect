import { PrismaClient } from './generated/client';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Database configuration
const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/smm_architect',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000', 10),
  logLevel: (process.env.DB_LOG_LEVEL as any) || 'warn'
};

// Global Prisma client instance
let prismaClient: PrismaClient | null = null;

/**
 * Initialize Prisma client with connection pooling and logging
 */
export function createPrismaClient(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  prismaClient = new PrismaClient({
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
export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    return createPrismaClient();
  }
  return prismaClient;
}

/**
 * Close database connections gracefully
 */
export async function closePrismaClient(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
    logger.info('Prisma client disconnected');
  }
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  try {
    const client = getPrismaClient();
    const startTime = Date.now();
    
    // Simple query to check connectivity
    await client.$queryRaw`SELECT 1`;
    
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
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
export async function setTenantContext(
  client: PrismaClient, 
  tenantId: string
): Promise<void> {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('Tenant ID is required for database operations');
  }

  try {
    // Set the tenant context for RLS policies
    await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    
    logger.debug('Tenant context set', { tenantId });
  } catch (error) {
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
export async function clearTenantContext(client: PrismaClient): Promise<void> {
  try {
    await client.$executeRaw`SELECT set_config('app.current_tenant_id', NULL, true)`;
    logger.debug('Tenant context cleared');
  } catch (error) {
    logger.error('Failed to clear tenant context', {
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Get current tenant context
 */
export async function getCurrentTenantContext(client: PrismaClient): Promise<string | null> {
  try {
    const result = await client.$queryRaw<{ current_setting: string }[]>`
      SELECT current_setting('app.current_tenant_id', true) as current_setting
    `;
    
    const tenantId = result[0]?.current_setting;
    return tenantId && tenantId !== '' ? tenantId : null;
  } catch (error) {
    logger.error('Failed to get tenant context', {
      error: error instanceof Error ? error.message : error
    });
    return null;
  }
}

/**
 * Transaction helper with retry logic and optional tenant context
 */
export async function withRetryTransaction<T>(
  operation: (client: PrismaClient) => Promise<T>,
  maxRetries: number = 3,
  tenantId?: string
): Promise<T> {
  const client = getPrismaClient();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.$transaction(async (tx) => {
        // Set tenant context within transaction if provided
        if (tenantId) {
          await setTenantContext(tx as PrismaClient, tenantId);
        }
        return await operation(tx as PrismaClient);
      });
    } catch (error) {
      logger.warn(`Transaction attempt ${attempt} failed`, {
        error: error instanceof Error ? error.message : error,
        attempt,
        maxRetries
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
export async function initializeDatabase(): Promise<void> {
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
    
  } catch (error) {
    logger.error('Database initialization failed', {
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Execute operation with tenant context set
 * This is the primary function for tenant-scoped database operations
 */
export async function withTenantContext<T>(
  tenantId: string,
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('Tenant ID is required for database operations');
  }

  const client = getPrismaClient();
  
  try {
    // Set tenant context before operation
    await setTenantContext(client, tenantId);
    
    // Execute the operation
    const result = await operation(client);
    
    return result;
  } catch (error) {
    logger.error('Tenant-scoped operation failed', {
      tenantId,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Execute system operation without tenant context (admin/migration use)
 * WARNING: This bypasses RLS - use only for admin operations
 */
export async function withSystemContext<T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  
  try {
    // Clear any existing tenant context for system operations
    await clearTenantContext(client);
    
    // Execute operation as system user
    const result = await operation(client);
    
    return result;
  } catch (error) {
    logger.error('System operation failed', {
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Validate RLS is properly configured
 */
export async function validateRLSConfiguration(): Promise<{
  isConfigured: boolean;
  tables: Array<{ tableName: string; rlsEnabled: boolean; policyCount: number }>;
  errors?: string[];
}> {
  try {
    const client = getPrismaClient();
    const errors: string[] = [];
    
    // Check RLS status on all tenant-scoped tables
    const rlsStatus = await client.$queryRaw<Array<{
      tablename: string;
      rowsecurity: boolean;
    }>>`
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
    const policyStatus = await client.$queryRaw<Array<{
      tablename: string;
      policy_count: bigint;
    }>>`
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies 
      WHERE schemaname = 'public'
      GROUP BY tablename
    `;
    
    const policyMap = new Map(
      policyStatus.map(p => [p.tablename, Number(p.policy_count)])
    );
    
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
  } catch (error) {
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
async function checkMigrationStatus(): Promise<{
  isUpToDate: boolean;
  pendingMigrations?: string[];
}> {
  try {
    const client = getPrismaClient();
    
    // Check if core tables exist
    const result = await client.$queryRaw<{ table_name: string }[]>`
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
  } catch (error) {
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

export default getPrismaClient;