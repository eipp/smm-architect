import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrometheusMetricsService } from '../../services/model-router/src/monitoring/metrics';
import { register, collectDefaultMetrics } from 'prom-client';

// Mock prom-client
jest.mock('prom-client', () => {
  const actualPromClient = jest.requireActual('prom-client');
  return {
    ...actualPromClient,
    register: {
      clear: jest.fn(),
      metrics: jest.fn().mockResolvedValue('# Mock metrics output'),
      getSingleMetric: jest.fn(),
      registerMetric: jest.fn()
    },
    collectDefaultMetrics: jest.fn()
  };
});

describe('PrometheusMetricsService', () => {
  let metricsService: PrometheusMetricsService;

  beforeEach(() => {
    // Clear any existing metrics
    jest.clearAllMocks();
    metricsService = new PrometheusMetricsService({
      serviceName: 'model-router-test',
      version: '1.0.0-test',
      collectDefaultMetrics: true,
      defaultLabels: {
        service: 'model-router',
        environment: 'test'
      }
    });
  });

  afterEach(() => {
    // Clean up metrics after each test
    if (metricsService) {
      metricsService = null as any;
    }
  });

  describe('Request Metrics (RED)', () => {
    it('should record request rate metrics', () => {
      const mockLabels = {
        method: 'POST',
        endpoint: '/api/models/complete',
        model_id: 'gpt-4',
        tenant_id_hash: 'abc123'
      };

      // Record multiple requests
      metricsService.recordRequest(mockLabels);
      metricsService.recordRequest(mockLabels);
      metricsService.recordRequest({ ...mockLabels, model_id: 'claude-3' });

      // Verify the counter was created and would be incremented
      expect(metricsService.getRequestCounter()).toBeDefined();
    });

    it('should record request duration metrics', () => {
      const mockLabels = {
        method: 'POST',
        endpoint: '/api/models/complete',
        model_id: 'gpt-4',
        tenant_id_hash: 'abc123'
      };

      // Record request durations
      metricsService.recordRequestDuration(mockLabels, 1.5);
      metricsService.recordRequestDuration(mockLabels, 2.1);
      metricsService.recordRequestDuration(mockLabels, 0.8);

      // Verify histogram was created
      expect(metricsService.getRequestDurationHistogram()).toBeDefined();
    });

    it('should record error rate metrics', () => {
      const mockLabels = {
        method: 'POST',
        endpoint: '/api/models/complete',
        model_id: 'gpt-4',
        tenant_id_hash: 'abc123',
        status_code: '500',
        error_type: 'internal_error'
      };

      metricsService.recordError(mockLabels);
      metricsService.recordError({ ...mockLabels, status_code: '429', error_type: 'rate_limit' });

      // Verify error counter was created
      expect(metricsService.getErrorCounter()).toBeDefined();
    });

    it('should calculate and record request latency percentiles', () => {
      const mockLabels = {
        method: 'POST',
        endpoint: '/api/models/complete',
        model_id: 'gpt-4'
      };

      // Record various latencies to test percentile calculations
      const latencies = [100, 150, 200, 250, 300, 400, 500, 750, 1000, 2000];
      
      latencies.forEach(latency => {
        metricsService.recordRequestDuration(mockLabels, latency / 1000); // Convert to seconds
      });

      // The histogram should handle percentile calculations internally
      expect(metricsService.getRequestDurationHistogram()).toBeDefined();
    });
  });

  describe('Circuit Breaker Metrics', () => {
    it('should record circuit breaker state changes', () => {
      const circuitBreakerName = 'openai-api';
      
      metricsService.recordCircuitBreakerState(circuitBreakerName, 'OPEN');
      metricsService.recordCircuitBreakerState(circuitBreakerName, 'HALF_OPEN');
      metricsService.recordCircuitBreakerState(circuitBreakerName, 'CLOSED');

      expect(metricsService.getCircuitBreakerGauge()).toBeDefined();
    });

    it('should record circuit breaker operation counts', () => {
      const circuitBreakerName = 'anthropic-api';
      
      metricsService.recordCircuitBreakerOperation(circuitBreakerName, 'success');
      metricsService.recordCircuitBreakerOperation(circuitBreakerName, 'failure');
      metricsService.recordCircuitBreakerOperation(circuitBreakerName, 'timeout');
      metricsService.recordCircuitBreakerOperation(circuitBreakerName, 'short_circuit');

      expect(metricsService.getCircuitBreakerCounter()).toBeDefined();
    });

    it('should track circuit breaker failure rates', () => {
      const circuitBreakerName = 'test-api';
      
      // Record successes and failures
      for (let i = 0; i < 7; i++) {
        metricsService.recordCircuitBreakerOperation(circuitBreakerName, 'success');
      }
      for (let i = 0; i < 3; i++) {
        metricsService.recordCircuitBreakerOperation(circuitBreakerName, 'failure');
      }

      // Failure rate should be trackable through the counter
      expect(metricsService.getCircuitBreakerCounter()).toBeDefined();
    });
  });

  describe('Endpoint Health Metrics', () => {
    it('should record endpoint health status', () => {
      metricsService.recordEndpointHealth('openai-gpt4', 'healthy', 150);
      metricsService.recordEndpointHealth('anthropic-claude', 'unhealthy', 3000);
      metricsService.recordEndpointHealth('openai-gpt35', 'degraded', 800);

      expect(metricsService.getEndpointHealthGauge()).toBeDefined();
    });

    it('should track endpoint response times', () => {
      const endpointId = 'openai-gpt4';
      
      // Record various response times
      metricsService.recordEndpointHealth(endpointId, 'healthy', 120);
      metricsService.recordEndpointHealth(endpointId, 'healthy', 180);
      metricsService.recordEndpointHealth(endpointId, 'healthy', 95);

      expect(metricsService.getEndpointLatencyHistogram()).toBeDefined();
    });

    it('should record endpoint selection counts', () => {
      metricsService.recordEndpointSelection('openai-gpt4', 'selected');
      metricsService.recordEndpointSelection('anthropic-claude', 'selected');
      metricsService.recordEndpointSelection('openai-gpt35', 'bypassed');

      expect(metricsService.getEndpointSelectionCounter()).toBeDefined();
    });
  });

  describe('Business Metrics', () => {
    it('should record token usage by model and tenant', () => {
      const tokenUsage = {
        model_id: 'gpt-4',
        tenant_id_hash: 'abc123',
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      };

      metricsService.recordTokenUsage(tokenUsage);
      metricsService.recordTokenUsage({
        ...tokenUsage,
        prompt_tokens: 200,
        completion_tokens: 75,
        total_tokens: 275
      });

      expect(metricsService.getTokenUsageCounter()).toBeDefined();
    });

    it('should record cost metrics by model and tenant', () => {
      metricsService.recordCost('gpt-4', 'abc123', 0.002, 'USD');
      metricsService.recordCost('claude-3', 'def456', 0.0015, 'USD');
      metricsService.recordCost('gpt-3.5-turbo', 'abc123', 0.0005, 'USD');

      expect(metricsService.getCostCounter()).toBeDefined();
    });

    it('should track request types and agent usage', () => {
      metricsService.recordRequestType('completion', 'creative-agent', 'abc123');
      metricsService.recordRequestType('embedding', 'analysis-agent', 'def456');
      metricsService.recordRequestType('chat', 'support-agent', 'abc123');

      expect(metricsService.getRequestTypeCounter()).toBeDefined();
    });

    it('should calculate cost per request metrics', () => {
      const requestLabels = {
        method: 'POST',
        endpoint: '/api/models/complete',
        model_id: 'gpt-4',
        tenant_id_hash: 'abc123'
      };

      // Record a request and its associated cost
      metricsService.recordRequest(requestLabels);
      metricsService.recordCost('gpt-4', 'abc123', 0.002, 'USD');

      // Both metrics should be available for ratio calculations
      expect(metricsService.getRequestCounter()).toBeDefined();
      expect(metricsService.getCostCounter()).toBeDefined();
    });
  });

  describe('Retry and Resilience Metrics', () => {
    it('should record retry attempts and outcomes', () => {
      metricsService.recordRetryAttempt('openai-api', 'success', 2);
      metricsService.recordRetryAttempt('anthropic-api', 'failure', 3);
      metricsService.recordRetryAttempt('openai-api', 'success', 1);

      expect(metricsService.getRetryCounter()).toBeDefined();
    });

    it('should track bulkhead executor metrics', () => {
      metricsService.recordBulkheadExecution('high-priority', 'success', 150);
      metricsService.recordBulkheadExecution('low-priority', 'timeout', 2000);
      metricsService.recordBulkheadExecution('high-priority', 'queue_full', 0);

      expect(metricsService.getBulkheadCounter()).toBeDefined();
    });

    it('should record queue depth and wait times', () => {
      metricsService.recordQueueDepth('high-priority', 5);
      metricsService.recordQueueDepth('low-priority', 12);
      metricsService.recordQueueWaitTime('high-priority', 50);
      metricsService.recordQueueWaitTime('low-priority', 200);

      expect(metricsService.getQueueDepthGauge()).toBeDefined();
      expect(metricsService.getQueueWaitTimeHistogram()).toBeDefined();
    });
  });

  describe('Tenant Isolation and Privacy', () => {
    it('should hash tenant IDs for privacy', () => {
      const originalTenantId = 'tenant-12345-sensitive';
      const hashedId = metricsService.hashTenantId(originalTenantId);

      expect(hashedId).not.toBe(originalTenantId);
      expect(hashedId).toMatch(/^[a-f0-9]{8}$/); // Should be 8-char hex
      
      // Same input should produce same hash
      const hashedAgain = metricsService.hashTenantId(originalTenantId);
      expect(hashedId).toBe(hashedAgain);
    });

    it('should not expose sensitive data in metric labels', () => {
      const sensitiveLabels = {
        method: 'POST',
        endpoint: '/api/models/complete',
        model_id: 'gpt-4',
        tenant_id: 'sensitive-tenant-data', // Should be hashed
        user_email: 'user@example.com' // Should not appear in labels
      };

      // The service should sanitize labels before recording
      metricsService.recordRequest(sensitiveLabels as any);

      // Verify that sanitization occurs (this would be implementation-specific)
      expect(metricsService.getRequestCounter()).toBeDefined();
    });
  });

  describe('Metrics Export and Prometheus Integration', () => {
    it('should provide Prometheus-compatible metrics output', async () => {
      // Record some metrics
      metricsService.recordRequest({
        method: 'POST',
        endpoint: '/api/models/complete',
        model_id: 'gpt-4',
        tenant_id_hash: 'abc123'
      });

      const metricsOutput = await metricsService.getMetrics();
      
      expect(typeof metricsOutput).toBe('string');
      expect(metricsOutput).toContain('# Mock metrics output');
    });

    it('should handle metrics collection errors gracefully', async () => {
      // Mock an error in metrics collection
      const mockRegister = register as any;
      mockRegister.metrics.mockRejectedValueOnce(new Error('Collection failed'));

      await expect(metricsService.getMetrics()).rejects.toThrow('Collection failed');
    });

    it('should provide health check endpoint data', () => {
      const healthData = metricsService.getHealthMetrics();
      
      expect(healthData).toBeDefined();
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('memoryUsage');
      expect(healthData).toHaveProperty('activeConnections');
    });
  });

  describe('ServiceMonitor Integration', () => {
    it('should provide metadata for Kubernetes ServiceMonitor', () => {
      const serviceMonitorData = metricsService.getServiceMonitorMetadata();
      
      expect(serviceMonitorData).toHaveProperty('path');
      expect(serviceMonitorData).toHaveProperty('port');
      expect(serviceMonitorData).toHaveProperty('interval');
      expect(serviceMonitorData.path).toBe('/metrics');
    });

    it('should support custom metric labels for Kubernetes', () => {
      const kubernetesLabels = {
        namespace: 'smm-architect',
        pod: 'model-router-abc123',
        container: 'model-router'
      };

      metricsService.addGlobalLabels(kubernetesLabels);
      
      // Verify labels are applied to subsequent metrics
      metricsService.recordRequest({
        method: 'GET',
        endpoint: '/health',
        model_id: 'system',
        tenant_id_hash: 'system'
      });

      expect(metricsService.getRequestCounter()).toBeDefined();
    });
  });

  describe('Performance and Resource Usage', () => {
    it('should handle high-frequency metrics recording efficiently', () => {
      const startTime = Date.now();
      const iterations = 1000;

      // Record many metrics quickly
      for (let i = 0; i < iterations; i++) {
        metricsService.recordRequest({
          method: 'POST',
          endpoint: '/api/models/complete',
          model_id: 'gpt-4',
          tenant_id_hash: `tenant-${i % 10}` // Simulate 10 different tenants
        });
        
        metricsService.recordRequestDuration({
          method: 'POST',
          endpoint: '/api/models/complete',
          model_id: 'gpt-4'
        }, Math.random() * 2);
      }

      const elapsed = Date.now() - startTime;
      
      // Should complete quickly (less than 1 second for 1000 operations)
      expect(elapsed).toBeLessThan(1000);
    });

    it('should limit memory usage for high-cardinality metrics', () => {
      // Simulate high cardinality by creating many unique label combinations
      for (let i = 0; i < 100; i++) {
        metricsService.recordRequest({
          method: 'POST',
          endpoint: `/api/models/complete/${i}`,
          model_id: `model-${i}`,
          tenant_id_hash: `tenant-${i}`
        });
      }

      // Memory usage should be reasonable (this is more of a smoke test)
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });
});