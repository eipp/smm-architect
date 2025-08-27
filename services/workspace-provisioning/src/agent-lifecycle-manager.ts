import { AgentuityClient, AgentDeployment, AgentTemplate, AgentExecutionRequest, AgentExecutionResult } from './agentuity-client';
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

export interface AgentWorkspace {
  workspaceId: string;
  tenantId: string;
  environment: 'development' | 'staging' | 'production';
  agents: Record<string, AgentDeployment>;
  status: 'initializing' | 'active' | 'partial' | 'failed' | 'terminating';
  createdAt: Date;
  lastHealthCheck?: Date;
  configuration: {
    enabledAgents: string[];
    resourceTier: 'small' | 'medium' | 'large' | 'enterprise';
    autoHealing: boolean;
    monitoringEnabled: boolean;
    executionLimits: {
      maxConcurrentExecutions: number;
      maxExecutionTime: number;
      maxDailyExecutions: number;
    };
  };
}

export interface AgentExecutionPlan {
  workspaceId: string;
  requestId: string;
  workflow: 'research-only' | 'content-creation' | 'full-campaign' | 'compliance-check';
  steps: Array<{
    agentType: string;
    input: Record<string, any>;
    dependencies: string[];
    timeout?: number;
    retryCount?: number;
  }>;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

export interface WorkflowExecution {
  planId: string;
  workspaceId: string;
  currentStep: number;
  executionResults: Record<string, AgentExecutionResult>;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export class AgentLifecycleManager extends EventEmitter {
  private agentuityClient: AgentuityClient;
  private workspaces: Map<string, AgentWorkspace> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(agentuityClient?: AgentuityClient) {
    super();
    this.agentuityClient = agentuityClient || new AgentuityClient();
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Initialize agent suite for a workspace
   */
  async initializeWorkspaceAgents(
    workspaceId: string,
    tenantId: string,
    environment: 'development' | 'staging' | 'production',
    config: Partial<AgentWorkspace['configuration']> = {}
  ): Promise<AgentWorkspace> {
    logger.info('Initializing workspace agents', { workspaceId, tenantId, environment });

    const defaultConfig: AgentWorkspace['configuration'] = {
      enabledAgents: ['research', 'creative', 'legal', 'automation', 'publisher'],
      resourceTier: 'medium',
      autoHealing: true,
      monitoringEnabled: true,
      executionLimits: {
        maxConcurrentExecutions: environment === 'production' ? 10 : 5,
        maxExecutionTime: 300000, // 5 minutes
        maxDailyExecutions: environment === 'production' ? 1000 : 100
      }
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      // Check Agentuity platform health
      await this.agentuityClient.healthCheck();

      // Deploy agent suite
      const agentDeployments = await this.agentuityClient.deployAgentSuite(
        workspaceId,
        tenantId,
        environment,
        finalConfig.enabledAgents
      );

      const workspace: AgentWorkspace = {
        workspaceId,
        tenantId,
        environment,
        agents: agentDeployments,
        status: Object.keys(agentDeployments).length === finalConfig.enabledAgents.length ? 'active' : 'partial',
        createdAt: new Date(),
        configuration: finalConfig
      };

      this.workspaces.set(workspaceId, workspace);
      this.emit('workspaceInitialized', workspace);

      logger.info('Workspace agents initialized successfully', {
        workspaceId,
        agentCount: Object.keys(agentDeployments).length,
        status: workspace.status
      });

      return workspace;

    } catch (error) {
      logger.error('Failed to initialize workspace agents', {
        workspaceId,
        error: error instanceof Error ? error.message : error
      });

      const failedWorkspace: AgentWorkspace = {
        workspaceId,
        tenantId,
        environment,
        agents: {},
        status: 'failed',
        createdAt: new Date(),
        configuration: finalConfig
      };

      this.workspaces.set(workspaceId, failedWorkspace);
      this.emit('workspaceInitializationFailed', { workspaceId, error });

      throw error;
    }
  }

  /**
   * Execute autonomous workflow across multiple agents
   */
  async executeWorkflow(
    workspaceId: string,
    workflow: AgentExecutionPlan['workflow'],
    input: Record<string, any>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<WorkflowExecution> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || workspace.status !== 'active') {
      throw new Error(`Workspace ${workspaceId} is not active or not found`);
    }

    const requestId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const plan = this.createExecutionPlan(workspaceId, requestId, workflow, input, priority);

    logger.info('Starting workflow execution', {
      workspaceId,
      requestId,
      workflow,
      stepCount: plan.steps.length
    });

    const execution: WorkflowExecution = {
      planId: plan.requestId,
      workspaceId,
      currentStep: 0,
      executionResults: {},
      startedAt: new Date(),
      status: 'running'
    };

    this.executions.set(requestId, execution);
    this.emit('workflowStarted', execution);

    // Execute workflow asynchronously
    this.executeWorkflowSteps(plan, execution).catch(error => {
      logger.error('Workflow execution failed', { requestId, error });
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      this.emit('workflowFailed', execution);
    });

    return execution;
  }

  /**
   * Get workspace agent status
   */
  async getWorkspaceStatus(workspaceId: string): Promise<AgentWorkspace | null> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    // Refresh agent statuses
    try {
      const updatedAgents: Record<string, AgentDeployment> = {};
      for (const [agentType, deployment] of Object.entries(workspace.agents)) {
        const status = await this.agentuityClient.getDeploymentStatus(deployment.id);
        updatedAgents[agentType] = status;
      }

      workspace.agents = updatedAgents;
      workspace.lastHealthCheck = new Date();
      
      // Update workspace status based on agent health
      const activeAgents = Object.values(updatedAgents).filter(a => a.status === 'active').length;
      const totalAgents = Object.values(updatedAgents).length;
      
      if (activeAgents === totalAgents && totalAgents > 0) {
        workspace.status = 'active';
      } else if (activeAgents > 0) {
        workspace.status = 'partial';
      } else {
        workspace.status = 'failed';
      }

    } catch (error) {
      logger.error('Failed to refresh workspace status', { workspaceId, error });
      workspace.status = 'failed';
    }

    return workspace;
  }

  /**
   * Terminate workspace agents
   */
  async terminateWorkspaceAgents(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    logger.info('Terminating workspace agents', { workspaceId });

    workspace.status = 'terminating';

    try {
      // Terminate all agent deployments
      const terminationPromises = Object.values(workspace.agents).map(deployment =>
        this.agentuityClient.terminateAgent(deployment.id)
      );

      await Promise.allSettled(terminationPromises);

      // Remove workspace from memory
      this.workspaces.delete(workspaceId);
      this.emit('workspaceTerminated', { workspaceId });

      logger.info('Workspace agents terminated successfully', { workspaceId });

    } catch (error) {
      logger.error('Failed to terminate workspace agents', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(requestId: string): WorkflowExecution | null {
    return this.executions.get(requestId) || null;
  }

  /**
   * List all active workspaces
   */
  listWorkspaces(): AgentWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  /**
   * Heal unhealthy agents automatically
   */
  async healWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !workspace.configuration.autoHealing) {
      return;
    }

    logger.info('Starting workspace healing', { workspaceId });

    const unhealthyAgents = Object.entries(workspace.agents)
      .filter(([_, deployment]) => deployment.health_status !== 'healthy');

    for (const [agentType, deployment] of unhealthyAgents) {
      try {
        // Try to restart the agent
        await this.agentuityClient.terminateAgent(deployment.id);
        
        // Redeploy after a brief wait
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const newDeployment = await this.agentuityClient.deployAgent(
          deployment.template_id,
          workspaceId,
          workspace.tenantId,
          workspace.environment
        );

        workspace.agents[agentType] = newDeployment;
        
        logger.info('Agent healed successfully', { workspaceId, agentType });

      } catch (error) {
        logger.error('Failed to heal agent', { workspaceId, agentType, error });
      }
    }
  }

  /**
   * Private method to create execution plan based on workflow type
   */
  private createExecutionPlan(
    workspaceId: string,
    requestId: string,
    workflow: AgentExecutionPlan['workflow'],
    input: Record<string, any>,
    priority: 'low' | 'normal' | 'high'
  ): AgentExecutionPlan {
    const baseSteps = {
      'research-only': [
        { agentType: 'research', input, dependencies: [] }
      ],
      'content-creation': [
        { agentType: 'research', input, dependencies: [] },
        { agentType: 'creative', input, dependencies: ['research'] },
        { agentType: 'legal', input, dependencies: ['creative'] }
      ],
      'full-campaign': [
        { agentType: 'research', input, dependencies: [] },
        { agentType: 'creative', input, dependencies: ['research'] },
        { agentType: 'legal', input, dependencies: ['creative'] },
        { agentType: 'automation', input, dependencies: ['legal'] },
        { agentType: 'publisher', input, dependencies: ['automation'] }
      ],
      'compliance-check': [
        { agentType: 'legal', input, dependencies: [] }
      ]
    };

    return {
      workspaceId,
      requestId,
      workflow,
      steps: baseSteps[workflow],
      priority,
      createdAt: new Date(),
      status: 'planned'
    };
  }

  /**
   * Private method to execute workflow steps
   */
  private async executeWorkflowSteps(plan: AgentExecutionPlan, execution: WorkflowExecution): Promise<void> {
    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        execution.currentStep = i;

        // Check dependencies
        for (const dep of step.dependencies) {
          if (!execution.executionResults[dep]) {
            throw new Error(`Dependency ${dep} not completed`);
          }
        }

        // Get agent deployment
        const workspace = this.workspaces.get(plan.workspaceId)!;
        const agent = workspace.agents[step.agentType];
        if (!agent) {
          throw new Error(`Agent ${step.agentType} not available in workspace`);
        }

        // Enhance input with previous results
        const enhancedInput = {
          ...step.input,
          context: execution.executionResults
        };

        // Execute agent
        const result = await this.agentuityClient.executeAgent({
          agent_id: agent.id,
          workspace_id: plan.workspaceId,
          input: enhancedInput,
          priority: plan.priority,
          timeout: step.timeout
        });

        // Wait for completion
        const finalResult = await this.waitForExecution(result.execution_id, step.timeout || 300000);
        execution.executionResults[step.agentType] = finalResult;

        this.emit('stepCompleted', { plan, execution, step: i });
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      this.emit('workflowCompleted', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      throw error;
    }
  }

  /**
   * Wait for agent execution to complete
   */
  private async waitForExecution(executionId: string, timeout: number): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await this.agentuityClient.getExecutionResult(executionId);
      
      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'failed' || result.status === 'timeout') {
        throw new Error(`Agent execution failed: ${result.error || 'Unknown error'}`);
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Agent execution timeout after ${timeout}ms`);
  }

  /**
   * Start health monitoring for all workspaces
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const workspace of this.workspaces.values()) {
        if (workspace.configuration.monitoringEnabled) {
          try {
            await this.getWorkspaceStatus(workspace.workspaceId);
            
            // Auto-heal if configured
            if (workspace.configuration.autoHealing && workspace.status !== 'active') {
              await this.healWorkspace(workspace.workspaceId);
            }
          } catch (error) {
            logger.error('Health check failed', { workspaceId: workspace.workspaceId, error });
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop health monitoring
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.removeAllListeners();
  }
}

export default AgentLifecycleManager;