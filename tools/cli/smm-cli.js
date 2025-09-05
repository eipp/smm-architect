#!/usr/bin/env node

/**
 * SMM Architect Unified CLI Tool
 * 
 * Provides centralized automation for development, testing, 
 * deployment, and maintenance tasks
 */

import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const VERSION = '1.0.0';

const program = new Command();

// CLI Configuration
program
  .name('smm-cli')
  .description('SMM Architect Unified CLI Tool')
  .version(VERSION);

// Development Commands
const devCommand = program
  .command('dev')
  .description('Development commands');

devCommand
  .command('setup')
  .description('Setup development environment')
  .action(async () => {
    console.log('🚀 Setting up SMM Architect development environment...');
    
    try {
      // Install dependencies
      console.log('📦 Installing dependencies...');
      execSync('pnpm install', { stdio: 'inherit' });
      
      // Build shared packages
      console.log('🔨 Building shared packages...');
      execSync('pnpm --filter=@smm-architect/shared build', { stdio: 'inherit' });
      execSync('pnpm --filter=@smm-architect/ui build', { stdio: 'inherit' });
      
      // Setup database
      console.log('🗄️ Setting up database...');
      execSync('docker-compose up -d postgres redis', { stdio: 'inherit' });
      
      // Run migrations
      console.log('📊 Running database migrations...');
      execSync('pnpm --filter=smm-architect-service db:migrate', { stdio: 'inherit' });
      
      // Make scripts executable
      execSync('chmod +x tools/scripts/*.sh', { stdio: 'inherit' });
      
      console.log('✅ Development environment setup complete!');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  });

devCommand
  .command('start')
  .description('Start all development services')
  .option('-s, --service <service>', 'Start specific service')
  .action(async (options) => {
    if (options.service) {
      console.log(`🚀 Starting ${options.service} service...`);
      execSync(`pnpm --filter=${options.service} dev`, { stdio: 'inherit' });
    } else {
      console.log('🚀 Starting all development services...');
      execSync('docker-compose up', { stdio: 'inherit' });
    }
  });

// Build Commands
const buildCommand = program
  .command('build')
  .description('Build commands');

buildCommand
  .command('all')
  .description('Build all services and packages')
  .action(async () => {
    console.log('🔨 Building all services and packages...');
    execSync('turbo build', { stdio: 'inherit' });
  });

buildCommand
  .command('docker')
  .description('Build Docker images')
  .option('-s, --service <service>', 'Build specific service')
  .action(async (options) => {
    if (options.service) {
      console.log(`🐳 Building Docker image for ${options.service}...`);
      execSync(`docker build -f services/${options.service}/Dockerfile -t smm-architect/${options.service}:${VERSION} .`, { stdio: 'inherit' });
    } else {
      console.log('🐳 Building all Docker images...');
      execSync('docker-compose build', { stdio: 'inherit' });
    }
  });

// Test Commands
const testCommand = program
  .command('test')
  .description('Test commands');

testCommand
  .command('all')
  .description('Run all tests')
  .option('--coverage', 'Run with coverage')
  .action(async (options) => {
    const command = options.coverage ? 'turbo test:coverage' : 'turbo test';
    console.log('🧪 Running all tests...');
    execSync(command, { stdio: 'inherit' });
  });

testCommand
  .command('security')
  .description('Run security tests')
  .action(async () => {
    console.log('🔒 Running security tests...');
    execSync('./tools/scripts/run-security-tests.sh', { stdio: 'inherit' });
  });

testCommand
  .command('e2e')
  .description('Run end-to-end tests')
  .action(async () => {
    console.log('🌐 Running end-to-end tests...');
    execSync('pnpm --filter=@smm-architect/frontend test:e2e', { stdio: 'inherit' });
  });

// Database Commands
const dbCommand = program
  .command('db')
  .description('Database commands');

dbCommand
  .command('migrate')
  .description('Run database migrations')
  .action(async () => {
    console.log('📊 Running database migrations...');
    execSync('pnpm --filter=@smm-architect/shared db:migrate', { stdio: 'inherit' });
  });

dbCommand
  .command('seed')
  .description('Seed database with test data')
  .action(async () => {
    console.log('🌱 Seeding database...');
    execSync('pnpm --filter=@smm-architect/shared db:seed', { stdio: 'inherit' });
  });

dbCommand
  .command('reset')
  .description('Reset database (development only)')
  .action(async () => {
    console.log('🗑️ Resetting database...');
    execSync('pnpm --filter=@smm-architect/shared db:reset', { stdio: 'inherit' });
  });

// Security Commands
const securityCommand = program
  .command('security')
  .description('Security and compliance commands');

securityCommand
  .command('scan')
  .description('Run security vulnerability scan')
  .action(async () => {
    console.log('🔍 Running security scan...');
    execSync('./tools/scripts/generate-sbom.sh', { stdio: 'inherit' });
  });

securityCommand
  .command('audit')
  .description('Run security audit')
  .action(async () => {
    console.log('🔒 Running security audit...');
    execSync('pnpm audit', { stdio: 'inherit' });
  });

// Deployment Commands
const deployCommand = program
  .command('deploy')
  .description('Deployment commands');

deployCommand
  .command('staging')
  .description('Deploy to staging environment')
  .action(async () => {
    console.log('🚀 Deploying to staging...');
    execSync('./tools/scripts/deploy-staging.sh', { stdio: 'inherit' });
  });

deployCommand
  .command('production')
  .description('Deploy to production environment')
  .action(async () => {
    console.log('🚀 Deploying to production...');
    execSync('./tools/scripts/deploy-production.sh', { stdio: 'inherit' });
  });

// Monitoring Commands
const monitoringCommand = program
  .command('monitoring')
  .description('Monitoring and observability commands');

monitoringCommand
  .command('setup')
  .description('Setup monitoring stack')
  .action(async () => {
    console.log('📊 Setting up monitoring stack...');
    execSync('./tools/scripts/deploy-enhanced-monitoring.sh', { stdio: 'inherit' });
  });

monitoringCommand
  .command('logs')
  .description('View aggregated logs')
  .option('-s, --service <service>', 'View logs for specific service')
  .option('-f, --follow', 'Follow log output')
  .action(async (options) => {
    if (options.service) {
      const command = options.follow 
        ? `docker-compose logs -f ${options.service}`
        : `docker-compose logs ${options.service}`;
      execSync(command, { stdio: 'inherit' });
    } else {
      const command = options.follow ? 'docker-compose logs -f' : 'docker-compose logs';
      execSync(command, { stdio: 'inherit' });
    }
  });

// Utilities Commands
const utilsCommand = program
  .command('utils')
  .description('Utility commands');

utilsCommand
  .command('clean')
  .description('Clean build artifacts and caches')
  .action(async () => {
    console.log('🧹 Cleaning build artifacts...');
    execSync('turbo clean', { stdio: 'inherit' });
    execSync('rm -rf node_modules/.cache', { stdio: 'inherit' });
    execSync('rm -rf */dist */coverage */.next', { stdio: 'inherit' });
  });

utilsCommand
  .command('lint')
  .description('Lint all code')
  .option('--fix', 'Auto-fix linting issues')
  .action(async (options) => {
    const command = options.fix ? 'turbo lint:fix' : 'turbo lint';
    console.log('✨ Linting code...');
    execSync(command, { stdio: 'inherit' });
  });

utilsCommand
  .command('format')
  .description('Format all code')
  .action(async () => {
    console.log('✨ Formatting code...');
    execSync('prettier --write "**/*.{ts,tsx,js,jsx,json,md}"', { stdio: 'inherit' });
  });

// Status Commands
const statusCommand = program
  .command('status')
  .description('Show system status');

statusCommand
  .command('health')
  .description('Check health of all services')
  .action(async () => {
    console.log('🏥 Checking service health...');
    
    const services = [
      { name: 'Core API', url: 'http://localhost:4000/health' },
      { name: 'ToolHub', url: 'http://localhost:3001/health' },
      { name: 'Frontend', url: 'http://localhost:3000/api/health' },
    ];
    
    for (const service of services) {
      try {
        execSync(`curl -f ${service.url}`, { stdio: 'pipe' });
        console.log(`✅ ${service.name}: Healthy`);
      } catch {
        console.log(`❌ ${service.name}: Unhealthy`);
      }
    }
  });

statusCommand
  .command('info')
  .description('Show system information')
  .action(async () => {
    console.log('ℹ️ SMM Architect System Information');
    console.log('=====================================');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      console.log(`Version: ${packageJson.version}`);
      console.log(`Node.js: ${process.version}`);
      console.log(`Platform: ${process.platform}`);
      console.log(`Architecture: ${process.arch}`);
      
      // Check Docker
      try {
        const dockerVersion = execSync('docker --version', { encoding: 'utf8' });
        console.log(`Docker: ${dockerVersion.trim()}`);
      } catch {
        console.log('Docker: Not available');
      }
      
      // Check services status
      try {
        execSync('docker-compose ps', { stdio: 'pipe' });
        console.log('Services: Running');
      } catch {
        console.log('Services: Not running');
      }
    } catch (error) {
      console.error('Error getting system info:', error);
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  console.error('CLI Error:', error);
  process.exit(1);
}