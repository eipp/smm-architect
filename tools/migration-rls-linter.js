#!/usr/bin/env node

/**
 * Migration RLS Policy Linter
 * 
 * This tool validates that all database migrations creating new tables
 * include proper Row Level Security (RLS) configuration.
 * 
 * Usage:
 *   node tools/migration-rls-linter.js <migration-file>
 *   node tools/migration-rls-linter.js services/smm-architect/migrations/
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - RLS policy violations found
 *   2 - Script error
 */

const fs = require('fs').promises;
const path = require('path');
const process = require('process');

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Configuration
const TENANT_TABLES = [
  'workspaces', 'workspace_runs', 'audit_bundles', 'connectors',
  'consent_records', 'brand_twins', 'decision_cards', 
  'simulation_results', 'asset_fingerprints', 'simulation_reports', 
  'agent_runs'
];

const REQUIRED_RLS_PATTERNS = {
  enableRLS: /ALTER TABLE\s+(\w+)\s+ENABLE ROW LEVEL SECURITY/gi,
  forceRLS: /ALTER TABLE\s+(\w+)\s+FORCE ROW LEVEL SECURITY/gi,
  createPolicy: /CREATE POLICY\s+\w+\s+ON\s+(\w+)/gi,
  withCheck: /WITH CHECK\s*\(/gi
};

class MigrationLinter {
  constructor() {
    this.violations = [];
    this.warnings = [];
  }

  /**
   * Lint a single migration file
   */
  async lintMigrationFile(filePath) {
    console.log(`🔍 Linting migration: ${filePath}`);

    if (!(await pathExists(filePath))) {
      this.violations.push(`Migration file not found: ${filePath}`);
      return;
    }

    const content = await fs.readFile(filePath, 'utf8');
    const filename = path.basename(filePath);
    
    // Extract table names from CREATE TABLE statements
    const createdTables = this.extractCreatedTables(content);
    
    if (createdTables.length === 0) {
      console.log(`  ✅ No tables created in ${filename}`);
      return;
    }

    console.log(`  📋 Found ${createdTables.length} table(s): ${createdTables.join(', ')}`);

    // Check each created table for RLS configuration
    for (const tableName of createdTables) {
      this.lintTableRLS(tableName, content, filename);
    }
  }

  /**
   * Extract table names from CREATE TABLE statements
   */
  extractCreatedTables(content) {
    const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(/gi;
    const tables = [];
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1].toLowerCase();
      tables.push(tableName);
    }

    return tables;
  }

  /**
   * Check RLS configuration for a specific table
   */
  lintTableRLS(tableName, content, filename) {
    const violations = [];
    const warnings = [];

    // Check if table should have RLS (tenant-scoped or contains tenant_id)
    const needsRLS = this.tableNeedsRLS(tableName, content);
    
    if (!needsRLS) {
      console.log(`  ℹ️  Table '${tableName}' doesn't appear to need RLS (no tenant_id column)`);
      return;
    }

    // Check for ENABLE ROW LEVEL SECURITY
    const enableRLSMatches = this.findTableMatches(content, REQUIRED_RLS_PATTERNS.enableRLS);
    if (!enableRLSMatches.includes(tableName)) {
      violations.push(`Table '${tableName}' missing 'ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY'`);
    }

    // Check for FORCE ROW LEVEL SECURITY
    const forceRLSMatches = this.findTableMatches(content, REQUIRED_RLS_PATTERNS.forceRLS);
    if (!forceRLSMatches.includes(tableName)) {
      violations.push(`Table '${tableName}' missing 'ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY'`);
    }

    // Check for CREATE POLICY
    const policyMatches = this.findTableMatches(content, REQUIRED_RLS_PATTERNS.createPolicy);
    if (!policyMatches.includes(tableName)) {
      violations.push(`Table '${tableName}' missing 'CREATE POLICY ... ON ${tableName}'`);
    }

    // Check for WITH CHECK clause in policies
    const withCheckMatches = content.match(REQUIRED_RLS_PATTERNS.withCheck);
    if (policyMatches.includes(tableName) && (!withCheckMatches || withCheckMatches.length === 0)) {
      warnings.push(`Table '${tableName}' policies should include 'WITH CHECK' clause for write protection`);
    }

    // Check for smm_authenticated role usage
    const authRoleRegex = new RegExp(`CREATE POLICY\\s+\\w+\\s+ON\\s+${tableName}[^;]*TO\\s+(\\w+)`, 'gi');
    const authRoleMatch = authRoleRegex.exec(content);
    if (authRoleMatch && authRoleMatch[1] !== 'smm_authenticated') {
      violations.push(`Table '${tableName}' policy should use 'smm_authenticated' role, not '${authRoleMatch[1]}'`);
    }

    // Report violations and warnings
    if (violations.length > 0) {
      console.log(`  ❌ RLS violations for table '${tableName}':`);
      violations.forEach(v => console.log(`     • ${v}`));
      this.violations.push(...violations.map(v => `${filename}: ${v}`));
    }

    if (warnings.length > 0) {
      console.log(`  ⚠️  RLS warnings for table '${tableName}':`);
      warnings.forEach(w => console.log(`     • ${w}`));
      this.warnings.push(...warnings.map(w => `${filename}: ${w}`));
    }

    if (violations.length === 0 && warnings.length === 0) {
      console.log(`  ✅ Table '${tableName}' has proper RLS configuration`);
    }
  }

  /**
   * Check if a table needs RLS based on known patterns
   */
  tableNeedsRLS(tableName, content) {
    // Check if it's a known tenant table
    if (TENANT_TABLES.includes(tableName)) {
      return true;
    }

    // Check if table has tenant_id column
    const tenantIdRegex = new RegExp(`CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?${tableName}\\s*\\([^;]*tenant_id`, 'gi');
    return tenantIdRegex.test(content);
  }

  /**
   * Find table names that match a specific pattern
   */
  findTableMatches(content, pattern) {
    const matches = [];
    let match;
    
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        matches.push(match[1].toLowerCase());
      }
    }

    return matches;
  }

  /**
   * Lint all migration files in a directory
   */
  async lintDirectory(dirPath) {
    if (!(await pathExists(dirPath))) {
      this.violations.push(`Migration directory not found: ${dirPath}`);
      return;
    }

    const files = (await fs.readdir(dirPath))
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log(`No SQL migration files found in ${dirPath}`);
      return;
    }

    console.log(`🔍 Linting ${files.length} migration files in ${dirPath}`);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      await this.lintMigrationFile(filePath);
    }
  }

  /**
   * Print summary and exit with appropriate code
   */
  printSummaryAndExit() {
    console.log('\n📊 Migration RLS Linting Summary:');
    
    if (this.violations.length === 0 && this.warnings.length === 0) {
      console.log('✅ All migrations pass RLS policy checks!');
      process.exit(0);
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} Warning(s):`);
      this.warnings.forEach(w => console.log(`   • ${w}`));
    }

    if (this.violations.length > 0) {
      console.log(`\n❌ ${this.violations.length} Violation(s):`);
      this.violations.forEach(v => console.log(`   • ${v}`));
      
      console.log('\n🛡️  RLS Policy Requirements:');
      console.log('   1. All tenant-scoped tables MUST have ENABLE ROW LEVEL SECURITY');
      console.log('   2. All tenant-scoped tables MUST have FORCE ROW LEVEL SECURITY');
      console.log('   3. All tenant-scoped tables MUST have at least one CREATE POLICY');
      console.log('   4. All policies SHOULD include WITH CHECK clause');
      console.log('   5. All policies MUST use "smm_authenticated" role');
      
      process.exit(1);
    }

    process.exit(0);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node migration-rls-linter.js <migration-file-or-directory>');
    console.error('');
    console.error('Examples:');
    console.error('  node migration-rls-linter.js services/smm-architect/migrations/');
    console.error('  node migration-rls-linter.js services/smm-architect/migrations/003_create_simulation_reports.sql');
    process.exit(2);
  }

  const linter = new MigrationLinter();
  const targetPath = args[0];

  try {
    if (!(await pathExists(targetPath))) {
      console.error(`❌ Path not found: ${targetPath}`);
      process.exit(2);
    }

    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      await linter.lintDirectory(targetPath);
    } else if (stats.isFile()) {
      await linter.lintMigrationFile(targetPath);
    } else {
      console.error(`❌ Invalid path type: ${targetPath}`);
      process.exit(2);
    }

    linter.printSummaryAndExit();

  } catch (error) {
    console.error(`❌ Script error: ${error.message}`);
    process.exit(2);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Script error: ${error.message}`);
    process.exit(2);
  });
}

module.exports = { MigrationLinter };