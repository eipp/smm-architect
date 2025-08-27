/**
 * SMM Architect Production Assessment Configuration Manager
 * 
 * This module manages configuration for the comprehensive production readiness
 * assessment system, integrating with the existing SMM Architect configuration.
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { SMMProductionAssessmentConfig, AssessmentCategory, CriticalityLevel } from './types.js';

export interface ValidatorConfig {
  name: string;
  category: AssessmentCategory;
  criticalityLevel: CriticalityLevel;
  enabled: boolean;
  timeout: number;
  retries: number;
  dependencies: string[];
  environmentRequirements: EnvironmentRequirement[];
}

export interface EnvironmentRequirement {
  name: string;
  type: 'env_var' | 'file' | 'service' | 'tool';
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface IntegrationConfig {
  agentuity: {
    webhookUrl?: string;
    apiKey?: string;
    environment: 'production' | 'staging' | 'localhost';
    timeout: number;
  };
  vault: {
    address?: string;
    token?: string;
    namespace?: string;
    mountPath: string;
    timeout: number;
  };
  database: {
    url?: string;
    enableRLS: boolean;
    timeout: number;
  };
  monitoring: {
    prometheusUrl?: string;
    grafanaUrl?: string;
    alertmanagerUrl?: string;
    timeout: number;
  };
  socialMedia: {
    platforms: string[];
    rateLimitBuffer: number;
    timeout: number;
  };
}

export class SMMAssessmentConfigManager {
  private static instance: SMMAssessmentConfigManager;
  private config: SMMProductionAssessmentConfig;
  private validatorConfigs: Map<string, ValidatorConfig> = new Map();
  private integrationConfig: IntegrationConfig;

  private constructor() {
    // Initialize with default configuration
    this.config = this.getDefaultConfig();
    this.integrationConfig = this.getDefaultIntegrationConfig();
    this.initializeValidatorConfigs();
  }

  public static getInstance(): SMMAssessmentConfigManager {
    if (!SMMAssessmentConfigManager.instance) {
      SMMAssessmentConfigManager.instance = new SMMAssessmentConfigManager();
    }
    return SMMAssessmentConfigManager.instance;
  }

  /**
   * Load configuration from environment and project settings
   */
  public async loadConfiguration(projectRoot: string, environment: string): Promise<void> {
    this.config.projectRoot = projectRoot;
    this.config.environment = environment as 'staging' | 'production';

    // Load environment-specific settings
    await this.loadEnvironmentConfiguration();
    
    // Load integration configuration
    await this.loadIntegrationConfiguration();
    
    // Update validator configurations based on environment
    this.updateValidatorConfigsForEnvironment(environment);
  }

  /**
   * Get assessment configuration
   */
  public getConfig(): SMMProductionAssessmentConfig {
    return { ...this.config };
  }

  /**
   * Get validator configuration by name
   */
  public getValidatorConfig(validatorName: string): ValidatorConfig | undefined {
    return this.validatorConfigs.get(validatorName);
  }

  /**
   * Get all validator configurations
   */
  public getAllValidatorConfigs(): ValidatorConfig[] {
    return Array.from(this.validatorConfigs.values());
  }

  /**
   * Get integration configuration
   */
  public getIntegrationConfig(): IntegrationConfig {
    return { ...this.integrationConfig };
  }

  /**
   * Update configuration from command line arguments or external sources
   */
  public updateConfig(updates: Partial<SMMProductionAssessmentConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Validate configuration completeness and correctness
   */
  public async validateConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check required environment variables
    const requiredEnvVars = this.getRequiredEnvironmentVariables();
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar] && this.config.environment === 'production') {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Check project structure
    const requiredPaths = this.getRequiredProjectPaths();
    for (const path of requiredPaths) {
      const fullPath = join(this.config.projectRoot, path);
      try {
        await fs.access(fullPath);
      } catch {
        errors.push(`Missing required path: ${path}`);
      }
    }

    // Validate integration endpoints
    const integrationErrors = await this.validateIntegrationEndpoints();
    errors.push(...integrationErrors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SMMProductionAssessmentConfig {
    return {
      projectRoot: process.cwd(),
      environment: 'staging',
      assessmentLevel: 'comprehensive',
      skipNonCritical: false,
      parallelExecution: true,
      generateReports: true,
      outputDirectory: join(process.cwd(), 'reports', 'production-assessment')
    };
  }

  /**
   * Get default integration configuration
   */
  private getDefaultIntegrationConfig(): IntegrationConfig {
    return {
      agentuity: {
        environment: 'localhost',
        timeout: 30000
      },
      vault: {
        mountPath: 'secret/',
        timeout: 10000
      },
      database: {
        enableRLS: true,
        timeout: 5000
      },
      monitoring: {
        timeout: 10000
      },
      socialMedia: {
        platforms: ['linkedin', 'twitter', 'facebook', 'instagram'],
        rateLimitBuffer: 0.8, // Use 80% of rate limit
        timeout: 15000
      }
    };
  }

  /**
   * Initialize validator configurations
   */
  private initializeValidatorConfigs(): void {
    const validatorConfigs: ValidatorConfig[] = [
      {
        name: 'agent-orchestration',
        category: AssessmentCategory.AGENT_ORCHESTRATION,
        criticalityLevel: CriticalityLevel.BLOCKER,
        enabled: true,
        timeout: 60000,
        retries: 2,
        dependencies: ['agentuity', 'toolhub'],
        environmentRequirements: [
          {
            name: 'AGENTUITY_WEBHOOK_URL',
            type: 'env_var',
            required: true,
            description: 'Agentuity webhook endpoint URL'
          },
          {
            name: 'TOOLHUB_ENDPOINT',
            type: 'env_var',
            required: true,
            description: 'ToolHub service endpoint'
          }
        ]
      },
      {
        name: 'multi-tenant-security',
        category: AssessmentCategory.MULTI_TENANT_SECURITY,
        criticalityLevel: CriticalityLevel.BLOCKER,
        enabled: true,
        timeout: 30000,
        retries: 1,
        dependencies: ['database'],
        environmentRequirements: [
          {
            name: 'SMM_DATABASE_URL',
            type: 'env_var',
            required: true,
            description: 'PostgreSQL database connection URL'
          }
        ]
      },
      {
        name: 'campaign-simulation',
        category: AssessmentCategory.CAMPAIGN_SIMULATION,
        criticalityLevel: CriticalityLevel.CRITICAL,
        enabled: true,
        timeout: 120000,
        retries: 1,
        dependencies: ['simulator-service'],
        environmentRequirements: [
          {
            name: 'SIMULATOR_SERVICE_URL',
            type: 'env_var',
            required: false,
            defaultValue: 'http://localhost:8003',
            description: 'Simulator service endpoint'
          }
        ]
      },
      {
        name: 'compliance-framework',
        category: AssessmentCategory.COMPLIANCE_FRAMEWORK,
        criticalityLevel: CriticalityLevel.CRITICAL,
        enabled: true,
        timeout: 45000,
        retries: 1,
        dependencies: ['vault', 'audit-service'],
        environmentRequirements: [
          {
            name: 'VAULT_ADDR',
            type: 'env_var',
            required: true,
            description: 'HashiCorp Vault address'
          },
          {
            name: 'VAULT_TOKEN',
            type: 'env_var',
            required: true,
            description: 'Vault authentication token'
          }
        ]
      },
      {
        name: 'external-integration',
        category: AssessmentCategory.EXTERNAL_INTEGRATIONS,
        criticalityLevel: CriticalityLevel.HIGH,
        enabled: true,
        timeout: 45000,
        retries: 2,
        dependencies: ['agentuity', 'n8n', 'vault'],
        environmentRequirements: [
          {
            name: 'N8N_WEBHOOK_URL',
            type: 'env_var',
            required: false,
            description: 'n8n workflow webhook URL'
          }
        ]
      },
      {
        name: 'workspace-lifecycle',
        category: AssessmentCategory.WORKSPACE_LIFECYCLE,
        criticalityLevel: CriticalityLevel.HIGH,
        enabled: true,
        timeout: 60000,
        retries: 1,
        dependencies: ['smm-architect-service'],
        environmentRequirements: [
          {
            name: 'SMM_API_URL',
            type: 'env_var',
            required: false,
            defaultValue: 'http://localhost:8000',
            description: 'SMM Architect service API URL'
          }
        ]
      },
      {
        name: 'data-flow',
        category: AssessmentCategory.DATA_FLOW_VALIDATION,
        criticalityLevel: CriticalityLevel.MEDIUM,
        enabled: true,
        timeout: 30000,
        retries: 1,
        dependencies: ['database', 'redis'],
        environmentRequirements: [
          {
            name: 'REDIS_URL',
            type: 'env_var',
            required: false,
            defaultValue: 'redis://localhost:6379',
            description: 'Redis cache connection URL'
          }
        ]
      },
      {
        name: 'monitoring-alerting',
        category: AssessmentCategory.MONITORING_ALERTING,
        criticalityLevel: CriticalityLevel.MEDIUM,
        enabled: true,
        timeout: 20000,
        retries: 1,
        dependencies: ['prometheus', 'grafana'],
        environmentRequirements: [
          {
            name: 'PROMETHEUS_URL',
            type: 'env_var',
            required: false,
            defaultValue: 'http://localhost:9090',
            description: 'Prometheus server URL'
          },
          {
            name: 'GRAFANA_URL',
            type: 'env_var',
            required: false,
            defaultValue: 'http://localhost:3000',
            description: 'Grafana dashboard URL'
          }
        ]
      }
    ];

    validatorConfigs.forEach(config => {
      this.validatorConfigs.set(config.name, config);
    });
  }

  /**
   * Load environment-specific configuration
   */
  private async loadEnvironmentConfiguration(): Promise<void> {
    // Load from environment variables
    if (process.env['SMM_ASSESSMENT_LEVEL']) {
      this.config.assessmentLevel = process.env['SMM_ASSESSMENT_LEVEL'] as any;
    }

    if (process.env['SMM_ASSESSMENT_PARALLEL']) {
      this.config.parallelExecution = process.env['SMM_ASSESSMENT_PARALLEL'] === 'true';
    }

    if (process.env['SMM_ASSESSMENT_OUTPUT_DIR']) {
      this.config.outputDirectory = process.env['SMM_ASSESSMENT_OUTPUT_DIR'];
    }

    if (process.env['SMM_ASSESSMENT_SKIP_NON_CRITICAL']) {
      this.config.skipNonCritical = process.env['SMM_ASSESSMENT_SKIP_NON_CRITICAL'] === 'true';
    }

    // Load from configuration file if exists
    const configPath = join(this.config.projectRoot, '.smm-assessment.json');
    try {
      const configFile = await fs.readFile(configPath, 'utf-8');
      const fileConfig = JSON.parse(configFile);
      this.config = { ...this.config, ...fileConfig };
    } catch {
      // Configuration file doesn't exist, use defaults
    }
  }

  /**
   * Load integration configuration from environment
   */
  private async loadIntegrationConfiguration(): Promise<void> {
    // Agentuity configuration
    if (process.env['AGENTUITY_WEBHOOK_URL']) {
      this.integrationConfig.agentuity.webhookUrl = process.env['AGENTUITY_WEBHOOK_URL'];
      
      // Determine environment based on URL
      if (process.env['AGENTUITY_WEBHOOK_URL'].includes('localhost')) {
        this.integrationConfig.agentuity.environment = 'localhost';
      } else if (process.env['AGENTUITY_WEBHOOK_URL'].includes('staging')) {
        this.integrationConfig.agentuity.environment = 'staging';
      } else {
        this.integrationConfig.agentuity.environment = 'production';
      }
    }

    if (process.env['AGENTUITY_API_KEY']) {
      this.integrationConfig.agentuity.apiKey = process.env['AGENTUITY_API_KEY'];
    }

    // Vault configuration
    if (process.env['VAULT_ADDR']) {
      this.integrationConfig.vault.address = process.env['VAULT_ADDR'];
    }

    if (process.env['VAULT_TOKEN']) {
      this.integrationConfig.vault.token = process.env['VAULT_TOKEN'];
    }

    if (process.env['VAULT_NAMESPACE']) {
      this.integrationConfig.vault.namespace = process.env['VAULT_NAMESPACE'];
    }

    // Database configuration
    if (process.env['SMM_DATABASE_URL']) {
      this.integrationConfig.database.url = process.env['SMM_DATABASE_URL'];
    }

    // Monitoring configuration
    if (process.env['PROMETHEUS_URL']) {
      this.integrationConfig.monitoring.prometheusUrl = process.env['PROMETHEUS_URL'];
    }

    if (process.env['GRAFANA_URL']) {
      this.integrationConfig.monitoring.grafanaUrl = process.env['GRAFANA_URL'];
    }

    if (process.env['ALERTMANAGER_URL']) {
      this.integrationConfig.monitoring.alertmanagerUrl = process.env['ALERTMANAGER_URL'];
    }
  }

  /**
   * Update validator configurations based on environment
   */
  private updateValidatorConfigsForEnvironment(environment: string): void {
    if (environment === 'production') {
      // In production, all validators should be enabled and have stricter requirements
      this.validatorConfigs.forEach(config => {
        config.enabled = true;
        config.retries = Math.max(1, config.retries);
        
        // Increase timeouts for production
        config.timeout = Math.floor(config.timeout * 1.5);
      });
    } else if (environment === 'staging') {
      // In staging, we can skip some low-priority validators if configured
      if (this.config.skipNonCritical) {
        this.validatorConfigs.forEach(config => {
          if (config.criticalityLevel === CriticalityLevel.LOW ||
              config.criticalityLevel === CriticalityLevel.INFO) {
            config.enabled = false;
          }
        });
      }
    }
  }

  /**
   * Get required environment variables based on enabled validators
   */
  private getRequiredEnvironmentVariables(): string[] {
    const requiredVars: string[] = [];
    
    this.validatorConfigs.forEach(config => {
      if (config.enabled) {
        config.environmentRequirements
          .filter(req => req.required && req.type === 'env_var')
          .forEach(req => requiredVars.push(req.name));
      }
    });

    return [...new Set(requiredVars)]; // Remove duplicates
  }

  /**
   * Get required project paths
   */
  private getRequiredProjectPaths(): string[] {
    return [
      'package.json',
      'tsconfig.json',
      'services',
      'tools',
      'infrastructure',
      'schemas'
    ];
  }

  /**
   * Validate integration endpoints are accessible
   */
  private async validateIntegrationEndpoints(): Promise<string[]> {
    const errors: string[] = [];

    // Only validate in production environment
    if (this.config.environment !== 'production') {
      return errors;
    }

    // Validate Agentuity endpoint
    if (this.integrationConfig.agentuity.webhookUrl) {
      if (this.integrationConfig.agentuity.webhookUrl.includes('localhost')) {
        errors.push('Agentuity webhook URL points to localhost in production environment');
      }
    }

    // Validate Vault endpoint
    if (this.integrationConfig.vault.address) {
      if (this.integrationConfig.vault.address.includes('localhost')) {
        errors.push('Vault address points to localhost in production environment');
      }
    }

    // Validate monitoring endpoints
    if (this.integrationConfig.monitoring.prometheusUrl?.includes('localhost')) {
      errors.push('Prometheus URL points to localhost in production environment');
    }

    if (this.integrationConfig.monitoring.grafanaUrl?.includes('localhost')) {
      errors.push('Grafana URL points to localhost in production environment');
    }

    return errors;
  }

  /**
   * Export configuration to file for debugging/documentation
   */
  public async exportConfiguration(outputPath: string): Promise<void> {
    const exportData = {
      config: this.config,
      validatorConfigs: Array.from(this.validatorConfigs.entries()),
      integrationConfig: this.integrationConfig,
      timestamp: new Date().toISOString()
    };

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
  }
}