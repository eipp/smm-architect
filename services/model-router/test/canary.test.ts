import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CanaryDeploymentSystem, CanaryDeployment } from '../src/services/CanaryDeploymentSystem';
import { ModelEvaluationFramework } from '../src/services/ModelEvaluationFramework';
import { ModelRegistry } from '../src/services/ModelRegistry';
import { ModelRequest } from '../src/types';

describe('Canary Deployment System Tests', () => {
  let canarySystem: CanaryDeploymentSystem;
  let evaluationFramework: ModelEvaluationFramework;
  let registry: ModelRegistry;
  let productionModelId: string;
  let canaryModelId: string;
  let testDeploymentId: string;

  beforeAll(async () => {
    registry = new ModelRegistry('redis://localhost:6379');
    evaluationFramework = new ModelEvaluationFramework(registry);
    canarySystem = new CanaryDeploymentSystem(registry, evaluationFramework);

    // Register test models
    const productionModel = await registry.registerModel({
      name: 'Production GPT-4',
      version: 'prod-1.0',
      provider: 'openai',
      modelType: 'chat',
      capabilities: [{ type: 'text-generation', maxTokens: 4096 }],
      parameters: { temperature: 0.7, maxTokens: 4096 },
      status: 'active',
      tags: ['production']
    });
    productionModelId = productionModel.id;

    const canaryModel = await registry.registerModel({
      name: 'Canary GPT-4',
      version: 'canary-1.1',
      provider: 'openai',
      modelType: 'chat',
      capabilities: [{ type: 'text-generation', maxTokens: 4096 }],
      parameters: { temperature: 0.7, maxTokens: 4096 },
      status: 'active',
      tags: ['canary']
    });
    canaryModelId = canaryModel.id;
  });

  afterAll(async () => {
    await canarySystem.cleanup();
    await registry.disconnect();
  });

  beforeEach(() => {
    // Clean state between tests
  });

  describe('Deployment Creation', () => {
    it('should create a canary deployment successfully', async () => {
      const deploymentConfig = {
        name: 'Test Canary Deployment',
        description: 'Testing canary deployment functionality',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 90,
          canary: 10
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          steps: 5,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 100,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 30
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      const deployment = await canarySystem.createCanaryDeployment(deploymentConfig);
      testDeploymentId = deployment.id;

      expect(deployment).toHaveProperty('id');
      expect(deployment.name).toBe(deploymentConfig.name);
      expect(deployment.productionModelId).toBe(productionModelId);
      expect(deployment.canaryModelId).toBe(canaryModelId);
      expect(deployment.status).toBe('preparing');
      expect(deployment.trafficSplit.production + deployment.trafficSplit.canary).toBe(100);
    });

    it('should fail with invalid traffic split', async () => {
      const invalidConfig = {
        name: 'Invalid Deployment',
        description: 'Testing invalid configuration',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 60,
          canary: 50 // Total is 110, should fail
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 100,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 30
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      await expect(
        canarySystem.createCanaryDeployment(invalidConfig)
      ).rejects.toThrow('Traffic split must sum to 100%');
    });

    it('should fail with non-existent models', async () => {
      const invalidConfig = {
        name: 'Invalid Model Deployment',
        description: 'Testing with non-existent models',
        productionModelId: 'non-existent-prod',
        canaryModelId: 'non-existent-canary',
        trafficSplit: {
          production: 90,
          canary: 10
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 100,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 30
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      await expect(
        canarySystem.createCanaryDeployment(invalidConfig)
      ).rejects.toThrow('Production model not found');
    });
  });

  describe('Deployment Lifecycle', () => {
    beforeEach(async () => {
      // Create a test deployment for lifecycle tests
      const deploymentConfig = {
        name: 'Lifecycle Test Deployment',
        description: 'Testing deployment lifecycle',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 95,
          canary: 5
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 30,
          steps: 3,
          maxTrafficPercentage: 30
        },
        successCriteria: {
          minRequests: 50,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 15
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      const deployment = await canarySystem.createCanaryDeployment(deploymentConfig);
      testDeploymentId = deployment.id;
    });

    it('should start deployment successfully', async () => {
      await expect(
        canarySystem.startCanaryDeployment(testDeploymentId)
      ).resolves.not.toThrow();

      const status = await canarySystem.getDeploymentStatus(testDeploymentId);
      expect(status.deployment.status).toBe('active');
      expect(status.deployment.startedAt).toBeDefined();
    });

    it('should not start deployment in wrong status', async () => {
      await canarySystem.startCanaryDeployment(testDeploymentId);
      
      await expect(
        canarySystem.startCanaryDeployment(testDeploymentId)
      ).rejects.toThrow('Cannot start deployment in status: active');
    });

    it('should pause active deployment', async () => {
      await canarySystem.startCanaryDeployment(testDeploymentId);
      await canarySystem.pauseDeployment(testDeploymentId);

      const status = await canarySystem.getDeploymentStatus(testDeploymentId);
      expect(status.deployment.status).toBe('paused');
    });

    it('should resume paused deployment', async () => {
      await canarySystem.startCanaryDeployment(testDeploymentId);
      await canarySystem.pauseDeployment(testDeploymentId);
      await canarySystem.resumeDeployment(testDeploymentId);

      const status = await canarySystem.getDeploymentStatus(testDeploymentId);
      expect(status.deployment.status).toBe('active');
    });

    it('should rollback deployment with reason', async () => {
      await canarySystem.startCanaryDeployment(testDeploymentId);
      const reason = 'Manual rollback for testing';
      
      await canarySystem.rollbackDeployment(testDeploymentId, reason);

      const status = await canarySystem.getDeploymentStatus(testDeploymentId);
      expect(status.deployment.status).toBe('rolledback');
      expect(status.deployment.completedAt).toBeDefined();
    });

    it('should complete deployment successfully', async () => {
      await canarySystem.startCanaryDeployment(testDeploymentId);
      await canarySystem.completeDeployment(testDeploymentId);

      const status = await canarySystem.getDeploymentStatus(testDeploymentId);
      expect(status.deployment.status).toBe('completed');
      expect(status.deployment.completedAt).toBeDefined();
    });
  });

  describe('Request Routing', () => {
    beforeEach(async () => {
      // Create and start a deployment for routing tests
      const deploymentConfig = {
        name: 'Routing Test Deployment',
        description: 'Testing request routing',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 80,
          canary: 20
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 100,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 30
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      const deployment = await canarySystem.createCanaryDeployment(deploymentConfig);
      testDeploymentId = deployment.id;
      await canarySystem.startCanaryDeployment(testDeploymentId);
    });

    it('should route requests according to traffic split', async () => {
      const testRequest: ModelRequest = {
        id: 'test-request-001',
        agentType: 'creative',
        workspaceId: 'test-workspace',
        userId: 'test-user',
        prompt: 'Test prompt for routing',
        parameters: {},
        metadata: { requestType: 'completion' },
        timestamp: new Date()
      };

      const routes = [];
      // Test multiple requests to verify traffic distribution
      for (let i = 0; i < 100; i++) {
        const route = await canarySystem.routeRequest({
          ...testRequest,
          id: `test-request-${i}`
        });
        routes.push(route);
      }

      const canaryCount = routes.filter(r => r.isCanary).length;
      const productionCount = routes.filter(r => !r.isCanary).length;

      // Should roughly match 20/80 split (allow some variance)
      expect(canaryCount).toBeGreaterThan(10);
      expect(canaryCount).toBeLessThan(35);
      expect(productionCount).toBeGreaterThan(65);
      expect(productionCount).toBeLessThan(90);
    });

    it('should return deployment ID for canary routes', async () => {
      const testRequest: ModelRequest = {
        id: 'test-request-deployment-id',
        agentType: 'creative',
        workspaceId: 'test-workspace',
        userId: 'test-user',
        prompt: 'Test prompt for deployment ID',
        parameters: {},
        metadata: { requestType: 'completion' },
        timestamp: new Date()
      };

      const route = await canarySystem.routeRequest(testRequest);
      expect(route.deploymentId).toBe(testDeploymentId);
      expect(route.selectedModelId).toMatch(/^[a-f0-9-]+$/); // UUID format
    });
  });

  describe('Performance Evaluation', () => {
    beforeEach(async () => {
      // Create deployment for evaluation tests
      const deploymentConfig = {
        name: 'Evaluation Test Deployment',
        description: 'Testing performance evaluation',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 70,
          canary: 30
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 20,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 10
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      const deployment = await canarySystem.createCanaryDeployment(deploymentConfig);
      testDeploymentId = deployment.id;
      await canarySystem.startCanaryDeployment(testDeploymentId);
    });

    it('should evaluate canary performance', async () => {
      const metrics = await canarySystem.evaluateCanaryPerformance(testDeploymentId);

      expect(metrics).toHaveProperty('deploymentId', testDeploymentId);
      expect(metrics).toHaveProperty('timeWindow');
      expect(metrics).toHaveProperty('production');
      expect(metrics).toHaveProperty('canary');
      expect(metrics).toHaveProperty('comparison');

      expect(metrics.production).toHaveProperty('requests');
      expect(metrics.production).toHaveProperty('successRate');
      expect(metrics.production).toHaveProperty('errorRate');
      expect(metrics.production).toHaveProperty('avgLatency');
      expect(metrics.production).toHaveProperty('qualityScore');

      expect(metrics.canary).toHaveProperty('requests');
      expect(metrics.canary).toHaveProperty('successRate');
      expect(metrics.canary).toHaveProperty('errorRate');
      expect(metrics.canary).toHaveProperty('avgLatency');
      expect(metrics.canary).toHaveProperty('qualityScore');

      expect(metrics.comparison).toHaveProperty('performanceDelta');
      expect(metrics.comparison).toHaveProperty('qualityDelta');
      expect(metrics.comparison).toHaveProperty('costDelta');
      expect(metrics.comparison).toHaveProperty('recommendation');
      expect(metrics.comparison).toHaveProperty('confidence');

      expect(['proceed', 'pause', 'rollback']).toContain(metrics.comparison.recommendation);
    });
  });

  describe('Rollout Decisions', () => {
    beforeEach(async () => {
      // Create deployment for decision tests
      const deploymentConfig = {
        name: 'Decision Test Deployment',
        description: 'Testing rollout decisions',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 85,
          canary: 15
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          steps: 4,
          maxTrafficPercentage: 60
        },
        successCriteria: {
          minRequests: 30,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 15
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      const deployment = await canarySystem.createCanaryDeployment(deploymentConfig);
      testDeploymentId = deployment.id;
      await canarySystem.startCanaryDeployment(testDeploymentId);
    });

    it('should make rollout decision', async () => {
      const decision = await canarySystem.makeRolloutDecision(testDeploymentId);

      expect(decision).toHaveProperty('deploymentId', testDeploymentId);
      expect(decision).toHaveProperty('action');
      expect(decision).toHaveProperty('reason');
      expect(decision).toHaveProperty('metrics');

      expect(['continue', 'pause', 'rollback', 'complete']).toContain(decision.action);
      expect(typeof decision.reason).toBe('string');
    });

    it('should execute rollout decision', async () => {
      const decision = await canarySystem.makeRolloutDecision(testDeploymentId);
      
      await expect(
        canarySystem.executeRolloutDecision(decision)
      ).resolves.not.toThrow();

      // Verify the decision was applied
      const status = await canarySystem.getDeploymentStatus(testDeploymentId);
      expect(status.deployment.updatedAt).toBeDefined();
    });
  });

  describe('Deployment Listing and Filtering', () => {
    it('should list all deployments', async () => {
      const deployments = await canarySystem.listDeployments();
      expect(Array.isArray(deployments)).toBe(true);
      expect(deployments.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter deployments by status', async () => {
      // Create a deployment to test filtering
      const deploymentConfig = {
        name: 'Filter Test Deployment',
        description: 'Testing deployment filtering',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 90,
          canary: 10
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 100,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 30
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      await canarySystem.createCanaryDeployment(deploymentConfig);

      const preparingDeployments = await canarySystem.listDeployments({ 
        status: 'preparing' 
      });
      
      expect(Array.isArray(preparingDeployments)).toBe(true);
      expect(preparingDeployments.length).toBeGreaterThanOrEqual(1);
      expect(preparingDeployments.every(d => d.status === 'preparing')).toBe(true);
    });

    it('should filter deployments by model IDs', async () => {
      const deployments = await canarySystem.listDeployments({
        productionModelId
      });

      expect(Array.isArray(deployments)).toBe(true);
      if (deployments.length > 0) {
        expect(deployments.every(d => d.productionModelId === productionModelId)).toBe(true);
      }
    });
  });

  describe('Deployment Status and History', () => {
    beforeEach(async () => {
      // Create deployment for status tests
      const deploymentConfig = {
        name: 'Status Test Deployment',
        description: 'Testing deployment status',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 75,
          canary: 25
        },
        rolloutStrategy: {
          type: 'exponential' as const,
          duration: 45,
          maxTrafficPercentage: 75
        },
        successCriteria: {
          minRequests: 50,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 20
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      const deployment = await canarySystem.createCanaryDeployment(deploymentConfig);
      testDeploymentId = deployment.id;
    });

    it('should get deployment status with metrics and recommendations', async () => {
      const status = await canarySystem.getDeploymentStatus(testDeploymentId);

      expect(status).toHaveProperty('deployment');
      expect(status).toHaveProperty('metricsHistory');
      expect(status).toHaveProperty('recommendations');

      expect(status.deployment.id).toBe(testDeploymentId);
      expect(Array.isArray(status.metricsHistory)).toBe(true);
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    it('should include current metrics for active deployments', async () => {
      await canarySystem.startCanaryDeployment(testDeploymentId);
      const status = await canarySystem.getDeploymentStatus(testDeploymentId);

      expect(status.currentMetrics).toBeDefined();
      expect(status.currentMetrics).toHaveProperty('deploymentId', testDeploymentId);
    });

    it('should provide helpful recommendations', async () => {
      const status = await canarySystem.getDeploymentStatus(testDeploymentId);
      
      expect(Array.isArray(status.recommendations)).toBe(true);
      expect(status.recommendations.length).toBeGreaterThan(0);
      expect(status.recommendations.every(r => typeof r === 'string')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent deployment operations', async () => {
      const fakeId = 'non-existent-deployment';

      await expect(
        canarySystem.startCanaryDeployment(fakeId)
      ).rejects.toThrow('Deployment not found');

      await expect(
        canarySystem.getDeploymentStatus(fakeId)
      ).rejects.toThrow('Deployment not found');

      await expect(
        canarySystem.pauseDeployment(fakeId)
      ).rejects.toThrow('Deployment not found');
    });

    it('should handle invalid state transitions', async () => {
      const deploymentConfig = {
        name: 'Error Test Deployment',
        description: 'Testing error handling',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 90,
          canary: 10
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 100,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 30
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      const deployment = await canarySystem.createCanaryDeployment(deploymentConfig);
      
      // Try to pause a deployment that hasn't been started
      await expect(
        canarySystem.pauseDeployment(deployment.id)
      ).rejects.toThrow('Cannot pause deployment in status: preparing');

      // Try to resume a deployment that isn't paused
      await canarySystem.startCanaryDeployment(deployment.id);
      await expect(
        canarySystem.resumeDeployment(deployment.id)
      ).rejects.toThrow('Cannot resume deployment in status: active');
    });
  });

  describe('Event Emissions', () => {
    it('should emit events during deployment lifecycle', (done) => {
      let eventsReceived = 0;
      const expectedEvents = ['deploymentCreated', 'deploymentStarted'];

      const eventHandler = (event: any) => {
        eventsReceived++;
        if (eventsReceived === expectedEvents.length) {
          done();
        }
      };

      canarySystem.on('deploymentCreated', eventHandler);
      canarySystem.on('deploymentStarted', eventHandler);

      // Create and start deployment
      const deploymentConfig = {
        name: 'Event Test Deployment',
        description: 'Testing event emissions',
        productionModelId,
        canaryModelId,
        trafficSplit: {
          production: 90,
          canary: 10
        },
        rolloutStrategy: {
          type: 'linear' as const,
          duration: 60,
          maxTrafficPercentage: 50
        },
        successCriteria: {
          minRequests: 100,
          maxErrorRate: 0.05,
          minSuccessRate: 0.95,
          maxLatencyP95: 2000,
          minQualityScore: 0.8,
          evaluationWindow: 30
        },
        rollbackCriteria: {
          maxErrorRate: 0.1,
          maxLatencyP95: 3000,
          minSuccessRate: 0.9,
          minQualityScore: 0.7,
          alertThresholds: {
            errorSpike: 0.2,
            latencySpike: 5000,
            qualityDrop: 0.3
          }
        },
        createdBy: 'test-user'
      };

      canarySystem.createCanaryDeployment(deploymentConfig)
        .then(deployment => canarySystem.startCanaryDeployment(deployment.id))
        .catch(done);
    });
  });
});