import { EventEmitter } from 'events';
import {
  ModelMetadata,
  ModelRequest,
  ModelResponse,
  RoutingRule,
  RoutingCondition,
  ModelTarget,
  TokenUsage,
  AgentModelPreference,
  WorkspaceModelConfig,
  ModelHealth
} from '../types';
import { ModelRegistry } from './ModelRegistry';
import { Logger } from '../utils/logger';
import { 
  CircuitBreaker, 
  RetryExecutor, 
  HealthBasedEndpointSelector, 
  BulkheadExecutor,
  CircuitBreakerConfig,
  RetryConfig 
} from '../utils/resilience';

export class ModelRouter extends EventEmitter {
  private registry: ModelRegistry;
  private logger: Logger;
  private routingRules: Map<string, RoutingRule> = new Map();
  private requestMetrics: Map<string, any> = new Map();
  private canarySystem?: any; // Will be injected externally
  
  // Resilience components
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryExecutor: RetryExecutor;
  private endpointSelector: HealthBasedEndpointSelector;
  private bulkheadExecutor: BulkheadExecutor;
  private idempotencyKeys: Set<string> = new Set();

  constructor(registry: ModelRegistry) {
    super();
    this.registry = registry;
    this.logger = new Logger('ModelRouter');
    
    // Initialize resilience components
    this.retryExecutor = new RetryExecutor({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true
    });
    
    this.endpointSelector = new HealthBasedEndpointSelector();
    this.bulkheadExecutor = new BulkheadExecutor();
    
    // Create bulkhead pools for different types of operations
    this.bulkheadExecutor.createPool('openai', 10);
    this.bulkheadExecutor.createPool('anthropic', 8);
    this.bulkheadExecutor.createPool('azure', 12);
    this.bulkheadExecutor.createPool('default', 5);
    
    this.initializeDefaultRules();
  }

  /**
   * Set canary deployment system (dependency injection)
   */
  setCanarySystem(canarySystem: any): void {
    this.canarySystem = canarySystem;
  }

  /**
   * Route a model request to the most appropriate model
   */
  async routeRequest(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      let selectedModel: ModelMetadata;
      let isCanary = false;
      let deploymentId: string | undefined;

      // Check if canary deployment system is available and has active deployments
      if (this.canarySystem) {
        const canaryRoute = await this.canarySystem.routeRequest(request);
        const model = await this.registry.getModel(canaryRoute.selectedModelId);
        if (!model) {
          throw new Error(`Selected model not found: ${canaryRoute.selectedModelId}`);
        }
        selectedModel = model;
        isCanary = canaryRoute.isCanary;
        deploymentId = canaryRoute.deploymentId;
      } else {
        // Fallback to normal routing logic
        const applicableRules = await this.findApplicableRules(request);
        const availableModels = await this.getAvailableModels(request, applicableRules);
        
        if (availableModels.length === 0) {
          throw new Error('No available models for request');
        }

        selectedModel = await this.selectBestModel(request, availableModels);
      }
      
      // Execute request
      const response = await this.executeRequest(request, selectedModel);
      
      // Record metrics
      await this.recordRequestMetrics(request, response, Date.now() - startTime);
      
      // Record canary metrics if applicable
      if (this.canarySystem && deploymentId) {
        await this.canarySystem.recordRequestMetric(deploymentId, request, response, isCanary);
      }
      
      this.emit('requestRouted', { request, response, selectedModel, isCanary, deploymentId });
      
      return response;
      
    } catch (error) {
      const errorResponse: ModelResponse = {
        id: `response-${Date.now()}`,
        requestId: request.id,
        modelId: 'error',
        response: null,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latency: Date.now() - startTime,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
      
      this.emit('requestFailed', { request, error: errorResponse });
      return errorResponse;
    }
  }

  /**
   * Add routing rule
   */
  async addRoutingRule(rule: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoutingRule> {
    const ruleId = `rule-${Date.now()}`;
    const now = new Date();
    
    const routingRule: RoutingRule = {
      ...rule,
      id: ruleId,
      createdAt: now,
      updatedAt: now
    };

    this.routingRules.set(ruleId, routingRule);
    this.logger.info(`Routing rule added: ${rule.name} (${ruleId})`);
    
    return routingRule;
  }

  /**
   * Update routing rule
   */
  async updateRoutingRule(ruleId: string, updates: Partial<RoutingRule>): Promise<RoutingRule> {
    const rule = this.routingRules.get(ruleId);
    if (!rule) {
      throw new Error(`Routing rule not found: ${ruleId}`);
    }

    const updatedRule: RoutingRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };

    this.routingRules.set(ruleId, updatedRule);
    this.logger.info(`Routing rule updated: ${ruleId}`);
    
    return updatedRule;
  }

  /**
   * Get routing rules
   */
  getRoutingRules(): RoutingRule[] {
    return Array.from(this.routingRules.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find applicable routing rules for a request
   */
  private async findApplicableRules(request: ModelRequest): Promise<RoutingRule[]> {
    const applicableRules: RoutingRule[] = [];

    for (const rule of this.routingRules.values()) {
      if (!rule.enabled) continue;

      if (await this.matchesCondition(request, rule.condition)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if request matches routing condition
   */
  private async matchesCondition(request: ModelRequest, condition: RoutingCondition): Promise<boolean> {
    // Check agent type
    if (condition.agentType && !condition.agentType.includes(request.agentType)) {
      return false;
    }

    // Check workspace ID
    if (condition.workspaceId && !condition.workspaceId.includes(request.workspaceId)) {
      return false;
    }

    // Check request type
    if (condition.requestType && !condition.requestType.includes(request.metadata.requestType)) {
      return false;
    }

    // Check content length
    if (condition.contentLength) {
      const contentLength = request.prompt.length;
      if (condition.contentLength.min && contentLength < condition.contentLength.min) {
        return false;
      }
      if (condition.contentLength.max && contentLength > condition.contentLength.max) {
        return false;
      }
    }

    // Check time of day
    if (condition.timeOfDay) {
      const currentTime = new Date().toTimeString().slice(0, 5);
      if (currentTime < condition.timeOfDay.start || currentTime > condition.timeOfDay.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get available models based on rules and preferences
   */
  private async getAvailableModels(request: ModelRequest, rules: RoutingRule[]): Promise<ModelMetadata[]> {
    const modelIds = new Set<string>();

    // Collect model IDs from applicable rules
    for (const rule of rules) {
      for (const target of rule.targetModels) {
        modelIds.add(target.modelId);
      }
    }

    // If no specific rules, use agent preferences
    if (modelIds.size === 0) {
      const agentModels = await this.registry.getActiveModelsForAgent(request.agentType);
      return agentModels;
    }

    // Get model metadata for rule-specified models
    const models: ModelMetadata[] = [];
    for (const modelId of modelIds) {
      const model = await this.registry.getModel(modelId);
      if (model && model.status === 'active') {
        models.push(model);
      }
    }

    return models;
  }

  /**
   * Select the best model based on various criteria
   */
  private async selectBestModel(request: ModelRequest, availableModels: ModelMetadata[]): Promise<ModelMetadata> {
    // Check workspace restrictions
    const workspaceConfig = await this.registry.getWorkspaceConfig(request.workspaceId);
    if (workspaceConfig) {
      const allowedModels = availableModels.filter(model => 
        !workspaceConfig.modelRestrictions.includes(model.id)
      );
      if (allowedModels.length > 0) {
        availableModels = allowedModels;
      }
    }

    // Get agent preferences for ranking
    const agentPrefs = await this.registry.getAgentPreferences(request.agentType);
    
    // Score models based on various factors
    const scoredModels = await Promise.all(
      availableModels.map(async (model) => {
        let score = 0;

        // Preference score (highest priority)
        if (agentPrefs) {
          const prefIndex = agentPrefs.preferredModels.indexOf(model.id);
          if (prefIndex !== -1) {
            score += 1000 - (prefIndex * 100); // Higher score for earlier preferences
          }
          
          const fallbackIndex = agentPrefs.fallbackModels.indexOf(model.id);
          if (fallbackIndex !== -1) {
            score += 500 - (fallbackIndex * 50);
          }
        }

        // Health score
        const health = await this.registry.getModelHealth(model.id);
        if (health) {
          score += health.healthScore;
        }

        // Priority boost for request priority
        if (request.metadata.priority === 'critical') {
          score += 200;
        } else if (request.metadata.priority === 'high') {
          score += 100;
        }

        // Capability matching
        const requiredCapability = this.getRequiredCapability(request);
        if (model.capabilities.some(cap => cap.type === requiredCapability)) {
          score += 50;
        }

        return { model, score };
      })
    );

    // Sort by score and return best model
    scoredModels.sort((a, b) => b.score - a.score);
    
    if (scoredModels.length === 0) {
      throw new Error('No suitable models found');
    }

    return scoredModels[0].model;
  }

  /**
   * Execute request with selected model using resilience patterns
   */
  private async executeRequest(request: ModelRequest, model: ModelMetadata): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      // Check for idempotency
      const idempotencyKey = `${request.id}-${model.id}`;
      if (this.idempotencyKeys.has(idempotencyKey)) {
        this.logger.warn('Duplicate request detected, rejecting', { requestId: request.id, modelId: model.id });
        throw new Error('Duplicate request detected');
      }
      this.idempotencyKeys.add(idempotencyKey);
      
      // Clean up old idempotency keys (keep last hour)
      setTimeout(() => this.idempotencyKeys.delete(idempotencyKey), 60 * 60 * 1000);
      
      // Get or create circuit breaker for this model
      const circuitBreaker = this.getOrCreateCircuitBreaker(model.id);
      
      // Determine bulkhead pool based on model provider
      const poolName = this.getBulkheadPool(model.provider);
      
      // Execute with resilience patterns
      const response = await this.bulkheadExecutor.execute(poolName, async () => {
        return await circuitBreaker.execute(async () => {
          return await this.retryExecutor.execute(
            () => this.executeModelCall(request, model),
            (error) => this.isRetriableError(error)
          );
        });
      });
      
      const latency = Date.now() - startTime;
      
      const modelResponse: ModelResponse = {
        id: `response-${Date.now()}`,
        requestId: request.id,
        modelId: model.id,
        response: response.content,
        usage: response.usage,
        latency,
        status: 'success',
        timestamp: new Date()
      };
      
      return modelResponse;
      
    } catch (error) {
      this.logger.error('Model execution failed with all resilience patterns', error, {
        requestId: request.id,
        modelId: model.id,
        duration: Date.now() - startTime
      });
      throw new Error(`Model execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Execute the actual model call with endpoint selection
   */
  private async executeModelCall(request: ModelRequest, model: ModelMetadata): Promise<any> {
    // Get model endpoints
    const endpoints = await this.registry.getModelEndpoints(model.id);
    if (endpoints.length === 0) {
      throw new Error(`No endpoints available for model: ${model.id}`);
    }
    
    // Add endpoints to health selector if not already present
    for (const endpoint of endpoints) {
      if (!this.endpointSelector.getEndpointHealth().find(h => h.endpoint === endpoint.url)) {
        this.endpointSelector.addEndpoint(endpoint.url, endpoint.weight || 1);
      }
    }
    
    // Select healthy endpoint
    const selectedEndpointUrl = this.endpointSelector.selectEndpoint();
    if (!selectedEndpointUrl) {
      throw new Error('No healthy endpoints available');
    }
    
    const selectedEndpoint = endpoints.find(e => e.url === selectedEndpointUrl);
    if (!selectedEndpoint) {
      throw new Error('Selected endpoint not found in registry');
    }
    
    // Execute API call with timeout and record result
    const callStartTime = Date.now();
    let success = false;
    
    try {
      const response = await this.callModelAPI(selectedEndpoint, request, model);
      success = true;
      
      const callLatency = Date.now() - callStartTime;
      await this.endpointSelector.recordResult(selectedEndpointUrl, callLatency, true);
      
      return response;
    } catch (error) {
      const callLatency = Date.now() - callStartTime;
      await this.endpointSelector.recordResult(selectedEndpointUrl, callLatency, false);
      throw error;
    }
  }
  
  /**
   * Get or create circuit breaker for a model
   */
  private getOrCreateCircuitBreaker(modelId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(modelId)) {
      const config: CircuitBreakerConfig = {
        name: `model-${modelId}`,
        failureThreshold: 0.5, // 50% failure rate
        recoveryTimeout: 60000, // 1 minute
        monitoringInterval: 10000, // 10 seconds
        minimumRequests: 10,
        timeout: 30000, // 30 seconds
        halfOpenMaxCalls: 3
      };
      
      const circuitBreaker = new CircuitBreaker(config);
      
      // Set up event listeners for monitoring
      circuitBreaker.on('stateChange', (event) => {
        this.logger.info(`Circuit breaker state change for model ${modelId}`, event);
        this.emit('circuitBreakerStateChange', { modelId, ...event });
      });
      
      circuitBreaker.on('failure', (event) => {
        this.logger.warn(`Circuit breaker failure for model ${modelId}`, event);
      });
      
      this.circuitBreakers.set(modelId, circuitBreaker);
    }
    
    return this.circuitBreakers.get(modelId)!;
  }
  
  /**
   * Determine which bulkhead pool to use based on provider
   */
  private getBulkheadPool(provider: string): string {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'openai';
      case 'anthropic':
        return 'anthropic';
      case 'azure':
        return 'azure';
      default:
        return 'default';
    }
  }
  
  /**
   * Determine if an error is retriable
   */
  private isRetriableError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message || error.toString();
    
    // Don't retry on authentication errors
    if (message.includes('401') || message.includes('403') || message.includes('authentication')) {
      return false;
    }
    
    // Don't retry on validation errors
    if (message.includes('400') || message.includes('validation')) {
      return false;
    }
    
    // Don't retry on rate limit errors (let circuit breaker handle)
    if (message.includes('429') || message.includes('rate limit')) {
      return false;
    }
    
    // Retry on temporary failures
    if (message.includes('timeout') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504') ||
        message.includes('connection') ||
        message.includes('network')) {
      return true;
    }
    
    // Default to not retriable for safety
    return false;
  }

  /**
   * Call model API (simulated)
   */
  private async callModelAPI(endpoint: any, request: ModelRequest, model: ModelMetadata): Promise<any> {
    // Simulate API call latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Simulate response based on request type
    let content: any;
    const usage: TokenUsage = {
      promptTokens: Math.floor(request.prompt.length / 4), // Rough estimate
      completionTokens: 0,
      totalTokens: 0,
      cost: 0
    };

    switch (request.metadata.requestType) {
      case 'completion':
      case 'chat':
        content = `Generated response for: ${request.prompt.substring(0, 50)}...`;
        usage.completionTokens = Math.floor(content.length / 4);
        break;
      case 'embedding':
        content = Array.from({ length: 1536 }, () => Math.random());
        usage.completionTokens = 1;
        break;
      case 'analysis':
        content = {
          sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
          confidence: Math.random(),
          themes: ['marketing', 'technology', 'business']
        };
        usage.completionTokens = 10;
        break;
      default:
        content = 'Generic response';
        usage.completionTokens = 5;
    }

    usage.totalTokens = usage.promptTokens + usage.completionTokens;
    usage.cost = usage.totalTokens * 0.001; // Simplified cost calculation

    return { content, usage };
  }

  /**
   * Record request metrics
   */
  private async recordRequestMetrics(request: ModelRequest, response: ModelResponse, totalLatency: number): Promise<void> {
    const metrics = {
      requestId: request.id,
      modelId: response.modelId,
      agentType: request.agentType,
      workspaceId: request.workspaceId,
      requestType: request.metadata.requestType,
      latency: response.latency,
      totalLatency,
      usage: response.usage,
      status: response.status,
      timestamp: new Date()
    };

    // Store metrics (in real implementation, would use time-series database)
    this.requestMetrics.set(request.id, metrics);

    // Emit metrics event for monitoring
    this.emit('metricsRecorded', metrics);
  }

  /**
   * Get required capability based on request
   */
  private getRequiredCapability(request: ModelRequest): string {
    switch (request.metadata.requestType) {
      case 'completion':
      case 'chat':
        return 'text-generation';
      case 'embedding':
        return 'embeddings';
      case 'analysis':
        return 'text-analysis';
      default:
        return 'text-generation';
    }
  }

  /**
   * Initialize default routing rules
   */
  private async initializeDefaultRules(): Promise<void> {
    const defaultRules = [
      {
        name: 'High Priority GPT-4',
        condition: {
          requestType: ['completion', 'chat'],
          customConditions: { priority: 'critical' }
        },
        targetModels: [
          { modelId: 'gpt-4', weight: 1, fallbackOrder: 1 }
        ],
        trafficSplit: { primary: 100 },
        priority: 100,
        enabled: true
      },
      {
        name: 'Creative Agent Claude',
        condition: {
          agentType: ['creative', 'legal']
        },
        targetModels: [
          { modelId: 'claude-3-sonnet', weight: 0.7, fallbackOrder: 1 },
          { modelId: 'gpt-4', weight: 0.3, fallbackOrder: 2 }
        ],
        trafficSplit: { primary: 100 },
        priority: 80,
        enabled: true
      },
      {
        name: 'Cost-Effective Default',
        condition: {},
        targetModels: [
          { modelId: 'gpt-3.5-turbo', weight: 0.8, fallbackOrder: 1 },
          { modelId: 'gpt-4', weight: 0.2, fallbackOrder: 2 }
        ],
        trafficSplit: { primary: 100 },
        priority: 10,
        enabled: true
      }
    ];

    for (const rule of defaultRules) {
      await this.addRoutingRule(rule);
    }

    this.logger.info('Default routing rules initialized');
  }

  /**
   * Get request metrics
   */
  getRequestMetrics(limit: number = 100): any[] {
    return Array.from(this.requestMetrics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [key, metrics] of this.requestMetrics.entries()) {
      if (metrics.timestamp < cutoffTime) {
        this.requestMetrics.delete(key);
      }
    }
  }

  /**
   * Delete routing rule
   */
  async deleteRoutingRule(ruleId: string): Promise<void> {
    if (!this.routingRules.has(ruleId)) {
      throw new Error(`Routing rule not found: ${ruleId}`);
    }

    this.routingRules.delete(ruleId);
    this.logger.info(`Routing rule deleted: ${ruleId}`);
  }

  /**
   * Test routing for a request without executing
   */
  async testRouting(request: ModelRequest): Promise<{
    applicableRules: RoutingRule[];
    selectedModel: ModelMetadata | null;
    availableModels: ModelMetadata[];
    reasoning: string[];
  }> {
    const reasoning: string[] = [];
    
    // Find applicable routing rules
    const applicableRules = await this.findApplicableRules(request);
    reasoning.push(`Found ${applicableRules.length} applicable routing rules`);

    // Get available models based on rules and preferences
    const availableModels = await this.getAvailableModels(request, applicableRules);
    reasoning.push(`Found ${availableModels.length} available models`);

    let selectedModel: ModelMetadata | null = null;
    if (availableModels.length > 0) {
      selectedModel = await this.selectBestModel(request, availableModels);
      reasoning.push(`Selected model: ${selectedModel.name} (${selectedModel.id})`);
    } else {
      reasoning.push('No models available for this request');
    }

    return {
      applicableRules,
      selectedModel,
      availableModels,
      reasoning
    };
  }

  /**
   * Get model performance analytics
   */
  async getModelAnalytics(options: { timeRange: string; modelId?: string }): Promise<any> {
    const { timeRange, modelId } = options;
    const now = Date.now();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = new Date(now - timeRangeMs);

    const relevantMetrics = Array.from(this.requestMetrics.values())
      .filter(metric => {
        const isInTimeRange = metric.timestamp >= cutoffTime;
        const matchesModel = !modelId || metric.modelId === modelId;
        return isInTimeRange && matchesModel;
      });

    const analytics = {
      timeRange,
      modelId: modelId || 'all',
      totalRequests: relevantMetrics.length,
      averageLatency: this.calculateAverage(relevantMetrics.map(m => m.latency)),
      successRate: this.calculateSuccessRate(relevantMetrics),
      totalTokens: relevantMetrics.reduce((sum, m) => sum + (m.usage?.totalTokens || 0), 0),
      totalCost: relevantMetrics.reduce((sum, m) => sum + (m.usage?.cost || 0), 0),
      requestsByAgent: this.groupBy(relevantMetrics, 'agentType'),
      requestsByStatus: this.groupBy(relevantMetrics, 'status'),
      hourlyDistribution: this.getHourlyDistribution(relevantMetrics)
    };

    return analytics;
  }

  /**
   * Get workspace usage analytics
   */
  async getWorkspaceAnalytics(workspaceId: string, timeRange: string): Promise<any> {
    const now = Date.now();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = new Date(now - timeRangeMs);

    const workspaceMetrics = Array.from(this.requestMetrics.values())
      .filter(metric => {
        return metric.workspaceId === workspaceId && metric.timestamp >= cutoffTime;
      });

    return {
      workspaceId,
      timeRange,
      totalRequests: workspaceMetrics.length,
      uniqueAgents: new Set(workspaceMetrics.map(m => m.agentType)).size,
      totalTokens: workspaceMetrics.reduce((sum, m) => sum + (m.usage?.totalTokens || 0), 0),
      totalCost: workspaceMetrics.reduce((sum, m) => sum + (m.usage?.cost || 0), 0),
      averageLatency: this.calculateAverage(workspaceMetrics.map(m => m.latency)),
      successRate: this.calculateSuccessRate(workspaceMetrics),
      modelUsage: this.groupBy(workspaceMetrics, 'modelId'),
      agentUsage: this.groupBy(workspaceMetrics, 'agentType')
    };
  }

  /**
   * Get resilience status and metrics
   */
  getResilienceStatus(): any {
    const circuitBreakerStatus = Array.from(this.circuitBreakers.entries()).map(([modelId, cb]) => ({
      modelId,
      state: cb.getState(),
      isOpen: cb.isOpen()
    }));
    
    const endpointHealth = this.endpointSelector.getEndpointHealth();
    const bulkheadStats = this.bulkheadExecutor.getPoolStats();
    
    return {
      circuitBreakers: circuitBreakerStatus,
      endpointHealth,
      bulkheadPools: bulkheadStats,
      idempotencyKeysCount: this.idempotencyKeys.size
    };
  }
  
  /**
   * Reset circuit breaker for a specific model
   */
  resetCircuitBreaker(modelId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(modelId);
    if (circuitBreaker) {
      circuitBreaker.reset();
      this.logger.info(`Circuit breaker reset for model: ${modelId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.endpointSelector.destroy();
    this.circuitBreakers.clear();
    this.idempotencyKeys.clear();
  }
  async getSystemHealthOverview(): Promise<any> {
    const allModels = await this.registry.getModelsByCriteria({});
    const activeModels = allModels.filter(m => m.status === 'active');
    const recentMetrics = Array.from(this.requestMetrics.values())
      .filter(m => m.timestamp > new Date(Date.now() - 60 * 60 * 1000)); // Last hour

    const healthyModels = [];
    const degradedModels = [];
    const unhealthyModels = [];

    for (const model of activeModels) {
      const health = await this.registry.getModelHealth(model.id);
      if (health) {
        if (health.healthScore >= 80) {
          healthyModels.push(model.id);
        } else if (health.healthScore >= 60) {
          degradedModels.push(model.id);
        } else {
          unhealthyModels.push(model.id);
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      models: {
        total: allModels.length,
        active: activeModels.length,
        healthy: healthyModels.length,
        degraded: degradedModels.length,
        unhealthy: unhealthyModels.length
      },
      routing: {
        totalRules: this.routingRules.size,
        enabledRules: Array.from(this.routingRules.values()).filter(r => r.enabled).length
      },
      performance: {
        requestsLastHour: recentMetrics.length,
        averageLatency: this.calculateAverage(recentMetrics.map(m => m.latency)),
        successRate: this.calculateSuccessRate(recentMetrics)
      },
      healthyModels,
      degradedModels,
      unhealthyModels
    };
  }

  /**
   * Get all agent preferences
   */
  async getAllAgentPreferences(): Promise<Record<string, AgentModelPreference>> {
    // This would typically query the registry for all agent preferences
    // Implementation will be enhanced with comprehensive agent preference management
    return {};
  }

  /**
   * Get all workspace configurations
   */
  async getAllWorkspaceConfigs(): Promise<Record<string, WorkspaceModelConfig>> {
    // This would typically query the registry for all workspace configs
    // Implementation will be enhanced with comprehensive workspace configuration management
    return {};
  }

  /**
   * Import configuration
   */
  async importConfiguration(config: any): Promise<any> {
    const summary = {
      modelsImported: 0,
      rulesImported: 0,
      agentPreferencesImported: 0,
      workspaceConfigsImported: 0,
      errors: [] as string[]
    };

    // Import models
    if (config.models && Array.isArray(config.models)) {
      for (const model of config.models) {
        try {
          await this.registry.registerModel(model);
          summary.modelsImported++;
        } catch (error) {
          summary.errors.push(`Failed to import model ${model.name}: ${error}`);
        }
      }
    }

    // Import routing rules
    if (config.routingRules && Array.isArray(config.routingRules)) {
      for (const rule of config.routingRules) {
        try {
          await this.addRoutingRule(rule);
          summary.rulesImported++;
        } catch (error) {
          summary.errors.push(`Failed to import rule ${rule.name}: ${error}`);
        }
      }
    }

    return summary;
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    const timeRangeMap: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return timeRangeMap[timeRange] || timeRangeMap['24h'];
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate success rate from metrics
   */
  private calculateSuccessRate(metrics: any[]): number {
    if (metrics.length === 0) return 0;
    const successCount = metrics.filter(m => m.status === 'success').length;
    return (successCount / metrics.length) * 100;
  }

  /**
   * Group metrics by a field
   */
  private groupBy(metrics: any[], field: string): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const metric of metrics) {
      const key = metric[field] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
    }
    return groups;
  }

  /**
   * Get hourly distribution of requests
   */
  private getHourlyDistribution(metrics: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const metric of metrics) {
      const hour = metric.timestamp.getHours();
      const key = `${hour.toString().padStart(2, '0')}:00`;
      distribution[key] = (distribution[key] || 0) + 1;
    }
    return distribution;
  }
}