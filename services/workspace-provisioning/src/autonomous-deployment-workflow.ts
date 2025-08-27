import { WorkspaceProvisioningService, ProvisioningRequest } from './provisioning-service';
import { AgentuityClient } from './agentuity-client';
import AgentLifecycleManager, { AgentExecutionPlan } from './agent-lifecycle-manager';
import winston from 'winston';
import { EventEmitter } from 'events';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export interface TenantConfiguration {
  tenantId: string;
  organizationName: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  features: {
    enabledPlatforms: string[];
    maxWorkspaces: number;
    maxAgentsPerWorkspace: number;
    maxDailyExecutions: number;
    enableAdvancedAnalytics: boolean;
    enableCustomAgents: boolean;
  };
  compliance: {
    enabledRegulations: string[];
    dataRetentionPeriod: number;
    enableAuditLogging: boolean;
    enableDataEncryption: boolean;
  };
  billing: {
    billingModel: 'usage-based' | 'fixed' | 'enterprise';
    monthlyLimit?: number;
    costCenterCode?: string;
  };
}

export interface WorkspaceTemplate {
  templateId: string;
  name: string;
  description: string;
  category: 'development' | 'testing' | 'production' | 'analytics' | 'custom';
  defaultConfiguration: Partial<ProvisioningRequest>;
  requiredAgents: string[];
  estimatedCost: {
    setup: number;
    monthlyOperational: number;
  };
  prerequisites: string[];
  tags: string[];
}

export interface DeploymentPlan {
  planId: string;
  tenantId: string;
  workspaces: Array<{
    workspaceId: string;
    template: WorkspaceTemplate;
    configuration: ProvisioningRequest;
    priority: 'low' | 'normal' | 'high';
    dependencies: string[];
  }>;
  totalEstimatedCost: number;
  estimatedDuration: number;
  createdAt: Date;
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

export interface DeploymentExecution {
  planId: string;
  tenantId: string;
  currentWorkspace: number;
  workspaceResults: Record<string, {
    status: 'pending' | 'provisioning' | 'completed' | 'failed';
    infrastructureResult?: any;
    agentResults?: any;
    error?: string;
    duration?: number;
  }>;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalCost?: number;
}

export class AutonomousDeploymentWorkflow extends EventEmitter {
  private provisioningService: WorkspaceProvisioningService;
  private agentLifecycleManager: AgentLifecycleManager;
  private tenantConfigurations: Map<string, TenantConfiguration> = new Map();
  private workspaceTemplates: Map<string, WorkspaceTemplate> = new Map();
  private activeDeployments: Map<string, DeploymentExecution> = new Map();

  constructor(
    provisioningService?: WorkspaceProvisioningService,
    agentuityClient?: AgentuityClient
  ) {
    super();
    this.provisioningService = provisioningService || new WorkspaceProvisioningService();
    this.agentLifecycleManager = new AgentLifecycleManager(agentuityClient);
    
    // Initialize default workspace templates
    this.initializeDefaultTemplates();
  }

  /**
   * Register a tenant with their configuration
   */
  async registerTenant(config: TenantConfiguration): Promise<void> {
    logger.info('Registering tenant', { 
      tenantId: config.tenantId, 
      organizationName: config.organizationName,
      subscriptionTier: config.subscriptionTier 
    });

    // Validate tenant configuration
    this.validateTenantConfiguration(config);

    // Store tenant configuration
    this.tenantConfigurations.set(config.tenantId, config);

    // Emit tenant registered event
    this.emit('tenantRegistered', config);

    logger.info('Tenant registered successfully', { tenantId: config.tenantId });
  }

  /**
   * Create a deployment plan for autonomous workspace provisioning
   */
  async createDeploymentPlan(
    tenantId: string,
    workspaceRequests: Array<{
      workspaceId: string;
      templateId: string;
      environment: 'development' | 'staging' | 'production';
      customConfiguration?: Partial<ProvisioningRequest>;
      priority?: 'low' | 'normal' | 'high';
    }>
  ): Promise<DeploymentPlan> {
    const tenantConfig = this.tenantConfigurations.get(tenantId);
    if (!tenantConfig) {
      throw new Error(`Tenant ${tenantId} not registered`);
    }

    logger.info('Creating deployment plan', { 
      tenantId, 
      workspaceCount: workspaceRequests.length 
    });

    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let totalEstimatedCost = 0;
    let estimatedDuration = 0;

    const workspaces = [];

    for (const request of workspaceRequests) {
      const template = this.workspaceTemplates.get(request.templateId);
      if (!template) {
        throw new Error(`Template ${request.templateId} not found`);
      }

      // Merge template configuration with custom configuration
      const configuration = this.mergeConfigurations(
        template.defaultConfiguration,
        request.customConfiguration || {},
        tenantConfig,
        request.environment
      );

      // Add tenant and workspace IDs
      configuration.tenantId = tenantId;
      configuration.workspaceId = request.workspaceId;
      configuration.environment = request.environment;

      workspaces.push({
        workspaceId: request.workspaceId,
        template,
        configuration,
        priority: request.priority || 'normal',
        dependencies: []
      });

      totalEstimatedCost += template.estimatedCost.setup + template.estimatedCost.monthlyOperational;
      estimatedDuration += 15; // 15 minutes per workspace estimate
    }

    const plan: DeploymentPlan = {
      planId,
      tenantId,
      workspaces,
      totalEstimatedCost,
      estimatedDuration,
      createdAt: new Date(),
      status: 'planned'
    };

    this.emit('deploymentPlanCreated', plan);
    return plan;
  }

  /**
   * Execute a deployment plan autonomously
   */
  async executeDeploymentPlan(plan: DeploymentPlan): Promise<DeploymentExecution> {
    logger.info('Starting autonomous deployment execution', { 
      planId: plan.planId, 
      tenantId: plan.tenantId,
      workspaceCount: plan.workspaces.length 
    });

    const execution: DeploymentExecution = {
      planId: plan.planId,
      tenantId: plan.tenantId,
      currentWorkspace: 0,
      workspaceResults: {},
      startedAt: new Date(),
      status: 'running'
    };

    this.activeDeployments.set(plan.planId, execution);
    this.emit('deploymentStarted', execution);

    // Execute deployment asynchronously
    this.executeWorkspacesSequentially(plan, execution)
      .then(() => {
        execution.status = 'completed';
        execution.completedAt = new Date();
        this.emit('deploymentCompleted', execution);
      })
      .catch(error => {
        execution.status = 'failed';
        execution.completedAt = new Date();
        this.emit('deploymentFailed', { execution, error });
      });

    return execution;
  }

  /**
   * Get status of a deployment execution
   */
  getDeploymentStatus(planId: string): DeploymentExecution | null {
    return this.activeDeployments.get(planId) || null;
  }

  /**
   * Cancel an active deployment
   */
  async cancelDeployment(planId: string): Promise<void> {
    const execution = this.activeDeployments.get(planId);
    if (!execution || execution.status !== 'running') {
      throw new Error(`Deployment ${planId} not found or not running`);
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    
    this.emit('deploymentCancelled', execution);
    logger.info('Deployment cancelled', { planId });
  }

  /**
   * Create autonomous marketing campaign workflow
   */
  async createMarketingCampaign(
    workspaceId: string,
    campaignConfig: {
      objective: 'brand-awareness' | 'lead-generation' | 'engagement' | 'conversion';
      targetAudience: {
        demographics: string[];
        interests: string[];
        platforms: string[];
      };
      contentParameters: {
        tone: string;
        topics: string[];
        frequency: 'daily' | 'weekly' | 'bi-weekly';
        duration: number; // days
      };
      constraints: {
        budget?: number;
        complianceRequirements: string[];
        brandGuidelines?: any;
      };
    }
  ): Promise<AgentExecutionPlan> {
    logger.info('Creating autonomous marketing campaign', { 
      workspaceId, 
      objective: campaignConfig.objective 
    });

    // Create comprehensive workflow that uses all agents
    const workflowInput = {
      campaign: campaignConfig,
      timestamp: new Date().toISOString(),
      workspaceId
    };

    // Execute full campaign workflow
    const execution = await this.agentLifecycleManager.executeWorkflow(
      workspaceId,
      'full-campaign',
      workflowInput,
      'normal'
    );

    this.emit('campaignCreated', { workspaceId, campaignConfig, execution });
    
    return {
      workspaceId,
      requestId: execution.planId,
      workflow: 'full-campaign',
      steps: [],
      priority: 'normal',
      createdAt: new Date(),
      status: 'executing'
    };
  }

  /**
   * Monitor and optimize autonomous operations
   */
  async optimizeWorkspaceOperations(workspaceId: string): Promise<{
    currentPerformance: any;
    recommendations: string[];
    optimizations: any[];
  }> {
    const agentStatus = await this.agentLifecycleManager.getWorkspaceStatus(workspaceId);
    
    if (!agentStatus) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const recommendations: string[] = [];
    const optimizations: any[] = [];

    // Analyze agent performance
    if (agentStatus.status !== 'active') {
      recommendations.push('Some agents are not healthy - consider healing workspace');
      optimizations.push({
        type: 'heal-agents',
        priority: 'high',
        action: () => this.agentLifecycleManager.healWorkspace(workspaceId)
      });
    }

    // Check for underutilized agents
    const activeAgents = Object.values(agentStatus.agents).filter(a => a.status === 'active').length;
    const totalAgents = Object.keys(agentStatus.agents).length;
    
    if (activeAgents < totalAgents * 0.8) {
      recommendations.push('Some agents are underutilized - consider optimizing resource allocation');
    }

    return {
      currentPerformance: {
        agentHealth: agentStatus.status,
        activeAgents,
        totalAgents,
        lastHealthCheck: agentStatus.lastHealthCheck
      },
      recommendations,
      optimizations
    };
  }

  /**
   * Private method to execute workspaces sequentially
   */
  private async executeWorkspacesSequentially(plan: DeploymentPlan, execution: DeploymentExecution): Promise<void> {
    for (let i = 0; i < plan.workspaces.length; i++) {
      const workspace = plan.workspaces[i];
      execution.currentWorkspace = i;

      logger.info('Provisioning workspace', { 
        workspaceId: workspace.workspaceId,
        step: i + 1,
        total: plan.workspaces.length 
      });

      execution.workspaceResults[workspace.workspaceId] = {
        status: 'provisioning'
      };

      try {
        const startTime = Date.now();
        
        // Provision infrastructure and agents
        const result = await this.provisioningService.provisionWorkspace(workspace.configuration);
        
        const duration = Date.now() - startTime;

        execution.workspaceResults[workspace.workspaceId] = {
          status: 'completed',
          infrastructureResult: result,
          duration
        };

        this.emit('workspaceProvisioned', { workspace, result });

      } catch (error) {
        execution.workspaceResults[workspace.workspaceId] = {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        };

        this.emit('workspaceProvisioningFailed', { workspace, error });
        
        // Continue with other workspaces (or throw to stop execution)
        logger.error('Workspace provisioning failed', { 
          workspaceId: workspace.workspaceId, 
          error 
        });
      }
    }
  }

  /**
   * Initialize default workspace templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: WorkspaceTemplate[] = [
      {
        templateId: 'smm-basic',
        name: 'Basic SMM Workspace',
        description: 'Basic social media marketing workspace with essential agents',
        category: 'production',
        defaultConfiguration: {
          resourceTier: 'medium',
          features: {
            enableHighAvailability: false,
            enableAutoScaling: true,
            enableDataEncryption: true,
            enableAuditLogging: true,
            enableMonitoring: true
          },
          agents: {
            enableAgents: true,
            enabledAgentTypes: ['research', 'creative', 'legal', 'publisher'],
            autoHealing: true,
            resourceAllocation: 'standard'
          }
        } as Partial<ProvisioningRequest>,
        requiredAgents: ['research', 'creative', 'legal', 'publisher'],
        estimatedCost: {
          setup: 50,
          monthlyOperational: 400
        },
        prerequisites: [],
        tags: ['basic', 'smm', 'production']
      },
      {
        templateId: 'smm-enterprise',
        name: 'Enterprise SMM Workspace',
        description: 'Full-featured enterprise workspace with all agents and high availability',
        category: 'production',
        defaultConfiguration: {
          resourceTier: 'enterprise',
          features: {
            enableHighAvailability: true,
            enableAutoScaling: true,
            enableDataEncryption: true,
            enableAuditLogging: true,
            enableMonitoring: true,
            enableBackup: true
          },
          agents: {
            enableAgents: true,
            enabledAgentTypes: ['research', 'creative', 'legal', 'automation', 'publisher'],
            autoHealing: true,
            resourceAllocation: 'performance'
          }
        } as Partial<ProvisioningRequest>,
        requiredAgents: ['research', 'creative', 'legal', 'automation', 'publisher'],
        estimatedCost: {
          setup: 200,
          monthlyOperational: 2500
        },
        prerequisites: ['enterprise-subscription'],
        tags: ['enterprise', 'smm', 'production', 'high-availability']
      },
      {
        templateId: 'smm-development',
        name: 'Development SMM Workspace',
        description: 'Lightweight development workspace for testing and development',
        category: 'development',
        defaultConfiguration: {
          resourceTier: 'small',
          features: {
            enableHighAvailability: false,
            enableAutoScaling: false,
            enableDataEncryption: false,
            enableAuditLogging: false,
            enableMonitoring: true
          },
          agents: {
            enableAgents: true,
            enabledAgentTypes: ['research', 'creative'],
            autoHealing: false,
            resourceAllocation: 'minimal'
          }
        } as Partial<ProvisioningRequest>,
        requiredAgents: ['research', 'creative'],
        estimatedCost: {
          setup: 10,
          monthlyOperational: 150
        },
        prerequisites: [],
        tags: ['development', 'testing', 'lightweight']
      }
    ];

    defaultTemplates.forEach(template => {
      this.workspaceTemplates.set(template.templateId, template);
    });

    logger.info('Default workspace templates initialized', { 
      templateCount: defaultTemplates.length 
    });
  }

  /**
   * Validate tenant configuration
   */
  private validateTenantConfiguration(config: TenantConfiguration): void {
    if (!config.tenantId || !config.organizationName) {
      throw new Error('Tenant ID and organization name are required');
    }

    if (!['starter', 'professional', 'enterprise'].includes(config.subscriptionTier)) {
      throw new Error('Invalid subscription tier');
    }

    // Add more validation as needed
  }

  /**
   * Merge template configuration with custom configuration and tenant settings
   */
  private mergeConfigurations(
    templateConfig: Partial<ProvisioningRequest>,
    customConfig: Partial<ProvisioningRequest>,
    tenantConfig: TenantConfiguration,
    environment: string
  ): ProvisioningRequest {
    // Start with template defaults
    const merged = { ...templateConfig } as ProvisioningRequest;

    // Apply tenant-specific settings
    if (tenantConfig.subscriptionTier === 'enterprise') {
      merged.resourceTier = 'enterprise';
      merged.features = merged.features || {};
      merged.features.enableHighAvailability = true;
      merged.features.enableBackup = true;
    }

    // Apply compliance requirements
    if (tenantConfig.compliance.enableDataEncryption) {
      merged.features = merged.features || {};
      merged.features.enableDataEncryption = true;
    }

    if (tenantConfig.compliance.enableAuditLogging) {
      merged.features = merged.features || {};
      merged.features.enableAuditLogging = true;
    }

    // Apply environment-specific settings
    if (environment === 'production') {
      merged.features = merged.features || {};
      merged.features.enableMonitoring = true;
      merged.features.enableAuditLogging = true;
    }

    // Apply custom configuration (highest priority)
    Object.assign(merged, customConfig);

    return merged;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.agentLifecycleManager.destroy();
    this.provisioningService.destroy();
    this.removeAllListeners();
  }
}

export default AutonomousDeploymentWorkflow;