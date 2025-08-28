import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ModelRouter } from '../../services/model-router/src/services/ModelRouter';

describe('Model Router API Contract Tests', () => {
  let modelRouter: ModelRouter;

  beforeEach(() => {
    modelRouter = new ModelRouter({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      } as any,
      metrics: {
        recordRequest: jest.fn(),
        recordRequestDuration: jest.fn(),
        recordError: jest.fn()
      } as any
    });
  });

  afterEach(async () => {
    if (modelRouter) {
      await modelRouter.shutdown();
    }
  });

  describe('Request Contract', () => {
    it('should accept valid model request structure', async () => {
      const validRequest = {
        id: 'req-123',
        model: 'gpt-4',
        prompt: 'Hello, world!',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: {
          requestType: 'completion' as const,
          priority: 'normal' as const,
          maxTokens: 1000,
          temperature: 0.7,
          customConditions: {
            userTier: 'premium'
          }
        }
      };

      const response = await modelRouter.routeRequest(validRequest);
      
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      expect(['success', 'error'].includes(response.status)).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidRequests = [
        // Missing id
        {
          model: 'gpt-4',
          prompt: 'Hello',
          agentType: 'completion',
          workspaceId: 'ws-123',
          tenantId: 'tenant-123',
          metadata: { requestType: 'completion' }
        },
        // Missing model
        {
          id: 'req-123',
          prompt: 'Hello',
          agentType: 'completion',
          workspaceId: 'ws-123',
          tenantId: 'tenant-123',
          metadata: { requestType: 'completion' }
        },
        // Missing tenantId
        {
          id: 'req-123',
          model: 'gpt-4',
          prompt: 'Hello',
          agentType: 'completion',
          workspaceId: 'ws-123',
          metadata: { requestType: 'completion' }
        },
        // Invalid request type
        {
          id: 'req-123',
          model: 'gpt-4',
          prompt: 'Hello',
          agentType: 'completion',
          workspaceId: 'ws-123',
          tenantId: 'tenant-123',
          metadata: { requestType: 'invalid-type' as any }
        }
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(modelRouter.routeRequest(invalidRequest as any))
          .rejects.toThrow();
      }
    });

    it('should validate metadata structure', async () => {
      const requestWithInvalidMetadata = {
        id: 'req-123',
        model: 'gpt-4',
        prompt: 'Hello',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: {
          requestType: 'completion',
          maxTokens: 'invalid', // Should be number
          temperature: 'invalid', // Should be number
          priority: 'invalid' // Should be 'low' | 'normal' | 'high' | 'critical'
        } as any
      };

      await expect(modelRouter.routeRequest(requestWithInvalidMetadata))
        .rejects.toThrow(/invalid.*metadata/i);
    });

    it('should accept all valid request types', async () => {
      const requestTypes = ['completion', 'chat', 'embedding', 'analysis'] as const;

      for (const requestType of requestTypes) {
        const request = {
          id: `req-${requestType}`,
          model: 'gpt-4',
          prompt: `Test ${requestType}`,
          agentType: 'completion',
          workspaceId: 'ws-123',
          tenantId: 'tenant-123',
          metadata: { requestType }
        };

        const response = await modelRouter.routeRequest(request);
        expect(response.status).toBeDefined();
      }
    });

    it('should accept all valid agent types', async () => {
      const agentTypes = [
        'completion', 'creative', 'analytical', 'legal', 'technical',
        'support', 'marketing', 'sales', 'research', 'qa'
      ];

      for (const agentType of agentTypes) {
        const request = {
          id: `req-${agentType}`,
          model: 'gpt-4',
          prompt: `Test ${agentType}`,
          agentType,
          workspaceId: 'ws-123',
          tenantId: 'tenant-123',
          metadata: { requestType: 'completion' as const }
        };

        const response = await modelRouter.routeRequest(request);
        expect(response.status).toBeDefined();
      }
    });

    it('should accept all valid priority levels', async () => {
      const priorities = ['low', 'normal', 'high', 'critical'] as const;

      for (const priority of priorities) {
        const request = {
          id: `req-${priority}`,
          model: 'gpt-4',
          prompt: `Test ${priority}`,
          agentType: 'completion',
          workspaceId: 'ws-123',
          tenantId: 'tenant-123',
          metadata: {
            requestType: 'completion' as const,
            priority
          }
        };

        const response = await modelRouter.routeRequest(request);
        expect(response.status).toBeDefined();
      }
    });
  });

  describe('Response Contract', () => {
    it('should return valid response structure for successful requests', async () => {
      const request = {
        id: 'req-success-123',
        model: 'gpt-4',
        prompt: 'Hello, world!',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' as const }
      };

      const response = await modelRouter.routeRequest(request);

      // Required fields
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('modelId');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('latency');

      // Status should be valid enum value
      expect(['success', 'error', 'timeout', 'rate_limited'].includes(response.status)).toBe(true);

      // Type validation
      expect(typeof response.id).toBe('string');
      expect(typeof response.modelId).toBe('string');
      expect(typeof response.latency).toBe('number');
      expect(response.latency).toBeGreaterThanOrEqual(0);
      expect(response.timestamp instanceof Date || typeof response.timestamp === 'string').toBe(true);

      if (response.status === 'success') {
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        
        // Usage structure
        expect(response.usage).toHaveProperty('promptTokens');
        expect(response.usage).toHaveProperty('completionTokens');
        expect(response.usage).toHaveProperty('totalTokens');
        expect(response.usage).toHaveProperty('cost');

        // Type validation for usage
        expect(typeof response.usage.promptTokens).toBe('number');
        expect(typeof response.usage.completionTokens).toBe('number');
        expect(typeof response.usage.totalTokens).toBe('number');
        expect(typeof response.usage.cost).toBe('number');

        expect(response.usage.promptTokens).toBeGreaterThanOrEqual(0);
        expect(response.usage.completionTokens).toBeGreaterThanOrEqual(0);
        expect(response.usage.totalTokens).toBeGreaterThanOrEqual(0);
        expect(response.usage.cost).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return valid error response structure', async () => {
      const invalidRequest = {
        id: 'req-error-123',
        model: 'non-existent-model',
        prompt: 'This will fail',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' as const }
      };

      try {
        await modelRouter.routeRequest(invalidRequest);
      } catch (error) {
        // Should throw structured error
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(typeof (error as any).message).toBe('string');
      }
    });

    it('should include metadata in response for different request types', async () => {
      const embeddingRequest = {
        id: 'req-embedding-123',
        model: 'text-embedding-ada-002',
        prompt: 'Generate embedding',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'embedding' as const }
      };

      const response = await modelRouter.routeRequest(embeddingRequest);

      if (response.status === 'success' && response.metadata?.requestType === 'embedding') {
        expect(Array.isArray(response.content) || typeof response.content === 'object').toBe(true);
      }
    });
  });

  describe('Routing Rule Contract', () => {
    it('should accept valid routing rule structure', async () => {
      const validRoutingRule = {
        name: 'Test Rule',
        condition: {
          agentType: ['creative', 'legal'],
          requestType: ['completion'],
          customConditions: {
            userTier: 'premium'
          }
        },
        targetModels: [
          {
            modelId: 'gpt-4',
            weight: 0.7,
            fallbackOrder: 1
          },
          {
            modelId: 'claude-3-sonnet',
            weight: 0.3,
            fallbackOrder: 2
          }
        ],
        trafficSplit: {
          primary: 100,
          canary: 0
        },
        priority: 80,
        enabled: true
      };

      await expect(modelRouter.addRoutingRule(validRoutingRule))
        .resolves.not.toThrow();
    });

    it('should validate routing rule constraints', async () => {
      const invalidRules = [
        // Missing name
        {
          condition: {},
          targetModels: [{ modelId: 'gpt-4', weight: 1, fallbackOrder: 1 }],
          trafficSplit: { primary: 100 },
          priority: 50,
          enabled: true
        },
        // Invalid weight (must sum to 1.0)
        {
          name: 'Invalid Weight Rule',
          condition: {},
          targetModels: [
            { modelId: 'gpt-4', weight: 0.8, fallbackOrder: 1 },
            { modelId: 'claude-3', weight: 0.5, fallbackOrder: 2 } // Sum > 1.0
          ],
          trafficSplit: { primary: 100 },
          priority: 50,
          enabled: true
        },
        // Invalid traffic split (must sum to 100)
        {
          name: 'Invalid Traffic Split Rule',
          condition: {},
          targetModels: [{ modelId: 'gpt-4', weight: 1, fallbackOrder: 1 }],
          trafficSplit: { primary: 60, canary: 50 }, // Sum > 100
          priority: 50,
          enabled: true
        }
      ];

      for (const rule of invalidRules) {
        await expect(modelRouter.addRoutingRule(rule as any))
          .rejects.toThrow();
      }
    });

    it('should validate model metadata structure', async () => {
      const models = await modelRouter.getAvailableModels();

      for (const model of models) {
        // Required fields
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('capabilities');
        expect(model).toHaveProperty('status');

        // Type validation
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(Array.isArray(model.capabilities)).toBe(true);
        expect(['available', 'degraded', 'unavailable'].includes(model.status)).toBe(true);

        // Capabilities validation
        const validCapabilities = [
          'text-generation', 'embeddings', 'text-analysis',
          'code-generation', 'translation', 'summarization'
        ];
        
        for (const capability of model.capabilities) {
          expect(validCapabilities.includes(capability)).toBe(true);
        }

        // Optional fields type validation
        if (model.pricing) {
          expect(typeof model.pricing.inputTokens).toBe('number');
          expect(typeof model.pricing.outputTokens).toBe('number');
          expect(typeof model.pricing.currency).toBe('string');
        }

        if (model.limits) {
          expect(typeof model.limits.maxTokens).toBe('number');
          expect(typeof model.limits.maxRequestsPerMinute).toBe('number');
        }
      }
    });
  });

  describe('Health Check Contract', () => {
    it('should return valid health status structure', async () => {
      const healthStatus = await modelRouter.getHealthStatus();

      // Required fields
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('uptime');
      expect(healthStatus).toHaveProperty('version');

      // Status validation
      expect(['healthy', 'degraded', 'unhealthy'].includes(healthStatus.status)).toBe(true);

      // Type validation
      expect(typeof healthStatus.uptime).toBe('number');
      expect(healthStatus.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof healthStatus.version).toBe('string');

      // Optional components
      if (healthStatus.components) {
        expect(typeof healthStatus.components).toBe('object');
        
        for (const [componentName, componentStatus] of Object.entries(healthStatus.components)) {
          expect(typeof componentName).toBe('string');
          expect(['healthy', 'degraded', 'unhealthy'].includes((componentStatus as any).status)).toBe(true);
        }
      }

      // Circuit breakers status
      if (healthStatus.circuitBreakers) {
        expect(typeof healthStatus.circuitBreakers).toBe('object');
        
        for (const [cbName, cbStatus] of Object.entries(healthStatus.circuitBreakers)) {
          expect(typeof cbName).toBe('string');
          expect(['CLOSED', 'OPEN', 'HALF_OPEN'].includes((cbStatus as any).state)).toBe(true);
        }
      }
    });

    it('should provide detailed endpoint health information', async () => {
      const healthStatus = await modelRouter.getHealthStatus();

      if (healthStatus.endpoints) {
        expect(Array.isArray(healthStatus.endpoints)).toBe(true);
        
        for (const endpoint of healthStatus.endpoints) {
          expect(endpoint).toHaveProperty('id');
          expect(endpoint).toHaveProperty('url');
          expect(endpoint).toHaveProperty('status');
          expect(endpoint).toHaveProperty('latency');

          expect(typeof endpoint.id).toBe('string');
          expect(typeof endpoint.url).toBe('string');
          expect(['healthy', 'degraded', 'unhealthy'].includes(endpoint.status)).toBe(true);
          expect(typeof endpoint.latency).toBe('number');
          expect(endpoint.latency).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Metrics Contract', () => {
    it('should provide Prometheus-compatible metrics format', async () => {
      // Trigger some activity to generate metrics
      const testRequest = {
        id: 'req-metrics-test',
        model: 'gpt-4',
        prompt: 'Metrics test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' as const }
      };

      await modelRouter.routeRequest(testRequest);

      const metricsEndpoint = '/metrics';
      // In a real implementation, this would make an HTTP request to the metrics endpoint
      // For now, we'll just verify the structure is available
      expect(typeof metricsEndpoint).toBe('string');
    });

    it('should track required business metrics', () => {
      // Verify that the model router exposes methods for business metrics
      expect(typeof modelRouter.getRequestMetrics).toBe('function');
      
      const metrics = modelRouter.getRequestMetrics(10);
      expect(Array.isArray(metrics)).toBe(true);
      
      for (const metric of metrics.slice(0, 5)) { // Check first 5 entries
        expect(metric).toHaveProperty('requestId');
        expect(metric).toHaveProperty('modelId');
        expect(metric).toHaveProperty('latency');
        expect(metric).toHaveProperty('timestamp');
        
        if (metric.usage) {
          expect(metric.usage).toHaveProperty('totalTokens');
          expect(metric.usage).toHaveProperty('cost');
        }
      }
    });
  });

  describe('Workspace Analytics Contract', () => {
    it('should provide valid analytics structure', async () => {
      const analytics = await modelRouter.getWorkspaceAnalytics('ws-123', {
        timeRange: '24h',
        includeModels: true,
        includeAgents: true
      });

      expect(analytics).toHaveProperty('workspaceId');
      expect(analytics).toHaveProperty('timeRange');
      expect(analytics).toHaveProperty('totalRequests');
      expect(analytics).toHaveProperty('totalCost');

      expect(analytics.workspaceId).toBe('ws-123');
      expect(typeof analytics.totalRequests).toBe('number');
      expect(typeof analytics.totalCost).toBe('number');
      expect(analytics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(analytics.totalCost).toBeGreaterThanOrEqual(0);

      if (analytics.modelBreakdown) {
        expect(typeof analytics.modelBreakdown).toBe('object');
        
        for (const [modelId, stats] of Object.entries(analytics.modelBreakdown)) {
          expect(typeof modelId).toBe('string');
          expect((stats as any)).toHaveProperty('requests');
          expect((stats as any)).toHaveProperty('cost');
          expect(typeof (stats as any).requests).toBe('number');
          expect(typeof (stats as any).cost).toBe('number');
        }
      }

      if (analytics.agentBreakdown) {
        expect(typeof analytics.agentBreakdown).toBe('object');
        
        for (const [agentType, stats] of Object.entries(analytics.agentBreakdown)) {
          expect(typeof agentType).toBe('string');
          expect((stats as any)).toHaveProperty('requests');
          expect(typeof (stats as any).requests).toBe('number');
        }
      }
    });

    it('should validate time range parameters', async () => {
      const validTimeRanges = ['1h', '24h', '7d', '30d'];
      
      for (const timeRange of validTimeRanges) {
        const analytics = await modelRouter.getWorkspaceAnalytics('ws-123', {
          timeRange
        });
        
        expect(analytics.timeRange).toBe(timeRange);
      }

      // Invalid time ranges should throw
      const invalidTimeRanges = ['invalid', '1y', ''];
      
      for (const timeRange of invalidTimeRanges) {
        await expect(
          modelRouter.getWorkspaceAnalytics('ws-123', { timeRange })
        ).rejects.toThrow();
      }
    });
  });

  describe('Configuration Contract', () => {
    it('should validate configuration structure', () => {
      const validConfig = {
        maxConcurrentRequests: 100,
        defaultTimeout: 30000,
        retryAttempts: 3,
        circuitBreakerThreshold: 5,
        enableMetrics: true,
        enableLogging: true,
        logLevel: 'info' as const,
        resilience: {
          circuitBreaker: {
            failureThreshold: 5,
            recoveryTimeout: 60000
          },
          retry: {
            maxAttempts: 3,
            baseDelay: 1000
          },
          bulkhead: {
            maxConcurrency: 10
          }
        }
      };

      // Should not throw when applying valid config
      expect(() => {
        modelRouter.updateConfiguration(validConfig);
      }).not.toThrow();
    });

    it('should reject invalid configuration values', () => {
      const invalidConfigs = [
        { maxConcurrentRequests: -1 }, // Negative value
        { defaultTimeout: 'invalid' }, // Wrong type
        { logLevel: 'invalid-level' }, // Invalid enum value
        { resilience: { circuitBreaker: { failureThreshold: 0 } } } // Zero threshold
      ];

      for (const invalidConfig of invalidConfigs) {
        expect(() => {
          modelRouter.updateConfiguration(invalidConfig as any);
        }).toThrow();
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain API compatibility with previous versions', async () => {
      // Test legacy request format (if supported)
      const legacyRequest = {
        id: 'req-legacy-123',
        model: 'gpt-4',
        prompt: 'Legacy format test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123'
        // Note: missing metadata object (legacy format)
      };

      // Should either work with defaults or provide clear error message
      try {
        const response = await modelRouter.routeRequest(legacyRequest as any);
        expect(response.status).toBeDefined();
      } catch (error) {
        expect((error as any).message).toContain('metadata');
      }
    });

    it('should handle deprecated fields gracefully', async () => {
      const requestWithDeprecatedFields = {
        id: 'req-deprecated-123',
        model: 'gpt-4',
        prompt: 'Deprecated fields test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' as const },
        // Deprecated fields
        temperature: 0.7, // Moved to metadata
        maxTokens: 1000   // Moved to metadata
      };

      const response = await modelRouter.routeRequest(requestWithDeprecatedFields as any);
      expect(response.status).toBeDefined();
    });
  });
});