import { LocalWorkspace, ConcurrentUpdateError, Stack, ConfigValue } from '@pulumi/pulumi/automation';
import { createPulumiProgram, WorkspaceConfig } from './workspace-program';
import winston from 'winston';
import path from 'path';
import { promises as fs } from 'fs';

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

export interface ProvisioningRequest {
  workspaceId: string;
  tenantId: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  resourceTier: 'small' | 'medium' | 'large' | 'enterprise';
  features?: {
    enableHighAvailability?: boolean;
    enableAutoScaling?: boolean;
    enableDataEncryption?: boolean;
    enableAuditLogging?: boolean;
    enableMonitoring?: boolean;
    enableBackup?: boolean;
  };
  networking?: {
    vpcCidr?: string;
    enablePrivateSubnets?: boolean;
    enableNatGateway?: boolean;
  };
  security?: {
    allowedCidrs?: string[];
    enableVault?: boolean;
    enableOPA?: boolean;
  };
  storage?: {
    databaseSize?: string;
    backupRetentionDays?: number;
    enablePointInTimeRecovery?: boolean;
  };
  tags?: Record<string, string>;
}

export interface ProvisioningResult {
  workspaceId: string;
  stackName: string;
  status: 'succeeded' | 'failed' | 'in-progress';
  outputs?: Record<string, any>;
  resourceCount?: number;
  duration?: number;
  cost?: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface WorkspaceStatus {
  workspaceId: string;
  stackName: string;
  status: 'active' | 'inactive' | 'provisioning' | 'destroying' | 'error';
  lastUpdate: Date;
  resources: Array<{
    type: string;
    name: string;
    status: string;
    urn: string;
  }>;
  outputs: Record<string, any>;
  tags: Record<string, string>;
}

export class WorkspaceProvisioningService {
  private workspaceDir: string;
  private templatePath: string;

  constructor(
    workspaceDir: string = process.env.PULUMI_WORKSPACE_DIR || '/tmp/pulumi-workspaces',
    templatePath: string = path.join(__dirname, '../../../infra/pulumi/templates')
  ) {
    this.workspaceDir = workspaceDir;
    this.templatePath = templatePath;
  }

  /**
   * Provision a new workspace with cloud infrastructure
   */
  async provisionWorkspace(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const startTime = Date.now();
    const stackName = `${request.workspaceId}-${request.environment}`;
    
    logger.info('Starting workspace provisioning', {
      workspaceId: request.workspaceId,
      tenantId: request.tenantId,
      stackName,
      environment: request.environment
    });

    try {
      // Create workspace configuration
      const workspaceConfig = this.createWorkspaceConfig(request);
      
      // Set up Pulumi workspace
      const workspace = await this.setupPulumiWorkspace(stackName, workspaceConfig);
      
      // Create or select stack
      const stack = await this.getOrCreateStack(workspace, stackName);
      
      // Configure stack
      await this.configureStack(stack, workspaceConfig, request);
      
      // Deploy infrastructure
      const upResult = await stack.up({
        onOutput: (msg) => logger.info('Pulumi output', { msg, workspaceId: request.workspaceId })
      });

      const duration = Date.now() - startTime;
      
      // Get stack outputs
      const outputs = await stack.outputs();
      const resources = await stack.listStackResources();
      
      // Estimate costs
      const costEstimate = this.estimateCosts(request.resourceTier, request.region);
      
      logger.info('Workspace provisioning completed', {
        workspaceId: request.workspaceId,
        stackName,
        resourceCount: resources.length,
        duration
      });

      return {
        workspaceId: request.workspaceId,
        stackName,
        status: upResult.summary.result === 'succeeded' ? 'succeeded' : 'failed',
        outputs: this.convertOutputs(outputs),
        resourceCount: resources.length,
        duration,
        cost: costEstimate,
        createdAt: new Date(startTime),
        completedAt: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Workspace provisioning failed', {
        workspaceId: request.workspaceId,
        stackName,
        error: error instanceof Error ? error.message : error,
        duration
      });

      return {
        workspaceId: request.workspaceId,
        stackName,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(startTime),
        completedAt: new Date()
      };
    }
  }

  /**
   * Get status of a provisioned workspace
   */
  async getWorkspaceStatus(workspaceId: string, environment: string): Promise<WorkspaceStatus | null> {
    const stackName = `${workspaceId}-${environment}`;
    
    try {
      const workspace = await this.getExistingWorkspace(stackName);
      const stack = await workspace.selectStack(stackName);
      
      const info = await stack.info();
      const outputs = await stack.outputs();
      const resources = await stack.listStackResources();
      
      return {
        workspaceId,
        stackName,
        status: this.mapStackStatus(info?.result || 'unknown'),
        lastUpdate: new Date(info?.endTime || Date.now()),
        resources: resources.map(r => ({
          type: r.type,
          name: r.logicalName,
          status: 'active', // Pulumi doesn't provide individual resource status
          urn: r.urn
        })),
        outputs: this.convertOutputs(outputs),
        tags: info?.config || {}
      };
      
    } catch (error) {
      logger.warn('Failed to get workspace status', {
        workspaceId,
        stackName,
        error: error instanceof Error ? error.message : error
      });
      return null;
    }
  }

  /**
   * Update an existing workspace configuration
   */
  async updateWorkspace(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const startTime = Date.now();
    const stackName = `${request.workspaceId}-${request.environment}`;
    
    logger.info('Starting workspace update', {
      workspaceId: request.workspaceId,
      stackName
    });

    try {
      const workspace = await this.getExistingWorkspace(stackName);
      const stack = await workspace.selectStack(stackName);
      
      // Update configuration
      const workspaceConfig = this.createWorkspaceConfig(request);
      await this.configureStack(stack, workspaceConfig, request);
      
      // Apply updates
      const upResult = await stack.up({
        onOutput: (msg) => logger.info('Pulumi update output', { msg, workspaceId: request.workspaceId })
      });

      const duration = Date.now() - startTime;
      const outputs = await stack.outputs();
      const resources = await stack.listStackResources();

      return {
        workspaceId: request.workspaceId,
        stackName,
        status: upResult.summary.result === 'succeeded' ? 'succeeded' : 'failed',
        outputs: this.convertOutputs(outputs),
        resourceCount: resources.length,
        duration,
        createdAt: new Date(startTime),
        completedAt: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Workspace update failed', {
        workspaceId: request.workspaceId,
        error: error instanceof Error ? error.message : error
      });

      return {
        workspaceId: request.workspaceId,
        stackName,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(startTime),
        completedAt: new Date()
      };
    }
  }

  /**
   * Destroy workspace infrastructure
   */
  async destroyWorkspace(workspaceId: string, environment: string): Promise<ProvisioningResult> {
    const startTime = Date.now();
    const stackName = `${workspaceId}-${environment}`;
    
    logger.info('Starting workspace destruction', {
      workspaceId,
      stackName
    });

    try {
      const workspace = await this.getExistingWorkspace(stackName);
      const stack = await workspace.selectStack(stackName);
      
      // Destroy infrastructure
      const destroyResult = await stack.destroy({
        onOutput: (msg) => logger.info('Pulumi destroy output', { msg, workspaceId })
      });

      const duration = Date.now() - startTime;

      // Remove stack
      await workspace.removeStack(stackName);
      
      logger.info('Workspace destruction completed', {
        workspaceId,
        stackName,
        duration
      });

      return {
        workspaceId,
        stackName,
        status: destroyResult.summary.result === 'succeeded' ? 'succeeded' : 'failed',
        duration,
        createdAt: new Date(startTime),
        completedAt: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Workspace destruction failed', {
        workspaceId,
        error: error instanceof Error ? error.message : error
      });

      return {
        workspaceId,
        stackName,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(startTime),
        completedAt: new Date()
      };
    }
  }

  /**
   * List all provisioned workspaces for a tenant
   */
  async listWorkspaces(tenantId: string): Promise<WorkspaceStatus[]> {
    try {
      const workspaceDir = path.join(this.workspaceDir, tenantId);
      
      if (!(await this.pathExists(workspaceDir))) {
        return [];
      }

      const entries = await fs.readdir(workspaceDir, { withFileTypes: true });
      const workspaces: WorkspaceStatus[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const workspace = await LocalWorkspace.create({
              workDir: path.join(workspaceDir, entry.name)
            });

            const stacks = await workspace.listStacks();
            
            for (const stackSummary of stacks) {
              const stack = await workspace.selectStack(stackSummary.name);
              const outputs = await stack.outputs();
              const resources = await stack.listStackResources();
              
              workspaces.push({
                workspaceId: this.extractWorkspaceId(stackSummary.name),
                stackName: stackSummary.name,
                status: this.mapStackStatus(stackSummary.lastUpdate?.result || 'unknown'),
                lastUpdate: new Date(stackSummary.lastUpdate?.endTime || Date.now()),
                resources: resources.map(r => ({
                  type: r.type,
                  name: r.logicalName,
                  status: 'active',
                  urn: r.urn
                })),
                outputs: this.convertOutputs(outputs),
                tags: {}
              });
            }
          } catch (error) {
            logger.warn('Failed to read workspace', {
              tenantId,
              workspaceName: entry.name,
              error: error instanceof Error ? error.message : error
            });
          }
        }
      }

      return workspaces;

    } catch (error) {
      logger.error('Failed to list workspaces', {
        tenantId,
        error: error instanceof Error ? error.message : error
      });
      return [];
    }
  }

  /**
   * Preview changes for a workspace update
   */
  async previewWorkspaceChanges(request: ProvisioningRequest): Promise<{
    changes: Array<{
      type: 'create' | 'update' | 'delete' | 'replace';
      resource: string;
      details: any;
    }>;
    summary: string;
  }> {
    const stackName = `${request.workspaceId}-${request.environment}`;
    
    try {
      const workspace = await this.getExistingWorkspace(stackName);
      const stack = await workspace.selectStack(stackName);
      
      // Update configuration for preview
      const workspaceConfig = this.createWorkspaceConfig(request);
      await this.configureStack(stack, workspaceConfig, request);
      
      // Generate preview
      const previewResult = await stack.preview();
      
      const changes = previewResult.changeSummary ? Object.entries(previewResult.changeSummary).map(([type, count]) => ({
        type: type as any,
        resource: 'summary',
        details: { count }
      })) : [];

      return {
        changes,
        summary: `${changes.length} changes planned`
      };

    } catch (error) {
      logger.error('Failed to preview workspace changes', {
        workspaceId: request.workspaceId,
        error: error instanceof Error ? error.message : error
      });
      
      throw new Error(`Preview failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Private helper methods

  private async setupPulumiWorkspace(stackName: string, config: WorkspaceConfig): Promise<LocalWorkspace> {
    const workspaceDir = path.join(this.workspaceDir, config.tenantId, stackName);
    
    // Ensure workspace directory exists
    await fs.mkdir(workspaceDir, { recursive: true });
    
    // Create Pulumi workspace
    const workspace = await LocalWorkspace.create({
      workDir: workspaceDir,
      program: createPulumiProgram(config),
      projectSettings: {
        name: 'smm-architect-workspace',
        runtime: 'nodejs',
        description: `SMM Architect workspace: ${config.workspaceId}`
      }
    });

    return workspace;
  }

  private async getOrCreateStack(workspace: LocalWorkspace, stackName: string): Promise<Stack> {
    try {
      return await workspace.selectStack(stackName);
    } catch (error) {
      // Stack doesn't exist, create it
      return await workspace.createStack(stackName);
    }
  }

  private async getExistingWorkspace(stackName: string): Promise<LocalWorkspace> {
    // Extract tenant ID from existing workspace directory structure
    const workspaceDirs = await fs.readdir(this.workspaceDir, { withFileTypes: true });
    
    for (const tenantDir of workspaceDirs) {
      if (tenantDir.isDirectory()) {
        const workspaceDir = path.join(this.workspaceDir, tenantDir.name, stackName);
        if (await this.pathExists(workspaceDir)) {
          return await LocalWorkspace.create({ workDir: workspaceDir });
        }
      }
    }
    
    throw new Error(`Workspace not found: ${stackName}`);
  }

  private async configureStack(stack: Stack, config: WorkspaceConfig, request: ProvisioningRequest): Promise<void> {
    const configMap: Record<string, ConfigValue> = {
      'aws:region': { value: request.region },
      'workspace': { value: JSON.stringify(config), secret: false }
    };

    // Set additional configuration
    if (request.tags) {
      configMap['workspace:tags'] = { value: JSON.stringify(request.tags), secret: false };
    }

    await stack.setAllConfig(configMap);
  }

  private createWorkspaceConfig(request: ProvisioningRequest): WorkspaceConfig {
    return {
      workspaceId: request.workspaceId,
      tenantId: request.tenantId,
      environment: request.environment,
      region: request.region,
      resourceTier: request.resourceTier,
      features: {
        enableHighAvailability: request.features?.enableHighAvailability || false,
        enableAutoScaling: request.features?.enableAutoScaling || true,
        enableMultiRegion: false,
        enableDataEncryption: request.features?.enableDataEncryption || true,
        enableAuditLogging: request.features?.enableAuditLogging || true,
        enableMonitoring: request.features?.enableMonitoring || true,
        enableBackup: request.features?.enableBackup || (request.environment === 'production')
      },
      networking: {
        vpcCidr: request.networking?.vpcCidr || '10.0.0.0/16',
        enablePrivateSubnets: request.networking?.enablePrivateSubnets || (request.environment === 'production'),
        enableNatGateway: request.networking?.enableNatGateway || (request.environment === 'production'),
        enableVpnAccess: false
      },
      security: {
        enableVault: request.security?.enableVault || true,
        vaultIntegration: 'aws-kms',
        enableOPA: request.security?.enableOPA || false,
        enableNetworkPolicies: request.environment === 'production',
        allowedCidrs: request.security?.allowedCidrs || ['0.0.0.0/0']
      },
      storage: {
        databaseSize: request.storage?.databaseSize || this.getDefaultDatabaseSize(request.resourceTier),
        storageClass: request.resourceTier === 'enterprise' ? 'ssd' : 'standard',
        backupRetentionDays: request.storage?.backupRetentionDays || (request.environment === 'production' ? 30 : 7),
        enablePointInTimeRecovery: request.storage?.enablePointInTimeRecovery || (request.environment === 'production')
      },
      monitoring: {
        enablePrometheus: request.features?.enableMonitoring || true,
        enableGrafana: request.features?.enableMonitoring || true,
        enableAlertManager: request.environment === 'production'
      }
    };
  }

  private getDefaultDatabaseSize(tier: string): string {
    const sizes = {
      small: '20GB',
      medium: '100GB',
      large: '500GB',
      enterprise: '1TB'
    };
    return sizes[tier as keyof typeof sizes] || '100GB';
  }

  private estimateCosts(tier: string, region: string): { hourly: number; daily: number; monthly: number } {
    // Simplified cost estimation - in production, use AWS Pricing API
    const baseCosts = {
      small: 0.15,
      medium: 0.45,
      large: 1.20,
      enterprise: 3.50
    };

    const regionMultiplier = region.startsWith('us-') ? 1.0 : 1.1;
    const hourly = (baseCosts[tier as keyof typeof baseCosts] || 0.45) * regionMultiplier;

    return {
      hourly,
      daily: hourly * 24,
      monthly: hourly * 24 * 30
    };
  }

  private convertOutputs(outputs: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, output] of Object.entries(outputs)) {
      result[key] = output.value;
    }
    
    return result;
  }

  private mapStackStatus(pulumiStatus: string): 'active' | 'inactive' | 'provisioning' | 'destroying' | 'error' {
    switch (pulumiStatus) {
      case 'succeeded':
        return 'active';
      case 'failed':
        return 'error';
      case 'in-progress':
        return 'provisioning';
      default:
        return 'inactive';
    }
  }

  private extractWorkspaceId(stackName: string): string {
    return stackName.split('-')[0];
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}