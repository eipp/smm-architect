#!/usr/bin/env node

/**
 * Prisma Migration Management Script
 * 
 * This script manages database migrations using Prisma, replacing the raw SQL migration files.
 * It provides commands for initializing, applying, and managing database schema changes.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

interface MigrationConfig {
  databaseUrl: string;
  schemaPath: string;
  migrationsPath: string;
  resetDatabase: boolean;
  skipGenerate: boolean;
}

class PrismaMigrationManager {
  private config: MigrationConfig;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = {
      databaseUrl: config.databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/smm_architect',
      schemaPath: config.schemaPath || join(__dirname, 'schema.prisma'),
      migrationsPath: config.migrationsPath || join(__dirname, 'migrations'),
      resetDatabase: config.resetDatabase || false,
      skipGenerate: config.skipGenerate || false
    };
  }

  /**
   * Initialize database with Prisma migrations
   */
  async initializeDatabase(): Promise<void> {
    try {
      logger.info('Initializing database with Prisma migrations...');

      // Ensure DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = this.config.databaseUrl;
      }

      // Check if schema file exists
      if (!existsSync(this.config.schemaPath)) {
        throw new Error(`Prisma schema not found at ${this.config.schemaPath}`);
      }

      // Reset database if requested
      if (this.config.resetDatabase) {
        logger.warn('Resetting database...');
        await this.resetDatabase();
      }

      // Apply migrations
      await this.applyMigrations();

      // Generate Prisma client
      if (!this.config.skipGenerate) {
        await this.generateClient();
      }

      logger.info('Database initialization completed successfully');

    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new migration
   */
  async createMigration(name: string): Promise<void> {
    try {
      logger.info(`Creating migration: ${name}`);

      const command = `npx prisma migrate dev --name "${name}" --schema="${this.config.schemaPath}"`;
      
      logger.info(`Executing: ${command}`);
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });

      logger.info(`Migration created: ${name}`);

    } catch (error) {
      logger.error('Migration creation failed:', error);
      throw error;
    }
  }

  /**
   * Apply pending migrations
   */
  async applyMigrations(): Promise<void> {
    try {
      logger.info('Applying database migrations...');

      const command = `npx prisma migrate deploy --schema="${this.config.schemaPath}"`;
      
      logger.info(`Executing: ${command}`);
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });

      logger.info('Migrations applied successfully');

    } catch (error) {
      logger.error('Migration application failed:', error);
      throw error;
    }
  }

  /**
   * Generate Prisma client
   */
  async generateClient(): Promise<void> {
    try {
      logger.info('Generating Prisma client...');

      const command = `npx prisma generate --schema="${this.config.schemaPath}"`;
      
      logger.info(`Executing: ${command}`);
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });

      logger.info('Prisma client generated successfully');

    } catch (error) {
      logger.error('Client generation failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (dangerous - only for development)
   */
  async resetDatabase(): Promise<void> {
    try {
      logger.warn('Resetting database - this will delete all data!');

      const command = `npx prisma migrate reset --force --schema="${this.config.schemaPath}"`;
      
      logger.info(`Executing: ${command}`);
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });

      logger.info('Database reset completed');

    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Check migration status
   */
  async checkMigrationStatus(): Promise<void> {
    try {
      logger.info('Checking migration status...');

      const command = `npx prisma migrate status --schema="${this.config.schemaPath}"`;
      
      logger.info(`Executing: ${command}`);
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });

    } catch (error) {
      logger.error('Migration status check failed:', error);
      throw error;
    }
  }

  /**
   * Seed database with initial data
   */
  async seedDatabase(): Promise<void> {
    try {
      logger.info('Seeding database...');

      const seedScript = join(__dirname, 'seed.ts');
      
      if (existsSync(seedScript)) {
        const command = `npx ts-node "${seedScript}"`;
        
        logger.info(`Executing: ${command}`);
        execSync(command, { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
        });

        logger.info('Database seeding completed');
      } else {
        logger.info('No seed script found, skipping database seeding');
      }

    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Migrate from existing SQL migrations to Prisma
   */
  async migrateFromSql(): Promise<void> {
    try {
      logger.info('Migrating from SQL migrations to Prisma...');

      // Check if we have existing SQL migrations
      const sqlMigrationsPath = join(__dirname, '../../smm-architect/migrations');
      
      if (existsSync(sqlMigrationsPath)) {
        logger.info('Found existing SQL migrations, creating baseline migration...');

        // Create baseline migration that reflects current state
        const command = `npx prisma migrate diff --from-empty --to-schema-datamodel "${this.config.schemaPath}" --script > baseline.sql`;
        
        logger.info(`Executing: ${command}`);
        execSync(command, { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
        });

        // Apply baseline if database is empty
        await this.applyBaseline();
        
        logger.info('SQL to Prisma migration completed');
      } else {
        logger.info('No existing SQL migrations found, proceeding with normal initialization');
        await this.initializeDatabase();
      }

    } catch (error) {
      logger.error('SQL migration failed:', error);
      throw error;
    }
  }

  /**
   * Apply baseline migration for existing databases
   */
  private async applyBaseline(): Promise<void> {
    try {
      // Check if database has existing tables
      const command = `npx prisma db execute --file baseline.sql --schema="${this.config.schemaPath}"`;
      
      logger.info('Applying baseline migration...');
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });

      // Mark migrations as applied
      const resolveCommand = `npx prisma migrate resolve --applied baseline --schema="${this.config.schemaPath}"`;
      execSync(resolveCommand, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });

    } catch (error) {
      logger.error('Baseline migration failed:', error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  const manager = new PrismaMigrationManager();

  try {
    switch (command) {
      case 'init':
        await manager.initializeDatabase();
        break;

      case 'migrate':
        if (args[0]) {
          await manager.createMigration(args[0]);
        } else {
          await manager.applyMigrations();
        }
        break;

      case 'generate':
        await manager.generateClient();
        break;

      case 'reset':
        await manager.resetDatabase();
        break;

      case 'status':
        await manager.checkMigrationStatus();
        break;

      case 'seed':
        await manager.seedDatabase();
        break;

      case 'migrate-from-sql':
        await manager.migrateFromSql();
        break;

      default:
        console.log(`
Usage: node migrate.js <command> [args]

Commands:
  init                    Initialize database with migrations
  migrate [name]          Create new migration or apply pending migrations
  generate               Generate Prisma client
  reset                  Reset database (development only)
  status                 Check migration status
  seed                   Seed database with initial data
  migrate-from-sql       Migrate from existing SQL migrations

Environment Variables:
  DATABASE_URL           PostgreSQL connection string
  NODE_ENV              Environment (development, production)

Examples:
  node migrate.js init
  node migrate.js migrate "add_user_table"
  node migrate.js migrate
  node migrate.js generate
`);
        process.exit(1);
    }

    logger.info('Command completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Command failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export default PrismaMigrationManager;

// Run CLI if called directly
if (require.main === module) {
  main();
}