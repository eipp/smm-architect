import { EventEmitter } from 'events';
import { ModelMetadata, ModelRequest, ModelResponse } from '../types';
import { ModelRegistry } from './ModelRegistry';
import { ModelEvaluationFramework } from './ModelEvaluationFramework';
import { Logger } from '../utils/logger';

export interface CanaryDeployment {
  id: string;
  name: string;
  description: string;
  productionModelId: string;
  canaryModelId: string;
  trafficSplit: {
    production: number; // 0-100
    canary: number; // 0-100
  };
  rolloutStrategy: {
    type: 'linear' | 'exponential' | 'step';
    duration: number; // minutes
    steps?: number; // for step strategy
    maxTrafficPercentage: number;
  };
  successCriteria: {
    minRequests: number;
    maxErrorRate: number;
    minSuccessRate: number;
    maxLatencyP95: number;
    minQualityScore: number;
    evaluationWindow: number; // minutes
  };
  rollbackCriteria: {
    maxErrorRate: number;
    maxLatencyP95: number;
    minSuccessRate: number;
    minQualityScore: number;
    alertThresholds: {
      errorSpike: number;
      latencySpike: number;
      qualityDrop: number;
    };
  };
  status: 'preparing' | 'active' | 'paused' | 'completed' | 'failed' | 'rolledback';
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CanaryMetrics {
  deploymentId: string;
  timeWindow: string;
  production: {
    requests: number;
    successRate: number;
    errorRate: number;
    avgLatency: number;
    p95Latency: number;
    qualityScore: number;
  };
  canary: {
    requests: number;
    successRate: number;
    errorRate: number;
    avgLatency: number;
    p95Latency: number;
    qualityScore: number;
  };
  comparison: {
    performanceDelta: number;
    qualityDelta: number;
    costDelta: number;
    recommendation: 'proceed' | 'pause' | 'rollback';
    confidence: number;
  };
}

export interface RolloutDecision {
  deploymentId: string;
  action: 'continue' | 'pause' | 'rollback' | 'complete';
  reason: string;
  metrics: CanaryMetrics;
  newTrafficSplit?: {
    production: number;
    canary: number;
  };
  nextEvaluationTime?: Date;
}

export class CanaryDeploymentSystem extends EventEmitter {
  private registry: ModelRegistry;
  private evaluationFramework: ModelEvaluationFramework;
  private logger: Logger;
  private deployments: Map<string, CanaryDeployment> = new Map();
  private metrics: Map<string, CanaryMetrics[]> = new Map();
  private routingDecisions: Map<string, any> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  constructor(registry: ModelRegistry, evaluationFramework: ModelEvaluationFramework) {
    super();
    this.registry = registry;
    this.evaluationFramework = evaluationFramework;
    this.logger = new Logger('CanaryDeployment');
    this.startMonitoring();
  }

  /**
   * Create a new canary deployment
   */
  async createCanaryDeployment(
    deployment: Omit<CanaryDeployment, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<CanaryDeployment> {
    // Validate models exist
    const prodModel = await this.registry.getModel(deployment.productionModelId);
    const canaryModel = await this.registry.getModel(deployment.canaryModelId);
    
    if (!prodModel) {
      throw new Error(`Production model not found: ${deployment.productionModelId}`);
    }
    if (!canaryModel) {
      throw new Error(`Canary model not found: ${deployment.canaryModelId}`);
    }

    // Validate traffic split
    if (deployment.trafficSplit.production + deployment.trafficSplit.canary !== 100) {
      throw new Error('Traffic split must sum to 100%');
    }

    const deploymentId = `canary-${Date.now()}`;
    const now = new Date();

    const canaryDeployment: CanaryDeployment = {
      ...deployment,
      id: deploymentId,
      status: 'preparing',
      createdAt: now,
      updatedAt: now
    };

    this.deployments.set(deploymentId, canaryDeployment);
    this.metrics.set(deploymentId, []);

    this.logger.info(`Canary deployment created: ${deploymentId}`, {
      productionModel: deployment.productionModelId,
      canaryModel: deployment.canaryModelId,
      initialSplit: deployment.trafficSplit
    });

    this.emit('deploymentCreated', canaryDeployment);
    return canaryDeployment;
  }

  /**
   * Start a canary deployment
   */
  async startCanaryDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    if (deployment.status !== 'preparing') {
      throw new Error(`Cannot start deployment in status: ${deployment.status}`);
    }

    // Validate canary model health
    const canaryHealth = await this.registry.getModelHealth(deployment.canaryModelId);
    if (!canaryHealth || canaryHealth.healthScore < 80) {
      throw new Error('Canary model health insufficient for deployment');
    }

    deployment.status = 'active';
    deployment.startedAt = new Date();
    deployment.updatedAt = new Date();

    // Set initial traffic split
    await this.updateTrafficSplit(deploymentId, deployment.trafficSplit);

    this.logger.info(`Canary deployment started: ${deploymentId}`);
    this.emit('deploymentStarted', deployment);
  }

  /**
   * Route request based on canary deployment configuration
   */
  async routeRequest(request: ModelRequest): Promise<{
    selectedModelId: string;
    isCanary: boolean;
    deploymentId?: string;
  }> {
    // Find active canary deployments that could handle this request
    const applicableDeployments = Array.from(this.deployments.values()).filter(
      deployment => 
        deployment.status === 'active' && 
        this.requestMatchesDeployment(request, deployment)
    );

    if (applicableDeployments.length === 0) {
      // No active canary deployments, use default routing
      return {
        selectedModelId: await this.getDefaultModelForRequest(request),
        isCanary: false
      };
    }

    // Use the first applicable deployment (could be enhanced with priority)
    const deployment = applicableDeployments[0];
    
    // Determine if request should go to canary based on traffic split
    const shouldUseCanary = this.shouldRouteToCanary(deployment);

    const selectedModelId = shouldUseCanary ? 
      deployment.canaryModelId : 
      deployment.productionModelId;

    // Record routing decision
    this.recordRoutingDecision(deployment.id, request.id, selectedModelId, shouldUseCanary);

    return {
      selectedModelId,
      isCanary: shouldUseCanary,
      deploymentId: deployment.id
    };
  }

  /**
   * Record request metrics for canary analysis
   */
  async recordRequestMetric(
    deploymentId: string,
    request: ModelRequest,
    response: ModelResponse,
    isCanary: boolean
  ): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      return;
    }

    // Store individual request metrics (simplified - would use time-series DB in production)
    const requestMetric = {
      deploymentId,
      requestId: request.id,
      modelId: response.modelId,
      isCanary,
      success: response.status === 'success',
      latency: response.latency,
      timestamp: new Date(),
      cost: response.usage?.cost || 0
    };

    // Emit for external metric systems
    this.emit('requestMetricRecorded', requestMetric);
  }

  /**
   * Evaluate canary deployment performance
   */
  async evaluateCanaryPerformance(deploymentId: string): Promise<CanaryMetrics> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const windowStart = new Date(Date.now() - (deployment.successCriteria.evaluationWindow * 60 * 1000));
    
    // Get metrics for both production and canary models (mock implementation)
    const productionMetrics = await this.getModelMetrics(
      deployment.productionModelId, 
      windowStart, 
      false
    );
    const canaryMetrics = await this.getModelMetrics(
      deployment.canaryModelId, 
      windowStart, 
      true
    );

    // Calculate comparison metrics
    const performanceDelta = (canaryMetrics.avgLatency - productionMetrics.avgLatency) / productionMetrics.avgLatency;
    const qualityDelta = canaryMetrics.qualityScore - productionMetrics.qualityScore;
    const costDelta = (canaryMetrics.avgCost - productionMetrics.avgCost) / productionMetrics.avgCost;

    // Determine recommendation
    const recommendation = this.determineRecommendation(
      deployment,
      productionMetrics,
      canaryMetrics,
      performanceDelta,
      qualityDelta
    );

    const confidence = this.calculateConfidence(
      productionMetrics.requests,
      canaryMetrics.requests,
      deployment.successCriteria.minRequests
    );

    const evaluation: CanaryMetrics = {
      deploymentId,
      timeWindow: `${deployment.successCriteria.evaluationWindow}m`,
      production: productionMetrics,
      canary: canaryMetrics,
      comparison: {
        performanceDelta,
        qualityDelta,
        costDelta,
        recommendation,
        confidence
      }
    };

    // Store metrics history
    const metricsHistory = this.metrics.get(deploymentId) || [];
    metricsHistory.push(evaluation);
    this.metrics.set(deploymentId, metricsHistory);

    return evaluation;
  }

  /**
   * Make rollout decision based on metrics
   */
  async makeRolloutDecision(deploymentId: string): Promise<RolloutDecision> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const metrics = await this.evaluateCanaryPerformance(deploymentId);
    
    // Check rollback criteria first
    if (this.shouldRollback(deployment, metrics)) {
      return {
        deploymentId,
        action: 'rollback',
        reason: 'Rollback criteria met - canary performance below thresholds',
        metrics
      };
    }

    // Check if deployment should be completed
    if (this.shouldComplete(deployment, metrics)) {
      return {
        deploymentId,
        action: 'complete',
        reason: 'Success criteria met - ready for full rollout',
        metrics
      };
    }

    // Calculate next traffic split step
    const nextSplit = this.calculateNextTrafficSplit(deployment);
    if (!nextSplit) {
      return {
        deploymentId,
        action: 'pause',
        reason: 'Maximum traffic percentage reached - awaiting manual decision',
        metrics
      };
    }

    const nextEvaluationTime = new Date(
      Date.now() + (deployment.successCriteria.evaluationWindow * 60 * 1000)
    );

    return {
      deploymentId,
      action: 'continue',
      reason: 'Performance acceptable - continuing gradual rollout',
      metrics,
      newTrafficSplit: nextSplit,
      nextEvaluationTime
    };
  }

  /**
   * Execute rollout decision
   */
  async executeRolloutDecision(decision: RolloutDecision): Promise<void> {
    const deployment = this.deployments.get(decision.deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${decision.deploymentId}`);
    }

    switch (decision.action) {
      case 'continue':
        if (decision.newTrafficSplit) {
          await this.updateTrafficSplit(decision.deploymentId, decision.newTrafficSplit);
          deployment.trafficSplit = decision.newTrafficSplit;
        }
        break;

      case 'pause':
        deployment.status = 'paused';
        break;

      case 'rollback':
        await this.rollbackDeployment(decision.deploymentId, decision.reason);
        break;

      case 'complete':
        await this.completeDeployment(decision.deploymentId);
        break;
    }

    deployment.updatedAt = new Date();
    this.deployments.set(decision.deploymentId, deployment);

    this.logger.info(`Rollout decision executed: ${decision.action}`, {
      deploymentId: decision.deploymentId,
      reason: decision.reason
    });

    this.emit('rolloutDecisionExecuted', { deployment, decision });
  }

  /**
   * Rollback canary deployment
   */
  async rollbackDeployment(deploymentId: string, reason: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    // Set traffic to 100% production, 0% canary
    await this.updateTrafficSplit(deploymentId, { production: 100, canary: 0 });

    deployment.status = 'rolledback';
    deployment.completedAt = new Date();
    deployment.updatedAt = new Date();

    this.logger.warn(`Canary deployment rolled back: ${deploymentId}`, { reason });
    this.emit('deploymentRolledback', { deployment, reason });
  }

  /**
   * Complete canary deployment (promote canary to production)
   */
  async completeDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    // Update model status - promote canary to production
    await this.registry.updateModelStatus(deployment.canaryModelId, 'active');
    await this.registry.updateModelStatus(deployment.productionModelId, 'deprecated');

    // Set traffic to 100% canary (which becomes the new production)
    await this.updateTrafficSplit(deploymentId, { production: 0, canary: 100 });

    deployment.status = 'completed';
    deployment.completedAt = new Date();
    deployment.updatedAt = new Date();

    this.logger.info(`Canary deployment completed: ${deploymentId}`, {
      newProductionModel: deployment.canaryModelId,
      oldProductionModel: deployment.productionModelId
    });

    this.emit('deploymentCompleted', deployment);
  }

  /**
   * Get deployment status and metrics
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    deployment: CanaryDeployment;
    currentMetrics?: CanaryMetrics;
    metricsHistory: CanaryMetrics[];
    recommendations: string[];
  }> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const metricsHistory = this.metrics.get(deploymentId) || [];
    const currentMetrics = deployment.status === 'active' ? 
      await this.evaluateCanaryPerformance(deploymentId) : undefined;

    const recommendations = this.generateRecommendations(deployment, currentMetrics);

    return {
      deployment,
      currentMetrics,
      metricsHistory,
      recommendations
    };
  }

  /**
   * List all deployments with optional filtering
   */
  async listDeployments(filter?: {
    status?: CanaryDeployment['status'];
    productionModelId?: string;
    canaryModelId?: string;
  }): Promise<CanaryDeployment[]> {
    let deployments = Array.from(this.deployments.values());

    if (filter) {
      if (filter.status) {
        deployments = deployments.filter(d => d.status === filter.status);
      }
      if (filter.productionModelId) {
        deployments = deployments.filter(d => d.productionModelId === filter.productionModelId);
      }
      if (filter.canaryModelId) {
        deployments = deployments.filter(d => d.canaryModelId === filter.canaryModelId);
      }
    }

    return deployments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Pause active deployment
   */
  async pauseDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    if (deployment.status !== 'active') {
      throw new Error(`Cannot pause deployment in status: ${deployment.status}`);
    }

    deployment.status = 'paused';
    deployment.updatedAt = new Date();

    this.logger.info(`Canary deployment paused: ${deploymentId}`);
    this.emit('deploymentPaused', deployment);
  }

  /**
   * Resume paused deployment
   */
  async resumeDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    if (deployment.status !== 'paused') {
      throw new Error(`Cannot resume deployment in status: ${deployment.status}`);
    }

    deployment.status = 'active';
    deployment.updatedAt = new Date();

    this.logger.info(`Canary deployment resumed: ${deploymentId}`);
    this.emit('deploymentResumed', deployment);
  }

  /**
   * Private helper methods
   */

  private requestMatchesDeployment(request: ModelRequest, deployment: CanaryDeployment): boolean {
    // Check if request could be handled by either production or canary model
    // This is a simplified check - in reality would consider model capabilities, agent types, etc.
    return true;
  }

  private shouldRouteToCanary(deployment: CanaryDeployment): boolean {
    const random = Math.random() * 100;
    return random < deployment.trafficSplit.canary;
  }

  private async getDefaultModelForRequest(request: ModelRequest): Promise<string> {
    // Default model selection logic
    const models = await this.registry.getActiveModelsForAgent(request.agentType);
    return models.length > 0 ? models[0].id : 'default-model';
  }

  private recordRoutingDecision(
    deploymentId: string, 
    requestId: string, 
    modelId: string, 
    isCanary: boolean
  ): void {
    const decision = {
      deploymentId,
      requestId,
      modelId,
      isCanary,
      timestamp: new Date()
    };
    
    this.routingDecisions.set(requestId, decision);
  }

  private async getModelMetrics(
    modelId: string, 
    since: Date, 
    isCanary: boolean
  ): Promise<any> {
    // Mock implementation - would query actual metrics store
    return {
      requests: Math.floor(Math.random() * 1000) + 100,
      successRate: 95 + Math.random() * 5,
      errorRate: Math.random() * 5,
      avgLatency: 500 + Math.random() * 500,
      p95Latency: 800 + Math.random() * 700,
      qualityScore: 0.8 + Math.random() * 0.2,
      avgCost: 0.001 + Math.random() * 0.001
    };
  }

  private determineRecommendation(
    deployment: CanaryDeployment,
    prodMetrics: any,
    canaryMetrics: any,
    performanceDelta: number,
    qualityDelta: number
  ): 'proceed' | 'pause' | 'rollback' {
    // Check rollback criteria
    if (canaryMetrics.errorRate > deployment.rollbackCriteria.maxErrorRate ||
        canaryMetrics.p95Latency > deployment.rollbackCriteria.maxLatencyP95 ||
        canaryMetrics.successRate < deployment.rollbackCriteria.minSuccessRate ||
        canaryMetrics.qualityScore < deployment.rollbackCriteria.minQualityScore) {
      return 'rollback';
    }

    // Check success criteria
    if (canaryMetrics.requests >= deployment.successCriteria.minRequests &&
        canaryMetrics.errorRate <= deployment.successCriteria.maxErrorRate &&
        canaryMetrics.successRate >= deployment.successCriteria.minSuccessRate &&
        canaryMetrics.p95Latency <= deployment.successCriteria.maxLatencyP95 &&
        canaryMetrics.qualityScore >= deployment.successCriteria.minQualityScore) {
      return 'proceed';
    }

    return 'pause';
  }

  private calculateConfidence(
    prodRequests: number,
    canaryRequests: number,
    minRequests: number
  ): number {
    const totalRequests = prodRequests + canaryRequests;
    const requestConfidence = Math.min(totalRequests / (minRequests * 2), 1);
    return requestConfidence;
  }

  private shouldRollback(deployment: CanaryDeployment, metrics: CanaryMetrics): boolean {
    const canary = metrics.canary;
    const criteria = deployment.rollbackCriteria;

    return (
      canary.errorRate > criteria.maxErrorRate ||
      canary.p95Latency > criteria.maxLatencyP95 ||
      canary.successRate < criteria.minSuccessRate ||
      canary.qualityScore < criteria.minQualityScore
    );
  }

  private shouldComplete(deployment: CanaryDeployment, metrics: CanaryMetrics): boolean {
    return (
      deployment.trafficSplit.canary >= deployment.rolloutStrategy.maxTrafficPercentage &&
      metrics.canary.requests >= deployment.successCriteria.minRequests &&
      metrics.comparison.recommendation === 'proceed' &&
      metrics.comparison.confidence >= 0.95
    );
  }

  private calculateNextTrafficSplit(deployment: CanaryDeployment): { production: number; canary: number; } | null {
    const current = deployment.trafficSplit.canary;
    const max = deployment.rolloutStrategy.maxTrafficPercentage;
    
    if (current >= max) {
      return null;
    }

    let nextCanary: number;
    
    switch (deployment.rolloutStrategy.type) {
      case 'linear':
        const steps = deployment.rolloutStrategy.steps || 10;
        const increment = max / steps;
        nextCanary = Math.min(current + increment, max);
        break;
        
      case 'exponential':
        nextCanary = Math.min(current === 0 ? 5 : current * 2, max);
        break;
        
      case 'step':
        const stepSize = max / (deployment.rolloutStrategy.steps || 4);
        nextCanary = Math.min(current + stepSize, max);
        break;
        
      default:
        nextCanary = Math.min(current + 10, max);
    }

    return {
      production: Math.round(100 - nextCanary),
      canary: Math.round(nextCanary)
    };
  }

  private async updateTrafficSplit(
    deploymentId: string, 
    split: { production: number; canary: number; }
  ): Promise<void> {
    this.logger.info(`Updating traffic split for deployment ${deploymentId}`, split);
    // In real implementation, would update load balancer/proxy configuration
  }

  private generateRecommendations(
    deployment: CanaryDeployment,
    metrics?: CanaryMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (!metrics) {
      recommendations.push('Start deployment to begin collecting metrics');
      return recommendations;
    }

    if (metrics.canary.requests < deployment.successCriteria.minRequests) {
      recommendations.push('Increase traffic to canary to gather sufficient data');
    }

    if (metrics.comparison.confidence < 0.8) {
      recommendations.push('Continue monitoring to improve statistical confidence');
    }

    if (metrics.comparison.performanceDelta > 0.2) {
      recommendations.push('Canary showing performance degradation - investigate');
    }

    if (metrics.comparison.qualityDelta < -0.1) {
      recommendations.push('Canary showing quality degradation - consider rollback');
    }

    return recommendations;
  }

  private startMonitoring(): void {
    // Monitor active deployments every minute
    this.monitoringInterval = setInterval(async () => {
      try {
        const activeDeployments = Array.from(this.deployments.values())
          .filter(d => d.status === 'active');

        for (const deployment of activeDeployments) {
          try {
            const decision = await this.makeRolloutDecision(deployment.id);
            if (decision.action !== 'continue' || decision.newTrafficSplit) {
              await this.executeRolloutDecision(decision);
            }
          } catch (error) {
            this.logger.error(
              `Monitoring error for deployment ${deployment.id}`, 
              error as Error
            );
          }
        }
      } catch (error) {
        this.logger.error('Monitoring loop error', error as Error);
      }
    }, 60000); // 1 minute
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.logger.info('Canary Deployment System cleaned up');
  }
}