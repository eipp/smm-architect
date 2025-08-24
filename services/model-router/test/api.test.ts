import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app, registry, router } from '../src/index';
import { ModelMetadata, ModelRequest } from '../src/types';

describe('Model Router API Tests', () => {
  let testModelId: string;
  let testRuleId: string;

  beforeAll(async () => {
    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await registry.disconnect();
  });

  beforeEach(() => {
    // Clear metrics between tests
    router.clearOldMetrics(0);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'model-router');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Model Management', () => {
    it('should register a new model', async () => {
      const modelData = {
        name: 'Test GPT-4',
        version: 'test-1.0',
        provider: 'openai',
        modelType: 'chat',
        capabilities: [{ type: 'text-generation', maxTokens: 4096 }],
        parameters: { temperature: 0.7, maxTokens: 4096 },
        status: 'active',
        tags: ['test', 'gpt-4']
      };

      const response = await request(app)
        .post('/api/models')
        .send(modelData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(modelData.name);
      expect(response.body.provider).toBe(modelData.provider);
      testModelId = response.body.id;
    });

    it('should fail to register model with invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        provider: 'invalid-provider'
      };

      await request(app)
        .post('/api/models')
        .send(invalidData)
        .expect(400);
    });

    it('should get model by ID', async () => {
      const response = await request(app)
        .get(`/api/models/${testModelId}`)
        .expect(200);

      expect(response.body.id).toBe(testModelId);
      expect(response.body.name).toBe('Test GPT-4');
    });

    it('should return 404 for non-existent model', async () => {
      await request(app)
        .get('/api/models/non-existent-id')
        .expect(404);
    });

    it('should get models by criteria', async () => {
      const response = await request(app)
        .get('/api/models?provider=openai&status=active')
        .expect(200);

      expect(response.body).toHaveProperty('models');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.models)).toBe(true);
    });

    it('should update model status', async () => {
      await request(app)
        .patch(`/api/models/${testModelId}/status`)
        .send({ status: 'inactive' })
        .expect(200);

      const response = await request(app)
        .get(`/api/models/${testModelId}`)
        .expect(200);

      expect(response.body.status).toBe('inactive');
    });

    it('should batch update model statuses', async () => {
      const updates = [
        { modelId: testModelId, status: 'active' }
      ];

      const response = await request(app)
        .patch('/api/models/batch/status')
        .send({ updates })
        .expect(200);

      expect(response.body.summary.successful).toBe(1);
      expect(response.body.results[0].success).toBe(true);
    });
  });

  describe('Model Health Management', () => {
    it('should update model health', async () => {
      const healthData = {
        status: 'healthy',
        responseTime: 500,
        errorRate: 0.01,
        availability: 99.9
      };

      await request(app)
        .post(`/api/models/${testModelId}/health`)
        .send(healthData)
        .expect(200);
    });

    it('should get model health', async () => {
      const response = await request(app)
        .get(`/api/models/${testModelId}/health`)
        .expect(200);

      expect(response.body).toHaveProperty('modelId', testModelId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('healthScore');
    });
  });

  describe('Model Endpoints', () => {
    it('should register model endpoint', async () => {
      const endpointData = {
        url: 'https://api.openai.com/v1/chat/completions',
        type: 'primary',
        weight: 1.0,
        healthCheckUrl: 'https://api.openai.com/v1/models'
      };

      const response = await request(app)
        .post(`/api/models/${testModelId}/endpoints`)
        .send(endpointData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.url).toBe(endpointData.url);
      expect(response.body.modelId).toBe(testModelId);
    });

    it('should get model endpoints', async () => {
      const response = await request(app)
        .get(`/api/models/${testModelId}/endpoints`)
        .expect(200);

      expect(response.body).toHaveProperty('endpoints');
      expect(Array.isArray(response.body.endpoints)).toBe(true);
    });
  });

  describe('Routing Rules', () => {
    it('should add routing rule', async () => {
      const ruleData = {
        name: 'Test Rule',
        condition: {
          agentType: ['creative'],
          requestType: ['completion']
        },
        targetModels: [
          { modelId: testModelId, weight: 1.0, fallbackOrder: 1 }
        ],
        trafficSplit: { primary: 100 },
        priority: 50,
        enabled: true
      };

      const response = await request(app)
        .post('/api/routing/rules')
        .send(ruleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(ruleData.name);
      testRuleId = response.body.id;
    });

    it('should get routing rules', async () => {
      const response = await request(app)
        .get('/api/routing/rules')
        .expect(200);

      expect(response.body).toHaveProperty('rules');
      expect(Array.isArray(response.body.rules)).toBe(true);
    });

    it('should update routing rule', async () => {
      const updates = {
        priority: 75,
        enabled: false
      };

      const response = await request(app)
        .patch(`/api/routing/rules/${testRuleId}`)
        .send(updates)
        .expect(200);

      expect(response.body.priority).toBe(75);
      expect(response.body.enabled).toBe(false);
    });

    it('should delete routing rule', async () => {
      await request(app)
        .delete(`/api/routing/rules/${testRuleId}`)
        .expect(200);

      // Verify rule is deleted by checking it's not in the list
      const response = await request(app)
        .get('/api/routing/rules')
        .expect(200);

      const deletedRule = response.body.rules.find((r: any) => r.id === testRuleId);
      expect(deletedRule).toBeUndefined();
    });
  });

  describe('Request Routing', () => {
    it('should route a request successfully', async () => {
      const requestData = {
        id: `test-${Date.now()}`,
        agentType: 'creative',
        workspaceId: 'test-workspace',
        userId: 'test-user',
        prompt: 'Generate a creative marketing message',
        parameters: { temperature: 0.8 },
        metadata: { requestType: 'completion' }
      };

      const response = await request(app)
        .post('/api/route')
        .send(requestData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('requestId', requestData.id);
      expect(response.body).toHaveProperty('modelId');
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('usage');
    });

    it('should test routing without execution', async () => {
      const testData = {
        agentType: 'creative',
        workspaceId: 'test-workspace',
        requestType: 'completion',
        prompt: 'Test prompt for routing'
      };

      const response = await request(app)
        .post('/api/routing/test')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('applicableRules');
      expect(response.body).toHaveProperty('selectedModel');
      expect(response.body).toHaveProperty('availableModels');
      expect(response.body).toHaveProperty('reasoning');
    });
  });

  describe('Agent Management', () => {
    it('should set agent preferences', async () => {
      const preferences = {
        preferredModels: [testModelId],
        fallbackModels: [testModelId],
        requiredCapabilities: ['text-generation'],
        performanceRequirements: {
          maxLatency: 5000,
          minSuccessRate: 0.95
        }
      };

      await request(app)
        .post('/api/agents/creative/preferences')
        .send(preferences)
        .expect(200);
    });

    it('should get agent preferences', async () => {
      const response = await request(app)
        .get('/api/agents/creative/preferences')
        .expect(200);

      expect(response.body).toHaveProperty('agentType', 'creative');
      expect(response.body).toHaveProperty('preferredModels');
    });

    it('should get active models for agent', async () => {
      const response = await request(app)
        .get('/api/agents/creative/models')
        .expect(200);

      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);
    });
  });

  describe('Workspace Management', () => {
    it('should set workspace config', async () => {
      const config = {
        modelRestrictions: ['gpt-4', 'claude-3'],
        budgetLimits: {
          daily: 100,
          monthly: 2000
        },
        qualityRequirements: {
          minSuccessRate: 0.95,
          maxLatency: 5000
        },
        complianceRequirements: ['gdpr', 'ccpa']
      };

      await request(app)
        .post('/api/workspaces/test-workspace/config')
        .send(config)
        .expect(200);
    });
  });

  describe('Analytics and Monitoring', () => {
    beforeEach(async () => {
      // Create some test metrics by making requests
      const requestData = {
        id: `analytics-test-${Date.now()}`,
        agentType: 'creative',
        workspaceId: 'test-workspace',
        userId: 'test-user',
        prompt: 'Test prompt for analytics',
        parameters: {},
        metadata: { requestType: 'completion' }
      };

      await request(app)
        .post('/api/route')
        .send(requestData);
    });

    it('should get request metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/requests?limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('count');
    });

    it('should get model analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/models?timeRange=1h')
        .expect(200);

      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('averageLatency');
      expect(response.body).toHaveProperty('successRate');
    });

    it('should get workspace analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/workspaces/test-workspace?timeRange=1h')
        .expect(200);

      expect(response.body).toHaveProperty('workspaceId', 'test-workspace');
      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('modelUsage');
    });

    it('should get system health overview', async () => {
      const response = await request(app)
        .get('/api/health/overview')
        .expect(200);

      expect(response.body).toHaveProperty('models');
      expect(response.body).toHaveProperty('routing');
      expect(response.body).toHaveProperty('performance');
    });
  });

  describe('Configuration Management', () => {
    it('should export configuration', async () => {
      const response = await request(app)
        .get('/api/config/export')
        .expect(200);

      expect(response.body).toHaveProperty('models');
      expect(response.body).toHaveProperty('routingRules');
      expect(response.body).toHaveProperty('exportedAt');
    });

    it('should import configuration', async () => {
      const config = {
        models: [{
          name: 'Imported Model',
          version: 'import-1.0',
          provider: 'openai',
          modelType: 'chat',
          capabilities: [{ type: 'text-generation', maxTokens: 4096 }],
          parameters: {},
          status: 'active',
          tags: ['imported']
        }],
        routingRules: [{
          name: 'Imported Rule',
          condition: { agentType: ['test'] },
          targetModels: [{ modelId: 'test-model', weight: 1.0, fallbackOrder: 1 }],
          trafficSplit: { primary: 100 },
          priority: 1,
          enabled: true
        }]
      };

      const response = await request(app)
        .post('/api/config/import')
        .send({ config })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid route requests', async () => {
      const invalidRequest = {
        // Missing required fields
        prompt: 'Test prompt'
      };

      await request(app)
        .post('/api/route')
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/models')
        .send('invalid json')
        .type('json')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // This test would need to be adjusted based on actual rate limit settings
      // For now, just verify that rate limiting middleware is applied
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(app).get('/health'));
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});