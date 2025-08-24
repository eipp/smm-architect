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
 * Transaction helper with retry logic
 */
export async function withRetryTransaction<T>(
  operation: (client: PrismaClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const client = getPrismaClient();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.$transaction(async (tx) => {
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