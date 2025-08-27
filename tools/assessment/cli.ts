#!/usr/bin/env node

/**
 * SMM Architect Production Assessment CLI
 * 
 * Command-line interface for running comprehensive production readiness assessments.
 */

import { Command } from 'commander';
import { join } from 'path';
import { SMMProductionAssessmentOrchestrator } from './core/orchestrator.js';
import { SMMAssessmentConfigManager } from './core/config.js';
import { SMMProductionAssessmentConfig } from './core/types.js';

const program = new Command();

program
  .name('smm-assessment')
  .description('SMM Architect Production Readiness Assessment Tool')
  .version('1.0.0');

program
  .command('run')
  .description('Run comprehensive production readiness assessment')
  .option('-e, --environment <env>', 'Target environment (staging|production)', 'staging')
  .option('-l, --level <level>', 'Assessment level (basic|comprehensive|enterprise)', 'comprehensive')
  .option('--skip-non-critical', 'Skip non-critical validators for faster execution', false)
  .option('--parallel', 'Run validators in parallel (default: true)', true)
  .option('--no-parallel', 'Run validators sequentially')
  .option('-o, --output <dir>', 'Output directory for reports', './reports/production-assessment')
  .option('--no-reports', 'Skip generating report files')
  .action(async (options) => {
    try {
      console.log('🚀 Starting SMM Architect Production Assessment...\n');
      
      // Create configuration
      const config: SMMProductionAssessmentConfig = {
        projectRoot: process.cwd(),
        environment: options.environment as 'staging' | 'production',
        assessmentLevel: options.level as 'basic' | 'comprehensive' | 'enterprise',
        skipNonCritical: options.skipNonCritical,
        parallelExecution: options.parallel,
        generateReports: !options.noReports,
        outputDirectory: options.output
      };
      
      // Initialize configuration manager
      const configManager = SMMAssessmentConfigManager.getInstance();
      await configManager.loadConfiguration(config.projectRoot, config.environment);
      
      // Validate configuration
      const configValidation = await configManager.validateConfiguration();
      if (!configValidation.valid) {
        console.error('❌ Configuration validation failed:');
        configValidation.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
      
      // Create and run orchestrator
      const orchestrator = new SMMProductionAssessmentOrchestrator(config);
      const report = await orchestrator.runAssessment();
      
      // Display results
      console.log('\n📊 Assessment Results:');
      console.log('====================');
      console.log(`Overall Score: ${report.overallScore}/100`);
      console.log(`Production Ready: ${report.productionReady ? '✅ YES' : '❌ NO'}`);
      console.log(`Critical Blockers: ${report.criticalBlockers.length}`);
      
      if (report.criticalBlockers.length > 0) {
        console.log('\n🚨 Critical Blockers:');
        report.criticalBlockers.forEach((blocker, index) => {
          console.log(`${index + 1}. ${blocker.title}`);
          console.log(`   Impact: ${blocker.impact}`);
          console.log(`   Action: ${blocker.remediation[0]?.action || 'See detailed report'}`);
        });
      }
      
      console.log('\n📈 Category Scores:');
      Object.entries(report.categoryScores).forEach(([category, score]) => {
        const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
        console.log(`${status} ${category.replace(/_/g, ' ')}: ${score}/100`);
      });
      
      if (report.executiveSummary.timeToProduction !== 'Ready now') {
        console.log(`\n⏱️ Estimated Time to Production: ${report.executiveSummary.timeToProduction}`);
      }
      
      if (config.generateReports) {
        console.log(`\n📁 Detailed reports saved to: ${config.outputDirectory}`);
      }
      
      console.log('\n✅ Assessment completed successfully!');
      
      // Exit with appropriate code
      process.exit(report.productionReady ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Assessment failed:', error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const configManager = SMMAssessmentConfigManager.getInstance();
      await configManager.loadConfiguration(process.cwd(), 'staging');
      
      const config = configManager.getConfig();
      const integrationConfig = configManager.getIntegrationConfig();
      
      console.log('📋 Current Assessment Configuration:');
      console.log('================================');
      console.log(`Project Root: ${config.projectRoot}`);
      console.log(`Environment: ${config.environment}`);
      console.log(`Assessment Level: ${config.assessmentLevel}`);
      console.log(`Parallel Execution: ${config.parallelExecution}`);
      console.log(`Skip Non-Critical: ${config.skipNonCritical}`);
      console.log(`Generate Reports: ${config.generateReports}`);
      console.log(`Output Directory: ${config.outputDirectory}`);
      
      console.log('\n🔗 Integration Configuration:');
      console.log(`Agentuity Environment: ${integrationConfig.agentuity.environment}`);
      console.log(`Vault Mount Path: ${integrationConfig.vault.mountPath}`);
      console.log(`Database RLS Enabled: ${integrationConfig.database.enableRLS}`);
      console.log(`Social Media Platforms: ${integrationConfig.socialMedia.platforms.join(', ')}`);
      
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      process.exit(1);
    }
  });

program
  .command('validate-env')
  .description('Validate environment configuration for assessment')
  .action(async () => {
    try {
      const configManager = SMMAssessmentConfigManager.getInstance();
      await configManager.loadConfiguration(process.cwd(), process.env['NODE_ENV'] || 'staging');
      
      const validation = await configManager.validateConfiguration();
      
      console.log('🔍 Environment Validation Results:');
      console.log('================================');
      
      if (validation.valid) {
        console.log('✅ Environment configuration is valid!');
      } else {
        console.log('❌ Environment configuration has issues:');
        validation.errors.forEach(error => {
          console.log(`  - ${error}`);
        });
      }
      
      // Show validator requirements
      const validators = configManager.getAllValidatorConfigs();
      console.log('\n📋 Validator Requirements:');
      validators.forEach(validator => {
        console.log(`\n${validator.name} (${validator.criticalityLevel}):`);
        validator.environmentRequirements.forEach(req => {
          const value = process.env[req.name];
          const status = req.required && !value ? '❌' : value ? '✅' : '⚪';
          console.log(`  ${status} ${req.name}: ${value || req.defaultValue || 'not set'}`);
        });
      });
      
      process.exit(validation.valid ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      process.exit(1);
    }
  });

program
  .command('deprecate-scripts')
  .description('Show deprecated scripts that should be replaced by this assessment system')
  .action(() => {
    console.log('📜 Scripts Replaced by SMM Assessment System:');
    console.log('============================================');
    console.log('');
    console.log('✅ REPLACED SCRIPTS:');
    console.log('  • production-readiness-check.sh → smm-assessment run');
    console.log('  • production-readiness-validation.sh → smm-assessment run --level comprehensive');
    console.log('  • verify-production-ready.sh → smm-assessment run --environment production');
    console.log('  • agentuity-smoke-tests.sh → Agent Orchestration Validator');
    console.log('');
    console.log('🔄 MIGRATION COMMANDS:');
    console.log('  # Replace basic production checks');
    console.log('  tools/assessment/cli.ts run --level basic');
    console.log('');
    console.log('  # Replace comprehensive validation');
    console.log('  tools/assessment/cli.ts run --level comprehensive --environment production');
    console.log('');
    console.log('  # Replace agent smoke tests');
    console.log('  tools/assessment/cli.ts run --level basic --environment staging');
    console.log('');
    console.log('⚠️ SCRIPTS TO KEEP (complementary):');
    console.log('  • run-security-tests.sh (specific security testing)');
    console.log('  • generate-sbom.sh (SBOM generation)');
    console.log('  • deploy-*.sh (deployment automation)');
    console.log('  • setup-*.sh (environment setup)');
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();