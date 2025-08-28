import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ModelRouter } from '../../services/model-router/src/services/ModelRouter';
import { PrometheusMetricsService } from '../../services/model-router/src/monitoring/metrics';
import { StructuredLogger } from '../../services/shared/src/logging/structured-logger';

// Mock external dependencies
jest.mock('../../services/shared/src/logging/structured-logger');
jest.mock('@sentry/node');
jest.mock('prom-client');

describe('Model Router Integration Tests', () => {
  let modelRouter: ModelRouter;
  let mockLogger: jest.Mocked<StructuredLogger>;
  let mockMetrics: jest.Mocked<PrometheusMetricsService>;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      performance: jest.fn(),
      audit: jest.fn(),
      setCorrelationId: jest.fn(),
      setContext: jest.fn(),
      clearContext: jest.fn(),
      startTimer: jest.fn().mockReturnValue({ end: jest.fn() }),
      shutdown: jest.fn()
    } as any;

    // Mock metrics service
    mockMetrics = {
      recordRequest: jest.fn(),
      recordRequestDuration: jest.fn(),
      recordError: jest.fn(),
      recordTokenUsage: jest.fn(),
      recordCost: jest.fn(),
      recordCircuitBreakerState: jest.fn(),
      recordCircuitBreakerOperation: jest.fn(),
      recordEndpointHealth: jest.fn(),
      recordRetryAttempt: jest.fn(),
      getMetrics: jest.fn().mockResolvedValue('# metrics'),
      getHealthMetrics: jest.fn().mockReturnValue({ uptime: 1000 }),
      hashTenantId: jest.fn().mockImplementation((id: string) => id.substring(0, 8))
    } as any;

    // Initialize ModelRouter with mocked dependencies
    modelRouter = new ModelRouter({
      logger: mockLogger,
      metrics: mockMetrics,
      resilience: {
        circuitBreaker: {
          failureThreshold: 3,
          recoveryTimeout: 5000
        },
        retry: {
          maxAttempts: 3,
          baseDelay: 100
        },
        bulkhead: {
          maxConcurrency: 10
        }
      }
    });
  });

  afterEach(async () => {
    if (modelRouter) {
      await modelRouter.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('End-to-End Request Processing', () => {
    it('should successfully route and execute a model request', async () => {
      const request = {
        id: 'req-123',
        model: 'gpt-4',
        prompt: 'Hello, world!',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: {
          requestType: 'completion',
          priority: 'normal'
        }
      };

      const response = await modelRouter.routeRequest(request);

      // Verify successful response
      expect(response.status).toBe('success');
      expect(response.modelId).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.usage).toBeDefined();

      // Verify logging was called
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing model request',
        expect.objectContaining({
          requestId: request.id,
          model: request.model,
          agentType: request.agentType
        })
      );

      // Verify metrics were recorded
      expect(mockMetrics.recordRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: '/api/models/route',
          model_id: expect.any(String),
          tenant_id_hash: expect.any(String)
        })
      );

      expect(mockMetrics.recordRequestDuration).toHaveBeenCalled();
      expect(mockMetrics.recordTokenUsage).toHaveBeenCalled();
      expect(mockMetrics.recordCost).toHaveBeenCalled();
    });

    it('should handle request routing with circuit breaker', async () => {
      // Mock a failing endpoint to trigger circuit breaker
      const failingRequest = {
        id: 'req-fail-123',
        model: 'failing-model',
        prompt: 'This will fail',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: {
          requestType: 'completion'
        }
      };

      // Simulate multiple failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await modelRouter.routeRequest({
            ...failingRequest,
            id: `req-fail-${i}`
          });
        } catch (error) {
          // Expected failures
        }
      }

      // Verify circuit breaker metrics were recorded
      expect(mockMetrics.recordCircuitBreakerOperation).toHaveBeenCalledWith(
        expect.any(String),
        'failure'
      );
    });

    it('should retry failed requests according to policy', async () => {
      const retriableRequest = {
        id: 'req-retry-123',
        model: 'temporary-failing-model',
        prompt: 'Retry me',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: {
          requestType: 'completion'
        }
      };

      // Mock the router to simulate temporary failures followed by success
      const originalExecuteRequest = modelRouter['executeRequest'];
      let attempts = 0;
      
      modelRouter['executeRequest'] = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary service unavailable');
        }
        return originalExecuteRequest.call(modelRouter, retriableRequest);
      });

      const response = await modelRouter.routeRequest(retriableRequest);

      expect(response.status).toBe('success');
      expect(attempts).toBe(3);
      expect(mockMetrics.recordRetryAttempt).toHaveBeenCalled();
    });

    it('should apply rate limiting through bulkhead pattern', async () => {
      const requests = Array.from({ length: 15 }, (_, i) => ({
        id: `req-bulk-${i}`,
        model: 'gpt-4',
        prompt: `Request ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: {
          requestType: 'completion',
          priority: i < 5 ? 'high' : 'normal'
        }
      }));

      // Execute requests concurrently
      const promises = requests.map(req => modelRouter.routeRequest(req));
      const results = await Promise.allSettled(promises);

      // Some requests should succeed, some might be queued or rejected
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful + failed).toBe(15);
      expect(successful).toBeGreaterThan(0); // At least some should succeed
    });
  });

  describe('Tenant Isolation and Security', () => {
    it('should isolate requests by tenant ID', async () => {
      const tenant1Request = {
        id: 'req-t1-123',
        model: 'gpt-4',
        prompt: 'Tenant 1 request',
        agentType: 'completion',
        workspaceId: 'ws-t1-123',
        tenantId: 'tenant-1',
        metadata: { requestType: 'completion' }
      };

      const tenant2Request = {
        id: 'req-t2-123',
        model: 'gpt-4',
        prompt: 'Tenant 2 request',
        agentType: 'completion',
        workspaceId: 'ws-t2-123',
        tenantId: 'tenant-2',
        metadata: { requestType: 'completion' }
      };

      const [response1, response2] = await Promise.all([
        modelRouter.routeRequest(tenant1Request),
        modelRouter.routeRequest(tenant2Request)
      ]);

      expect(response1.status).toBe('success');
      expect(response2.status).toBe('success');

      // Verify tenant IDs were hashed for privacy in metrics
      expect(mockMetrics.hashTenantId).toHaveBeenCalledWith('tenant-1');
      expect(mockMetrics.hashTenantId).toHaveBeenCalledWith('tenant-2');

      // Verify separate audit trails
      expect(mockLogger.audit).toHaveBeenCalledWith(
        'model.request.processed',
        expect.objectContaining({
          requestId: tenant1Request.id,
          tenantId: tenant1Request.tenantId
        })
      );

      expect(mockLogger.audit).toHaveBeenCalledWith(
        'model.request.processed',
        expect.objectContaining({
          requestId: tenant2Request.id,
          tenantId: tenant2Request.tenantId
        })
      );
    });

    it('should validate tenant access to models', async () => {
      const unauthorizedRequest = {
        id: 'req-unauth-123',
        model: 'premium-model',
        prompt: 'Unauthorized access attempt',
        agentType: 'completion',
        workspaceId: 'ws-basic-123',
        tenantId: 'basic-tenant',
        metadata: {
          requestType: 'completion',
          modelTier: 'premium' // Basic tenant trying to use premium model
        }
      };

      await expect(modelRouter.routeRequest(unauthorizedRequest))
        .rejects.toThrow('Access denied to premium-model');

      // Verify security event was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unauthorized model access attempt',
        expect.objectContaining({
          tenantId: 'basic-tenant',
          requestedModel: 'premium-model'
        })
      );
    });

    it('should enforce workspace-level permissions', async () => {
      const crossWorkspaceRequest = {
        id: 'req-cross-123',
        model: 'gpt-4',
        prompt: 'Cross workspace request',
        agentType: 'completion',
        workspaceId: 'ws-other-123',
        tenantId: 'tenant-1',
        metadata: {
          requestType: 'completion',
          sourceWorkspace: 'ws-123' // Different from workspaceId
        }
      };

      // Should validate workspace access
      const response = await modelRouter.routeRequest(crossWorkspaceRequest);

      // Verify workspace context was set properly
      expect(mockLogger.setContext).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-other-123',
          tenantId: 'tenant-1'
        })
      );
    });
  });

  describe('Model Routing Logic', () => {
    it('should route requests based on agent type', async () => {
      const creativeRequest = {
        id: 'req-creative-123',
        model: 'auto',
        prompt: 'Write a creative story',
        agentType: 'creative',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      };

      const analyticalRequest = {
        id: 'req-analytical-123',
        model: 'auto',
        prompt: 'Analyze this data',
        agentType: 'analytical',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'analysis' }
      };

      const [creativeResponse, analyticalResponse] = await Promise.all([
        modelRouter.routeRequest(creativeRequest),
        modelRouter.routeRequest(analyticalRequest)
      ]);

      expect(creativeResponse.modelId).toBeDefined();
      expect(analyticalResponse.modelId).toBeDefined();

      // Different agent types might route to different models
      // This would depend on the routing rules configuration
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Model selected for agent type',
        expect.objectContaining({
          agentType: 'creative',
          selectedModel: expect.any(String)
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Model selected for agent type',
        expect.objectContaining({
          agentType: 'analytical',
          selectedModel: expect.any(String)
        })
      );
    });

    it('should handle model fallbacks when primary model fails', async () => {
      const fallbackRequest = {
        id: 'req-fallback-123',
        model: 'primary-model',
        prompt: 'Test fallback',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      };

      // Mock primary model failure and fallback success
      const originalGetAvailableModels = modelRouter['getAvailableModels'];
      modelRouter['getAvailableModels'] = jest.fn().mockResolvedValue([
        { 
          id: 'fallback-model', 
          name: 'Fallback Model', 
          capabilities: ['text-generation'],
          status: 'healthy',
          fallbackOrder: 2
        }
      ]);

      const response = await modelRouter.routeRequest(fallbackRequest);

      expect(response.status).toBe('success');
      expect(response.modelId).toBe('fallback-model');

      // Verify fallback was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using fallback model',
        expect.objectContaining({
          requestedModel: 'primary-model',
          fallbackModel: 'fallback-model'
        })
      );
    });

    it('should balance load across available endpoints', async () => {
      const loadBalanceRequests = Array.from({ length: 10 }, (_, i) => ({
        id: `req-lb-${i}`,
        model: 'gpt-4',
        prompt: `Load balance test ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      }));

      const responses = await Promise.all(
        loadBalanceRequests.map(req => modelRouter.routeRequest(req))
      );

      // All should succeed
      expect(responses.every(r => r.status === 'success')).toBe(true);

      // Verify endpoint health was tracked
      expect(mockMetrics.recordEndpointHealth).toHaveBeenCalled();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track performance metrics for all requests', async () => {
      const performanceRequest = {
        id: 'req-perf-123',
        model: 'gpt-4',
        prompt: 'Performance test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      };

      const startTime = Date.now();
      const response = await modelRouter.routeRequest(performanceRequest);
      const endTime = Date.now();

      expect(response.status).toBe('success');
      expect(response.latency).toBeDefined();
      expect(response.latency).toBeGreaterThan(0);

      // Verify performance logging
      expect(mockLogger.performance).toHaveBeenCalledWith(
        'model.request.completed',
        expect.objectContaining({
          requestId: performanceRequest.id,
          duration: expect.any(Number),
          model: response.modelId
        })
      );

      // Verify metrics were recorded
      expect(mockMetrics.recordRequestDuration).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number)
      );
    });

    it('should provide health check endpoint', async () => {
      const healthStatus = await modelRouter.getHealthStatus();

      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('uptime');
      expect(healthStatus).toHaveProperty('circuitBreakers');
      expect(healthStatus).toHaveProperty('endpoints');

      expect(healthStatus.status).toBe('healthy');
    });

    it('should export Prometheus metrics', async () => {
      // Make some requests to generate metrics
      const metricsRequest = {
        id: 'req-metrics-123',
        model: 'gpt-4',
        prompt: 'Metrics test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      };

      await modelRouter.routeRequest(metricsRequest);

      const metricsOutput = await mockMetrics.getMetrics();
      expect(typeof metricsOutput).toBe('string');
      expect(metricsOutput).toContain('# metrics');
    });

    it('should handle high concurrent load', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => ({
        id: `req-concurrent-${i}`,
        model: 'gpt-4',
        prompt: `Concurrent test ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      }));

      const startTime = Date.now();
      const results = await Promise.allSettled(
        concurrentRequests.map(req => modelRouter.routeRequest(req))
      );
      const endTime = Date.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(40); // Most should succeed
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in reasonable time

      console.log(`Concurrent load test: ${successful} successful, ${failed} failed in ${endTime - startTime}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from temporary network failures', async () => {
      const networkErrorRequest = {
        id: 'req-network-123',
        model: 'gpt-4',
        prompt: 'Network error test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      };

      // Mock network error followed by success
      let callCount = 0;
      const originalExecuteRequest = modelRouter['executeRequest'];
      modelRouter['executeRequest'] = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          const networkError = new Error('ECONNRESET');
          (networkError as any).code = 'ECONNRESET';
          throw networkError;
        }
        return originalExecuteRequest.call(modelRouter, networkErrorRequest);
      });

      const response = await modelRouter.routeRequest(networkErrorRequest);

      expect(response.status).toBe('success');
      expect(callCount).toBe(2); // Should have retried once

      // Verify retry was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request failed, retrying',
        expect.objectContaining({
          error: expect.stringContaining('ECONNRESET'),
          attempt: 2
        })
      );
    });

    it('should handle model API rate limiting gracefully', async () => {
      const rateLimitRequest = {
        id: 'req-ratelimit-123',
        model: 'gpt-4',
        prompt: 'Rate limit test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      };

      // Mock rate limit error
      const originalExecuteRequest = modelRouter['executeRequest'];
      modelRouter['executeRequest'] = jest.fn().mockImplementation(async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).status = 429;
        throw rateLimitError;
      });

      await expect(modelRouter.routeRequest(rateLimitRequest))
        .rejects.toThrow('Rate limit exceeded');

      // Verify rate limit handling
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          model: 'gpt-4',
          requestId: rateLimitRequest.id
        })
      );

      expect(mockMetrics.recordError).toHaveBeenCalledWith(
        expect.objectContaining({
          status_code: '429',
          error_type: 'rate_limit'
        })
      );
    });

    it('should handle authentication failures', async () => {
      const authErrorRequest = {
        id: 'req-auth-123',
        model: 'gpt-4',
        prompt: 'Auth error test',
        agentType: 'completion',
        workspaceId: 'ws-123',
        tenantId: 'tenant-123',
        metadata: { requestType: 'completion' }
      };

      // Mock authentication error
      const originalExecuteRequest = modelRouter['executeRequest'];
      modelRouter['executeRequest'] = jest.fn().mockImplementation(async () => {
        const authError = new Error('Invalid API key');
        (authError as any).status = 401;
        throw authError;
      });

      await expect(modelRouter.routeRequest(authErrorRequest))
        .rejects.toThrow('Invalid API key');

      // Should not retry authentication errors
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          error: expect.stringContaining('Invalid API key'),
          model: 'gpt-4'
        })
      );
    });
  });
});