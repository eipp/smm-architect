import axios, { AxiosInstance, AxiosResponse } from 'axios';
import winston from 'winston';
import { promises as fs } from 'fs';
import path from 'path';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export interface AgentTemplate {
  id: string;
  name: string;
  version: string;
  type: 'research' | 'creative' | 'legal' | 'automation' | 'publisher' | 'planner';
  description: string;
  triggers: string[];
  environment_requirements: {
    memory: string;
    cpu: string;
    gpu?: boolean;
    timeout: string;
  };
  integrations: Record<string, any>;
  config: Record<string, any>;
}

export interface AgentDeployment {
  id: string;
  template_id: string;
  workspace_id: string;
  tenant_id: string;
  environment: 'development' | 'staging' | 'production';
  status: 'deploying' | 'active' | 'inactive' | 'failed' | 'terminating';
  endpoint?: string;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  deployed_at: Date;
  last_activity?: Date;
  metrics?: {
    executions: number;
    avg_duration: number;
    success_rate: number;
    error_count: number;
  };
}

export interface AgentExecutionRequest {
  agent_id: string;
  workspace_id: string;
  input: Record<string, any>;
  context?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface AgentExecutionResult {
  execution_id: string;
  agent_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timeout';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  started_at: Date;
  completed_at?: Date;
  duration?: number;
  metadata: {
    tokens_used?: number;
    cost_estimate?: number;
    model_calls?: number;
  };
}

export class AgentuityClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private templatesPath: string;

  constructor(
    baseUrl: string = process.env.AGENTUITY_API_URL || 'https://api.agentuity.com',
    apiKey: string = process.env.AGENTUITY_API_KEY || '',
    templatesPath: string = path.join(__dirname, '../../../packages/workflows/agentuity')
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.templatesPath = templatesPath;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SMM-Architect/1.0.0'
      }
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Agentuity API request', {
          method: config.method,
          url: config.url,
          data: config.data ? 'present' : 'none'
        });
        return config;
      },
      (error) => {
        logger.error('Agentuity API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Agentuity API response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('Agentuity API error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Upload agent template to Agentuity platform
   */
  async uploadTemplate(agentType: string): Promise<AgentTemplate> {
    try {
      const templatePath = path.join(this.templatesPath, agentType, `${agentType}-agent-template.json`);
      
      logger.info('Loading agent template', { agentType, templatePath });
      
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateContent);

      const response: AxiosResponse<AgentTemplate> = await this.client.post('/v1/templates', {
        name: template.name || `${agentType}-agent`,
        version: template.version || '1.0.0',
        type: agentType as AgentTemplate['type'],
        description: template.description || `SMM Architect ${agentType} agent`,
        template_data: template,
        tags: ['smm-architect', agentType, 'production'],
        metadata: {
          source: 'smm-architect',
          framework: 'agentuity',
          protocol: 'mcp-2.0'
        }
      });

      logger.info('Agent template uploaded successfully', {
        agentType,
        templateId: response.data.id,
        version: response.data.version
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to upload agent template', {
        agentType,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Failed to upload ${agentType} agent template: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Deploy agent instance for a workspace
   */
  async deployAgent(
    templateId: string,
    workspaceId: string,
    tenantId: string,
    environment: 'development' | 'staging' | 'production'
  ): Promise<AgentDeployment> {
    try {
      const deploymentConfig = {
        template_id: templateId,
        workspace_id: workspaceId,
        tenant_id: tenantId,
        environment,
        instance_name: `${workspaceId}-agent-${templateId.split('-')[0]}`,
        resource_allocation: this.getResourceAllocation(environment),
        environment_variables: {
          WORKSPACE_ID: workspaceId,
          TENANT_ID: tenantId,
          ENVIRONMENT: environment,
          TOOLHUB_API_ENDPOINT: process.env.TOOLHUB_API_ENDPOINT,
          VAULT_ADDR: process.env.VAULT_ADDR,
          LOG_LEVEL: process.env.LOG_LEVEL || 'info'
        },
        security: {
          network_policies: ['workspace-isolation', 'tenant-isolation'],
          secrets_mount: [`/workspace/${workspaceId}/secrets`],
          rbac_role: `workspace-agent-${environment}`
        }
      };

      const response: AxiosResponse<AgentDeployment> = await this.client.post('/v1/deployments', deploymentConfig);

      logger.info('Agent deployed successfully', {
        templateId,
        workspaceId,
        deploymentId: response.data.id,
        status: response.data.status
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to deploy agent', {
        templateId,
        workspaceId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Failed to deploy agent: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get agent deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<AgentDeployment> {
    try {
      const response: AxiosResponse<AgentDeployment> = await this.client.get(`/v1/deployments/${deploymentId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get deployment status', {
        deploymentId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Failed to get deployment status: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Execute agent with input data
   */
  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    try {
      const response: AxiosResponse<AgentExecutionResult> = await this.client.post('/v1/executions', {
        agent_id: request.agent_id,
        workspace_id: request.workspace_id,
        input: request.input,
        context: request.context || {},
        priority: request.priority || 'normal',
        timeout: request.timeout || 300000, // 5 minutes default
        metadata: {
          source: 'smm-architect-workspace-provisioning',
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Agent execution started', {
        executionId: response.data.execution_id,
        agentId: request.agent_id,
        workspaceId: request.workspace_id
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to execute agent', {
        agentId: request.agent_id,
        workspaceId: request.workspace_id,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Failed to execute agent: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get execution result
   */
  async getExecutionResult(executionId: string): Promise<AgentExecutionResult> {
    try {
      const response: AxiosResponse<AgentExecutionResult> = await this.client.get(`/v1/executions/${executionId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get execution result', {
        executionId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Failed to get execution result: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * List all agent deployments for a workspace
   */
  async listWorkspaceAgents(workspaceId: string): Promise<AgentDeployment[]> {
    try {
      const response: AxiosResponse<{ deployments: AgentDeployment[] }> = await this.client.get('/v1/deployments', {
        params: { workspace_id: workspaceId }
      });
      return response.data.deployments;
    } catch (error) {
      logger.error('Failed to list workspace agents', {
        workspaceId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Failed to list workspace agents: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Terminate agent deployment
   */
  async terminateAgent(deploymentId: string): Promise<void> {
    try {
      await this.client.delete(`/v1/deployments/${deploymentId}`);
      
      logger.info('Agent terminated successfully', { deploymentId });

    } catch (error) {
      logger.error('Failed to terminate agent', {
        deploymentId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Failed to terminate agent: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Health check for Agentuity platform
   */
  async healthCheck(): Promise<{ status: string; version: string; timestamp: Date }> {
    try {
      const response = await this.client.get('/v1/health');
      return {
        status: response.data.status,
        version: response.data.version,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Agentuity health check failed', {
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Agentuity health check failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get resource allocation based on environment
   */
  private getResourceAllocation(environment: string) {
    const allocations = {
      development: {
        memory: '1Gi',
        cpu: '0.5',
        replicas: 1,
        max_concurrent_executions: 5
      },
      staging: {
        memory: '2Gi',
        cpu: '1',
        replicas: 2,
        max_concurrent_executions: 10
      },
      production: {
        memory: '4Gi',
        cpu: '2',
        replicas: 3,
        max_concurrent_executions: 20
      }
    };

    return allocations[environment as keyof typeof allocations] || allocations.development;
  }

  /**
   * Batch upload all SMM Architect agent templates
   */
  async uploadAllTemplates(): Promise<Record<string, AgentTemplate>> {
    const agentTypes = ['research', 'creative', 'legal', 'automation', 'publisher', 'planner'];
    const results: Record<string, AgentTemplate> = {};

    for (const agentType of agentTypes) {
      try {
        const template = await this.uploadTemplate(agentType);
        results[agentType] = template;
      } catch (error) {
        logger.error(`Failed to upload ${agentType} template`, { error });
        // Continue with other templates
      }
    }

    logger.info('Batch template upload completed', {
      successful: Object.keys(results).length,
      total: agentTypes.length
    });

    return results;
  }

  /**
   * Deploy complete agent suite for a workspace
   */
  async deployAgentSuite(
    workspaceId: string,
    tenantId: string,
    environment: 'development' | 'staging' | 'production',
    agentTypes: string[] = ['research', 'creative', 'legal', 'automation', 'publisher']
  ): Promise<Record<string, AgentDeployment>> {
    const deployments: Record<string, AgentDeployment> = {};

    // First, ensure templates are uploaded
    const templates = await this.uploadAllTemplates();

    // Deploy each agent
    for (const agentType of agentTypes) {
      try {
        const template = templates[agentType];
        if (template) {
          const deployment = await this.deployAgent(template.id, workspaceId, tenantId, environment);
          deployments[agentType] = deployment;

          // Wait a bit between deployments to avoid overwhelming the platform
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        logger.error(`Failed to deploy ${agentType} agent`, { workspaceId, error });
        // Continue with other agents
      }
    }

    logger.info('Agent suite deployment completed', {
      workspaceId,
      successful: Object.keys(deployments).length,
      total: agentTypes.length
    });

    return deployments;
  }
}

export default AgentuityClient;