import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  ModelMetadata,
  ModelEndpoint,
  ModelHealth,
  AgentModelPreference,
  WorkspaceModelConfig,
  ModelStatus,
  HealthIssue
} from '../types';
import { Logger } from '../utils/logger';

export class ModelRegistry extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private models: Map<string, ModelMetadata> = new Map();
  private endpoints: Map<string, ModelEndpoint> = new Map();
  private healthStatus: Map<string, ModelHealth> = new Map();
  private agentPreferences: Map<string, AgentModelPreference> = new Map();
  private workspaceConfigs: Map<string, WorkspaceModelConfig> = new Map();

  constructor(redisUrl: string) {
    super();
    this.redis = new Redis(redisUrl);
    this.logger = new Logger('ModelRegistry');
    this.initializeDefaults();
  }

  /**
   * Register a new AI model
   */
  async registerModel(model: Omit<ModelMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelMetadata> {
    const modelId = uuidv4();
    const now = new Date();
    
    const modelMetadata: ModelMetadata = {
      ...model,
      id: modelId,
      createdAt: now,
      updatedAt: now
    };

    // Store in memory cache
    this.models.set(modelId, modelMetadata);

    // Persist to Redis
    await this.redis.hset(
      'models',
      modelId,
      JSON.stringify(modelMetadata)
    );

    // Store model by provider for quick lookup
    await this.redis.sadd(`models:${model.provider}`, modelId);
    await this.redis.sadd(`models:type:${model.modelType}`, modelId);

    this.logger.info(`Model registered: ${model.name} (${modelId})`);
    this.emit('modelRegistered', modelMetadata);

    return modelMetadata;
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<ModelMetadata | null> {
    // Check memory cache first
    if (this.models.has(modelId)) {
      return this.models.get(modelId)!;
    }

    // Fallback to Redis
    const modelData = await this.redis.hget('models', modelId);
    if (modelData) {
      const model = JSON.parse(modelData) as ModelMetadata;
      this.models.set(modelId, model);
      return model;
    }

    return null;
  }

  /**
   * Update model status
   */
  async updateModelStatus(modelId: string, status: ModelStatus): Promise<void> {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    model.status = status;
    model.updatedAt = new Date();

    this.models.set(modelId, model);
    await this.redis.hset('models', modelId, JSON.stringify(model));

    this.logger.info(`Model status updated: ${modelId} -> ${status}`);
    this.emit('modelStatusChanged', { modelId, status });
  }

  /**
   * Get models by criteria
   */
  async getModelsByCriteria(criteria: {
    provider?: string;
    modelType?: string;
    status?: ModelStatus;
    capabilities?: string[];
  }): Promise<ModelMetadata[]> {
    let modelIds: Set<string> = new Set();

    // Get by provider
    if (criteria.provider) {
      const providerModels = await this.redis.smembers(`models:${criteria.provider}`);
      modelIds = new Set(providerModels);
    }

    // Filter by type
    if (criteria.modelType) {
      const typeModels = await this.redis.smembers(`models:type:${criteria.modelType}`);
      if (modelIds.size === 0) {
        modelIds = new Set(typeModels);
      } else {
        modelIds = new Set([...modelIds].filter(id => typeModels.includes(id)));
      }
    }

    // If no specific criteria, get all models
    if (modelIds.size === 0) {
      const allModelIds = await this.redis.hkeys('models');
      modelIds = new Set(allModelIds);
    }

    const models: ModelMetadata[] = [];
    for (const modelId of modelIds) {
      const model = await this.getModel(modelId);
      if (model) {
        // Filter by status
        if (criteria.status && model.status !== criteria.status) {
          continue;
        }

        // Filter by capabilities
        if (criteria.capabilities && criteria.capabilities.length > 0) {
          const hasRequiredCapabilities = criteria.capabilities.every(cap =>
            model.capabilities.some(c => c.type === cap)
          );
          if (!hasRequiredCapabilities) {
            continue;
          }
        }

        models.push(model);
      }
    }

    return models;
  }

  /**
   * Register model endpoint
   */
  async registerEndpoint(endpoint: Omit<ModelEndpoint, 'id'>): Promise<ModelEndpoint> {
    const endpointId = uuidv4();
    const endpointData: ModelEndpoint = {
      ...endpoint,
      id: endpointId
    };

    this.endpoints.set(endpointId, endpointData);
    await this.redis.hset('endpoints', endpointId, JSON.stringify(endpointData));
    await this.redis.sadd(`endpoints:model:${endpoint.modelId}`, endpointId);

    this.logger.info(`Endpoint registered: ${endpoint.url} for model ${endpoint.modelId}`);
    return endpointData;
  }

  /**
   * Get endpoints for model
   */
  async getModelEndpoints(modelId: string): Promise<ModelEndpoint[]> {
    const endpointIds = await this.redis.smembers(`endpoints:model:${modelId}`);
    const endpoints: ModelEndpoint[] = [];

    for (const endpointId of endpointIds) {
      const endpointData = await this.redis.hget('endpoints', endpointId);
      if (endpointData) {
        endpoints.push(JSON.parse(endpointData));
      }
    }

    return endpoints;
  }

  /**
   * Update model health status
   */
  async updateModelHealth(modelId: string, health: Partial<ModelHealth>): Promise<void> {
    const currentHealth = this.healthStatus.get(modelId) || {
      modelId,
      status: 'unknown',
      lastChecked: new Date(),
      uptime: 0,
      responseTime: 0,
      errorRate: 0,
      availability: 0,
      healthScore: 0,
      issues: []
    };

    const updatedHealth: ModelHealth = {
      ...currentHealth,
      ...health,
      lastChecked: new Date()
    };

    // Calculate health score
    updatedHealth.healthScore = this.calculateHealthScore(updatedHealth);

    this.healthStatus.set(modelId, updatedHealth);
    await this.redis.hset('health', modelId, JSON.stringify(updatedHealth));

    // Update model status based on health
    const model = await this.getModel(modelId);
    if (model) {
      const newStatus = this.determineModelStatus(updatedHealth);
      if (model.status !== newStatus) {
        await this.updateModelStatus(modelId, newStatus);
      }
    }

    this.emit('healthUpdated', updatedHealth);
  }

  /**
   * Get model health
   */
  async getModelHealth(modelId: string): Promise<ModelHealth | null> {
    if (this.healthStatus.has(modelId)) {
      return this.healthStatus.get(modelId)!;
    }

    const healthData = await this.redis.hget('health', modelId);
    if (healthData) {
      const health = JSON.parse(healthData) as ModelHealth;
      this.healthStatus.set(modelId, health);
      return health;
    }

    return null;
  }

  /**
   * Set agent model preferences
   */
  async setAgentPreferences(agentType: string, preferences: Omit<AgentModelPreference, 'agentType'>): Promise<void> {
    const agentPreference: AgentModelPreference = {
      agentType,
      ...preferences
    };

    this.agentPreferences.set(agentType, agentPreference);
    await this.redis.hset('agent_preferences', agentType, JSON.stringify(agentPreference));

    this.logger.info(`Agent preferences set for: ${agentType}`);
  }

  /**
   * Get agent model preferences
   */
  async getAgentPreferences(agentType: string): Promise<AgentModelPreference | null> {
    if (this.agentPreferences.has(agentType)) {
      return this.agentPreferences.get(agentType)!;
    }

    const prefData = await this.redis.hget('agent_preferences', agentType);
    if (prefData) {
      const preferences = JSON.parse(prefData) as AgentModelPreference;
      this.agentPreferences.set(agentType, preferences);
      return preferences;
    }

    return null;
  }

  /**
   * Set workspace model configuration
   */
  async setWorkspaceConfig(workspaceId: string, config: Omit<WorkspaceModelConfig, 'workspaceId'>): Promise<void> {
    const workspaceConfig: WorkspaceModelConfig = {
      workspaceId,
      ...config
    };

    this.workspaceConfigs.set(workspaceId, workspaceConfig);
    await this.redis.hset('workspace_configs', workspaceId, JSON.stringify(workspaceConfig));

    this.logger.info(`Workspace config set for: ${workspaceId}`);
  }

  /**
   * Get workspace model configuration
   */
  async getWorkspaceConfig(workspaceId: string): Promise<WorkspaceModelConfig | null> {
    if (this.workspaceConfigs.has(workspaceId)) {
      return this.workspaceConfigs.get(workspaceId)!;
    }

    const configData = await this.redis.hget('workspace_configs', workspaceId);
    if (configData) {
      const config = JSON.parse(configData) as WorkspaceModelConfig;
      this.workspaceConfigs.set(workspaceId, config);
      return config;
    }

    return null;
  }

  /**
   * Get active models for agent type
   */
  async getActiveModelsForAgent(agentType: string): Promise<ModelMetadata[]> {
    const preferences = await this.getAgentPreferences(agentType);
    if (!preferences) {
      // Return all active models if no preferences set
      return this.getModelsByCriteria({ status: 'active' });
    }

    const models: ModelMetadata[] = [];
    
    // Get preferred models first
    for (const modelId of preferences.preferredModels) {
      const model = await this.getModel(modelId);
      if (model && model.status === 'active') {
        models.push(model);
      }
    }

    // Add fallback models if needed
    for (const modelId of preferences.fallbackModels) {
      const model = await this.getModel(modelId);
      if (model && model.status === 'active' && !models.find(m => m.id === modelId)) {
        models.push(model);
      }
    }

    return models;
  }

  /**
   * Calculate health score based on metrics
   */
  private calculateHealthScore(health: ModelHealth): number {
    const weights = {
      uptime: 0.3,
      availability: 0.3,
      responseTime: 0.2,
      errorRate: 0.2
    };

    const uptimeScore = Math.min(health.uptime / 100, 1) * 100;
    const availabilityScore = health.availability;
    const responseTimeScore = Math.max(0, 100 - (health.responseTime / 10)); // 1s = 90 points, 10s = 0 points
    const errorRateScore = Math.max(0, 100 - (health.errorRate * 100));

    return (
      uptimeScore * weights.uptime +
      availabilityScore * weights.availability +
      responseTimeScore * weights.responseTime +
      errorRateScore * weights.errorRate
    );
  }

  /**
   * Determine model status based on health
   */
  private determineModelStatus(health: ModelHealth): ModelStatus {
    if (health.healthScore >= 80 && health.availability >= 95) {
      return 'active';
    } else if (health.healthScore >= 60 && health.availability >= 80) {
      return 'active'; // Still usable but might need attention
    } else {
      return 'inactive';
    }
  }

  /**
   * Initialize default models and configurations
   */
  private async initializeDefaults(): Promise<void> {
    // Register default OpenAI models
    const defaultModels = [
      {
        name: 'GPT-4',
        version: 'gpt-4-1106-preview',
        provider: 'openai' as const,
        modelType: 'chat' as const,
        capabilities: [{ type: 'text-generation' as const, maxTokens: 4096 }],
        parameters: { temperature: 0.7, maxTokens: 4096 },
        status: 'active' as const,
        tags: ['general', 'high-quality', 'reasoning']
      },
      {
        name: 'GPT-3.5 Turbo',
        version: 'gpt-3.5-turbo-1106',
        provider: 'openai' as const,
        modelType: 'chat' as const,
        capabilities: [{ type: 'text-generation' as const, maxTokens: 4096 }],
        parameters: { temperature: 0.7, maxTokens: 4096 },
        status: 'active' as const,
        tags: ['general', 'fast', 'cost-effective']
      },
      {
        name: 'Claude-3 Sonnet',
        version: 'claude-3-sonnet-20240229',
        provider: 'anthropic' as const,
        modelType: 'chat' as const,
        capabilities: [{ type: 'text-generation' as const, maxTokens: 4096 }],
        parameters: { temperature: 0.7, maxTokens: 4096 },
        status: 'active' as const,
        tags: ['reasoning', 'safety', 'creative']
      }
    ];

    for (const model of defaultModels) {
      const existingModels = await this.getModelsByCriteria({ 
        provider: model.provider
      });
      
      if (existingModels.length === 0) {
        await this.registerModel(model);
      }
    }

    this.logger.info('Default models initialized');
  }

  /**
   * Clean up resources
   */
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
    this.logger.info('Model Registry disconnected');
  }
}