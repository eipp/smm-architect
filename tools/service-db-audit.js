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

const fs = require('fs/promises');
const path = require('path');
const process = require('process');
const ts = require('typescript');

// Configuration
const SERVICES_DIR = 'services';
const RULE_DEFINITIONS = {
  importGetPrisma: {
    name: 'Direct getPrismaClient import',
    severity: 'high',
    description: 'Direct import of getPrismaClient without tenant context'
  },
  directClient: {
    name: 'Direct prisma client usage',
    severity: 'high',
    description: 'Direct instantiation of Prisma client without tenant context'
  },
  unsafeModel: {
    name: 'Unsafe model access',
    severity: 'critical',
    description: 'Direct model access without tenant context validation'
  },
  missingContext: {
    name: 'Missing withTenantContext',
    severity: 'medium',
    description: 'Database operations that should be wrapped in withTenantContext'
  }
};

const DB_OPERATIONS = ['findMany', 'findFirst', 'findUnique', 'create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'];
const MODEL_NAMES = ['workspace', 'auditBundle', 'simulationReport', 'agentRun'];
const SAFE_FUNCTIONS = ['withTenantContext', 'withRetryTransaction', 'withSystemContext', 'getSecuredPrismaClient', 'validateCurrentTenantContext', 'requireValidTenantContext'];


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

    try {
      await fs.access(servicesPath);
    } catch {
      throw new Error(`Services directory not found: ${servicesPath}`);
    }

    const serviceDirs = (await fs.readdir(servicesPath, { withFileTypes: true }))
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
    const items = await fs.readdir(dirPath, { withFileTypes: true });

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
    const content = await fs.readFile(filePath, 'utf8');
    const relativeFilePath = path.relative(process.cwd(), filePath);

    if (filePath.includes('.test.') ||
        filePath.includes('database/client.ts') ||
        filePath.includes('database/index.ts')) {
      return;
    }

    const issues = [];
    const lines = content.split('\n');

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const addIssue = (rule, node) => {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const codeLine = lines[line] || '';
      issues.push({
        file: relativeFilePath,
        service: serviceName,
        line: line + 1,
        code: codeLine.trim(),
        pattern: rule.name,
        severity: rule.severity,
        description: rule.description,
        fix: this.generateFix(codeLine, rule)
      });
    };

    const traverse = (node, ancestors = []) => {
      // Import of getPrismaClient
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        if (clause && clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          clause.namedBindings.elements.forEach(el => {
            if (el.name.escapedText === 'getPrismaClient') {
              addIssue(RULE_DEFINITIONS.importGetPrisma, el);
            }
          });
        }
      }

      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isIdentifier(expr) && expr.escapedText === 'getPrismaClient') {
          addIssue(RULE_DEFINITIONS.directClient, node);
        }
        if (ts.isPropertyAccessExpression(expr)) {
          const name = expr.name.escapedText;
          if (DB_OPERATIONS.includes(name) && isPrismaMember(expr.expression)) {
            if (!isSafeContext(ancestors)) {
              addIssue(RULE_DEFINITIONS.missingContext, node);
            }
          }
        }
      }

      if (ts.isPropertyAccessExpression(node)) {
        const root = getRootIdentifier(node.expression);
        const prop = node.name.escapedText;
        if (root && ['client', 'prisma'].includes(root.escapedText) && MODEL_NAMES.includes(prop)) {
          if (!isSafeContext(ancestors)) {
            addIssue(RULE_DEFINITIONS.unsafeModel, node);
          }
        }
      }

      ts.forEachChild(node, child => traverse(child, ancestors.concat(node)));
    };

    const getRootIdentifier = (expression) => {
      let expr = expression;
      while (ts.isPropertyAccessExpression(expr)) {
        expr = expr.expression;
      }
      return ts.isIdentifier(expr) ? expr : null;
    };

    const isPrismaMember = (expression) => {
      const root = getRootIdentifier(expression);
      return root && ['client', 'prisma'].includes(root.escapedText);
    };

    const isSafeContext = (ancestors) => {
      return ancestors.some(anc =>
        ts.isCallExpression(anc) &&
        ts.isIdentifier(anc.expression) &&
        SAFE_FUNCTIONS.includes(anc.expression.escapedText)
      );
    };

    traverse(sourceFile, []);

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
      
      let content = await fs.readFile(filePath, 'utf8');
      
      // Apply fixes in reverse order to maintain line numbers
      fileFixes.reverse().forEach(fix => {
        if (fix.fix && fix.fix.type === 'import_fix') {
          content = content.replace(fix.fix.original, fix.fix.fixed);
        }
      });
      
      // Write fixed content back to file
      await fs.writeFile(filePath, content);
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