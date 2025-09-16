/**
 * SMM Architect Unified Database Client
 * 
 * Provides a centralized database client with multi-tenant RLS support
 * and connection management for all services.
 */

import { execSync } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Global Prisma client instance
let prisma: PrismaClient | null = null;

/**
 * Configuration options for database client
 */
export interface DatabaseConfig {
  tenantId?: string;
  connectionString?: string;
  logLevel?: 'query' | 'info' | 'warn' | 'error';
  enableRLS?: boolean;
}

/**
 * Get or create Prisma client instance
 */
export function getDatabaseClient(config: DatabaseConfig = {}): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.connectionString || process.env['DATABASE_URL']
        }
      },
      log: config.logLevel ? [config.logLevel] : ['error']
    });

    // Add middleware for tenant isolation
    if (config.enableRLS !== false) {
      prisma.$use(async (params, next) => {
        // Set tenant context for RLS if tenantId is provided
        if (config.tenantId) {
          await prisma!.$executeRaw`SELECT set_config('app.current_tenant_id', ${config.tenantId}, false)`;
        }
        
        const result = await next(params);
        return result;
      });
    }
  }

  return prisma;
}

/**
 * Set tenant context for current database session
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  const client = getDatabaseClient();
  await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
  logger.debug(`Tenant context set to: ${tenantId}`);
}

/**
 * Clear tenant context
 */
export async function clearTenantContext(): Promise<void> {
  const client = getDatabaseClient();
  await client.$executeRaw`SELECT set_config('app.current_tenant_id', '', false)`;
  logger.debug('Tenant context cleared');
}

/**
 * Execute a query with specific tenant context
 */
export async function withTenantContext<T>(
  tenantId: string, 
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getDatabaseClient();
  
  // Set tenant context
  await setTenantContext(tenantId);
  
  try {
    // Execute operation
    const result = await operation(client);
    return result;
  } finally {
    // Clear tenant context
    await clearTenantContext();
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getDatabaseClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Database connection closed');
  }
}

/**
 * Migration utilities
 */
export class DatabaseMigration {
  private client: PrismaClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
    this.client = getDatabaseClient(config);
    this.config = config;
  }

  /**
   * Check if database is up to date
   */
  async isUpToDate(): Promise<boolean> {
    try {
      // Check if Prisma migrations table exists and is current
      const result = await this.client.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '_prisma_migrations'
        ) as exists
      `;
      return !!(result as any)[0]?.exists;
    } catch {
      return false;
    }
  }

  /**
   * Apply pending migrations
   */
  async migrate(): Promise<void> {
    logger.info('Applying database migrations...');
    const schemaPath = path.resolve(__dirname, '../../database/schema.prisma');
    const projectRoot = path.resolve(__dirname, '../..');
    try {
      execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
        stdio: 'inherit',
        cwd: projectRoot,
        env: {
          ...process.env,
          DATABASE_URL: this.config.connectionString || process.env['DATABASE_URL']
        }
      });
      logger.info('Migrations completed');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (development only)
   */
  async reset(): Promise<void> {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Database reset not allowed in production');
    }

    logger.warn('Resetting database...');
    const schemaPath = path.resolve(__dirname, '../../database/schema.prisma');
    const projectRoot = path.resolve(__dirname, '../..');
    try {
      execSync(
        `npx prisma migrate reset --force --skip-seed --schema="${schemaPath}"`,
        {
          stdio: 'inherit',
          cwd: projectRoot,
          env: {
            ...process.env,
            DATABASE_URL: this.config.connectionString || process.env['DATABASE_URL']
          }
        }
      );
      logger.info('Database reset completed');
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }
}

// Export types from Prisma client
export type {
  Workspace,
  WorkspaceRun,
  AuditBundle,
  Connector,
  ConsentRecord,
  BrandTwin,
  DecisionCard,
  SimulationResult,
  AssetFingerprint
} from '@prisma/client';

export { PrismaClient } from '@prisma/client';