#!/usr/bin/env node

/**
 * Service Database Access Audit Script
 * 
 * This script audits all services for unsafe database access patterns
 * and provides recommendations for fixing tenant context security issues.
 * 
 * Usage:
 *   node tools/service-db-audit.js
 *   node tools/service-db-audit.js --fix
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

// Configuration
const SERVICES_DIR = 'services';
const UNSAFE_PATTERNS = [
  {
    name: 'Direct getPrismaClient import',
    pattern: /import.*getPrismaClient.*from/g,
    severity: 'high',
    description: 'Direct import of getPrismaClient without tenant context'
  },
  {
    name: 'Direct prisma client usage',
    pattern: /const\s+\w+\s*=\s*getPrismaClient\(\)/g,
    severity: 'high',
    description: 'Direct instantiation of Prisma client without tenant context'
  },
  {
    name: 'Unsafe model access',
    pattern: /(?:client|prisma)\.(?:workspace|auditBundle|simulationReport|agentRun)\./g,
    severity: 'critical',
    description: 'Direct model access without tenant context validation'
  },
  {
    name: 'Missing withTenantContext',
    pattern: /\.(?:findMany|findFirst|findUnique|create|update|delete|upsert|createMany|updateMany|deleteMany)\(/g,
    severity: 'medium',
    description: 'Database operations that should be wrapped in withTenantContext'
  }
];

// Safe patterns that are allowed
const SAFE_PATTERNS = [
  /withTenantContext\(/,
  /withRetryTransaction\(/,
  /withSystemContext\(/,
  /getSecuredPrismaClient\(/,
  /validateCurrentTenantContext\(/,
  /requireValidTenantContext\(/
];

class ServiceDatabaseAudit {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.fixes = [];
    this.fixMode = process.argv.includes('--fix');
  }

  /**
   * Run audit on all services
   */
  async auditAllServices() {
    const servicesPath = path.join(process.cwd(), SERVICES_DIR);
    
    if (!fs.existsSync(servicesPath)) {
      throw new Error(`Services directory not found: ${servicesPath}`);
    }

    const serviceDirs = fs.readdirSync(servicesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`🔍 Auditing ${serviceDirs.length} services for database security issues...`);

    for (const serviceDir of serviceDirs) {
      await this.auditService(serviceDir);
    }

    this.printSummary();
    
    if (this.fixMode) {
      await this.applyFixes();
    }

    return {
      violations: this.violations.length,
      warnings: this.warnings.length,
      fixes: this.fixes.length
    };
  }

  /**
   * Audit a specific service
   */
  async auditService(serviceName) {
    const servicePath = path.join(SERVICES_DIR, serviceName);
    console.log(`\n📦 Auditing service: ${serviceName}`);

    await this.auditDirectory(servicePath, serviceName);
  }

  /**
   * Recursively audit files in a directory
   */
  async auditDirectory(dirPath, serviceName) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        await this.auditDirectory(itemPath, serviceName);
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.js'))) {
        await this.auditFile(itemPath, serviceName);
      }
    }
  }

  /**
   * Audit a specific file
   */
  async auditFile(filePath, serviceName) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativeFilePath = path.relative(process.cwd(), filePath);

    // Skip test files and the shared database client itself
    if (filePath.includes('.test.') || 
        filePath.includes('database/client.ts') ||
        filePath.includes('database/index.ts')) {
      return;
    }

    const lines = content.split('\n');
    const issues = [];

    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;
      
      // Check for unsafe patterns
      for (const pattern of UNSAFE_PATTERNS) {
        const matches = line.match(pattern.pattern);
        if (matches) {
          // Check if this line is part of a safe context
          const isSafe = this.isInSafeContext(content, lineIndex);
          
          if (!isSafe) {
            issues.push({
              file: relativeFilePath,
              service: serviceName,
              line: lineNumber,
              code: line.trim(),
              pattern: pattern.name,
              severity: pattern.severity,
              description: pattern.description,
              fix: this.generateFix(line, pattern)
            });
          }
        }
      }
    });

    if (issues.length > 0) {
      console.log(`  ⚠️  ${issues.length} issue(s) found in ${path.basename(filePath)}`);
      
      issues.forEach(issue => {
        if (issue.severity === 'critical') {
          this.violations.push(issue);
        } else {
          this.warnings.push(issue);
        }

        if (issue.fix) {
          this.fixes.push(issue);
        }
      });
    }
  }

  /**
   * Check if a line is within a safe context (e.g., inside withTenantContext)
   */
  isInSafeContext(content, lineIndex) {
    const lines = content.split('\n');
    
    // Look backward from current line to find safe context
    for (let i = lineIndex; i >= Math.max(0, lineIndex - 20); i--) {
      const line = lines[i];
      for (const safePattern of SAFE_PATTERNS) {
        if (safePattern.test(line)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate fix suggestions for common patterns
   */
  generateFix(line, pattern) {
    switch (pattern.name) {
      case 'Direct getPrismaClient import':
        return {
          type: 'import_fix',
          original: line,
          fixed: line.replace(/getPrismaClient/g, 'withTenantContext, withRetryTransaction'),
          description: 'Replace getPrismaClient import with tenant-safe functions'
        };
      
      case 'Direct prisma client usage':
        return {
          type: 'instantiation_fix',
          original: line,
          fixed: '// Use withTenantContext() instead of direct client access',
          description: 'Wrap database operations in withTenantContext()'
        };
      
      case 'Unsafe model access':
        return {
          type: 'context_wrap',
          original: line,
          fixed: line.replace(/(\w+)\.(\w+)\./g, '// Wrap in withTenantContext(() => $1.$2.'),
          description: 'Wrap model access in withTenantContext()'
        };
      
      default:
        return null;
    }
  }

  /**
   * Apply automatic fixes where possible
   */
  async applyFixes() {
    if (this.fixes.length === 0) {
      console.log('\n✅ No automatic fixes available');
      return;
    }

    console.log(`\n🔧 Applying ${this.fixes.length} automatic fixes...`);
    
    // Group fixes by file
    const fixesByFile = {};
    for (const fix of this.fixes) {
      if (!fixesByFile[fix.file]) {
        fixesByFile[fix.file] = [];
      }
      fixesByFile[fix.file].push(fix);
    }

    // Apply fixes file by file
    for (const [filePath, fileFixes] of Object.entries(fixesByFile)) {
      console.log(`  📝 Fixing ${fileFixes.length} issue(s) in ${filePath}`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Apply fixes in reverse order to maintain line numbers
      fileFixes.reverse().forEach(fix => {
        if (fix.fix && fix.fix.type === 'import_fix') {
          content = content.replace(fix.fix.original, fix.fix.fixed);
        }
      });
      
      // Write fixed content back to file
      fs.writeFileSync(filePath, content);
    }

    console.log('✅ Automatic fixes applied');
  }

  /**
   * Print audit summary
   */
  printSummary() {
    console.log('\n📊 Database Security Audit Summary:');
    
    if (this.violations.length === 0 && this.warnings.length === 0) {
      console.log('✅ No security issues found!');
      return;
    }

    if (this.violations.length > 0) {
      console.log(`\n❌ ${this.violations.length} Critical Violation(s):`);
      this.violations.forEach(v => {
        console.log(`   • ${v.file}:${v.line} - ${v.pattern}`);
        console.log(`     ${v.description}`);
        console.log(`     Code: ${v.code}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} Warning(s):`);
      this.warnings.forEach(w => {
        console.log(`   • ${w.file}:${w.line} - ${w.pattern}`);
        console.log(`     ${w.description}`);
      });
    }

    console.log('\n🛡️  Security Recommendations:');
    console.log('   1. Replace direct getPrismaClient() usage with withTenantContext()');
    console.log('   2. Wrap all tenant-scoped database operations in withTenantContext()');
    console.log('   3. Use withRetryTransaction() for transactional operations');
    console.log('   4. Add requireValidTenantContext() middleware to API routes');
    console.log('   5. Use getSecuredPrismaClient() for additional runtime validation');

    if (this.fixMode) {
      console.log('\n💡 Run with --fix flag to apply automatic fixes where possible');
    }
  }
}

// CLI Interface
async function main() {
  const auditor = new ServiceDatabaseAudit();
  
  try {
    const results = await auditor.auditAllServices();
    
    // Exit with error code if violations found
    if (results.violations > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`❌ Audit failed: ${error.message}`);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ServiceDatabaseAudit };