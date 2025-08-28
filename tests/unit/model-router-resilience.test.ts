import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CircuitBreaker, RetryExecutor, HealthBasedEndpointSelector, BulkheadExecutor } from '../../services/model-router/src/utils/resilience';

describe('Model Router Resilience Patterns', () => {
  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;
    const mockFunction = jest.fn();

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 5000
      });
      mockFunction.mockClear();
    });

    afterEach(() => {
      circuitBreaker.reset();
    });

    it('should execute function when circuit is closed', async () => {
      mockFunction.mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockFunction);
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should open circuit after failure threshold is reached', async () => {
      mockFunction.mockRejectedValue(new Error('Service unavailable'));
      
      // Execute function 3 times to reach failure threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction);
        } catch (error) {
          // Expected failures
        }
      }
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Next execution should fail fast without calling the function
      const beforeCount = mockFunction.mock.calls.length;
      try {
        await circuitBreaker.execute(mockFunction);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toEqual(expect.objectContaining({
          message: expect.stringContaining('Circuit breaker is OPEN')
        }));
      }
      
      expect(mockFunction.mock.calls.length).toBe(beforeCount);
    });

    it('should transition to half-open after recovery timeout', async () => {
      mockFunction.mockRejectedValue(new Error('Service unavailable'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction);
        } catch (error) {
          // Expected failures
        }
      }
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Next call should transition to half-open
      mockFunction.mockResolvedValue('recovered');
      const result = await circuitBreaker.execute(mockFunction);
      
      expect(result).toBe('recovered');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should track success and failure rates correctly', async () => {
      // Execute successful calls
      mockFunction.mockResolvedValue('success');
      await circuitBreaker.execute(mockFunction);
      await circuitBreaker.execute(mockFunction);
      
      // Execute failed calls
      mockFunction.mockRejectedValue(new Error('failure'));
      try { await circuitBreaker.execute(mockFunction); } catch {}
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.successRate).toBeCloseTo(0.67, 2);
      expect(metrics.failureRate).toBeCloseTo(0.33, 2);
    });

    it('should reset circuit breaker state and metrics', async () => {
      mockFunction.mockRejectedValue(new Error('failure'));
      
      // Generate some failures
      for (let i = 0; i < 2; i++) {
        try { await circuitBreaker.execute(mockFunction); } catch {}
      }
      
      expect(circuitBreaker.getMetrics().failureCount).toBe(2);
      
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failureCount).toBe(0);
      expect(circuitBreaker.getMetrics().totalRequests).toBe(0);
    });
  });

  describe('RetryExecutor', () => {
    let retryExecutor: RetryExecutor;
    const mockFunction = jest.fn();

    beforeEach(() => {
      retryExecutor = new RetryExecutor({
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: true
      });
      mockFunction.mockClear();
    });

    it('should succeed on first attempt when function succeeds', async () => {
      mockFunction.mockResolvedValue('success');
      
      const result = await retryExecutor.execute(mockFunction, () => true);
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should retry on retriable errors and eventually succeed', async () => {
      mockFunction
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another temporary failure'))
        .mockResolvedValue('success');
      
      const isRetriable = (error: any) => error.message.includes('Temporary');
      const result = await retryExecutor.execute(mockFunction, isRetriable);
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retriable errors', async () => {
      mockFunction.mockRejectedValue(new Error('Permanent failure'));
      
      const isRetriable = (error: any) => error.message.includes('Temporary');
      
      await expect(retryExecutor.execute(mockFunction, isRetriable))
        .rejects.toThrow('Permanent failure');
      
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retry attempts and fail', async () => {
      mockFunction.mockRejectedValue(new Error('Temporary failure'));
      
      const isRetriable = () => true;
      
      await expect(retryExecutor.execute(mockFunction, isRetriable))
        .rejects.toThrow('Temporary failure');
      
      expect(mockFunction).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff with jitter', async () => {
      mockFunction.mockRejectedValue(new Error('Temporary failure'));
      
      const startTime = Date.now();
      const isRetriable = () => true;
      
      try {
        await retryExecutor.execute(mockFunction, isRetriable);
      } catch (error) {
        // Expected to fail after retries
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should have waited at least baseDelay + baseDelay*multiplier = 100 + 200 = 300ms
      // Account for jitter and execution time, so check for at least 200ms
      expect(elapsed).toBeGreaterThan(200);
    });

    it('should track retry metrics correctly', async () => {
      mockFunction
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('success');
      
      const isRetriable = () => true;
      await retryExecutor.execute(mockFunction, isRetriable);
      
      const metrics = retryExecutor.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.totalRetries).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(0);
    });
  });

  describe('HealthBasedEndpointSelector', () => {
    let selector: HealthBasedEndpointSelector;

    beforeEach(() => {
      selector = new HealthBasedEndpointSelector({
        healthCheckInterval: 1000,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      });
    });

    afterEach(() => {
      selector.stop();
    });

    it('should select healthy endpoints based on weights', async () => {
      const endpoints = [
        { id: 'ep1', url: 'http://api1.example.com', weight: 0.7, health: { status: 'healthy', latency: 100, successRate: 0.95 } },
        { id: 'ep2', url: 'http://api2.example.com', weight: 0.3, health: { status: 'healthy', latency: 200, successRate: 0.90 } }
      ];

      selector.updateEndpoints(endpoints);

      const selections = new Map<string, number>();
      
      // Make 1000 selections to test distribution
      for (let i = 0; i < 1000; i++) {
        const selected = selector.selectEndpoint(endpoints);
        if (selected) {
          selections.set(selected.id, (selections.get(selected.id) || 0) + 1);
        }
      }

      const ep1Count = selections.get('ep1') || 0;
      const ep2Count = selections.get('ep2') || 0;
      
      // Should roughly follow 70/30 distribution, allow for variance
      expect(ep1Count).toBeGreaterThan(600);
      expect(ep1Count).toBeLessThan(800);
      expect(ep2Count).toBeGreaterThan(200);
      expect(ep2Count).toBeLessThan(400);
    });

    it('should exclude unhealthy endpoints from selection', async () => {
      const endpoints = [
        { id: 'ep1', url: 'http://api1.example.com', weight: 0.5, health: { status: 'healthy', latency: 100, successRate: 0.95 } },
        { id: 'ep2', url: 'http://api2.example.com', weight: 0.5, health: { status: 'unhealthy', latency: 5000, successRate: 0.10 } }
      ];

      selector.updateEndpoints(endpoints);

      // Should always select the healthy endpoint
      for (let i = 0; i < 10; i++) {
        const selected = selector.selectEndpoint(endpoints);
        expect(selected?.id).toBe('ep1');
      }
    });

    it('should return null when no healthy endpoints are available', async () => {
      const endpoints = [
        { id: 'ep1', url: 'http://api1.example.com', weight: 0.5, health: { status: 'unhealthy', latency: 5000, successRate: 0.10 } },
        { id: 'ep2', url: 'http://api2.example.com', weight: 0.5, health: { status: 'unhealthy', latency: 6000, successRate: 0.05 } }
      ];

      selector.updateEndpoints(endpoints);

      const selected = selector.selectEndpoint(endpoints);
      expect(selected).toBeNull();
    });

    it('should track endpoint health metrics', async () => {
      const endpoint = { id: 'ep1', url: 'http://api1.example.com', weight: 1.0 };
      
      selector.recordSuccess(endpoint.id, 150);
      selector.recordSuccess(endpoint.id, 200);
      selector.recordFailure(endpoint.id, 5000);
      
      const health = selector.getEndpointHealth(endpoint.id);
      
      expect(health.totalRequests).toBe(3);
      expect(health.successCount).toBe(2);
      expect(health.failureCount).toBe(1);
      expect(health.averageLatency).toBeCloseTo(1783.33, 1);
      expect(health.successRate).toBeCloseTo(0.67, 2);
    });

    it('should adjust weights based on performance', async () => {
      const endpoint = { id: 'ep1', url: 'http://api1.example.com', weight: 1.0 };
      
      // Record good performance
      for (let i = 0; i < 10; i++) {
        selector.recordSuccess(endpoint.id, 100);
      }
      
      let adjustedWeight = selector.getAdjustedWeight(endpoint);
      expect(adjustedWeight).toBeGreaterThan(1.0); // Should increase weight
      
      // Record poor performance
      for (let i = 0; i < 10; i++) {
        selector.recordFailure(endpoint.id, 3000);
      }
      
      adjustedWeight = selector.getAdjustedWeight(endpoint);
      expect(adjustedWeight).toBeLessThan(1.0); // Should decrease weight
    });
  });

  describe('BulkheadExecutor', () => {
    let bulkhead: BulkheadExecutor;
    const mockFunction = jest.fn();

    beforeEach(() => {
      bulkhead = new BulkheadExecutor({
        maxConcurrency: 2,
        queueTimeout: 1000,
        executionTimeout: 2000
      });
      mockFunction.mockClear();
    });

    afterEach(() => {
      bulkhead.shutdown();
    });

    it('should execute functions within concurrency limit', async () => {
      mockFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );

      const promises = [
        bulkhead.execute('pool1', mockFunction),
        bulkhead.execute('pool1', mockFunction),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toEqual(['success', 'success']);
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });

    it('should queue executions when concurrency limit is exceeded', async () => {
      let resolvers: Array<(value: string) => void> = [];
      
      mockFunction.mockImplementation(() => 
        new Promise(resolve => {
          resolvers.push(resolve);
        })
      );

      // Start 3 executions (limit is 2)
      const promises = [
        bulkhead.execute('pool1', mockFunction),
        bulkhead.execute('pool1', mockFunction),
        bulkhead.execute('pool1', mockFunction), // This should be queued
      ];

      // Let first two complete
      setTimeout(() => {
        resolvers[0]('first');
        resolvers[1]('second');
      }, 100);

      // Let third complete
      setTimeout(() => {
        resolvers[2]('third');
      }, 200);

      const results = await Promise.all(promises);
      expect(results).toEqual(['first', 'second', 'third']);
    });

    it('should isolate pools from each other', async () => {
      mockFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );

      // These should run concurrently despite being different pools
      const promises = [
        bulkhead.execute('pool1', mockFunction),
        bulkhead.execute('pool1', mockFunction),
        bulkhead.execute('pool2', mockFunction), // Different pool, should not be blocked
        bulkhead.execute('pool2', mockFunction),
      ];

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      expect(results).toEqual(['success', 'success', 'success', 'success']);
      // Should complete in roughly 100ms since pools are isolated
      expect(elapsed).toBeLessThan(150);
    });

    it('should timeout queued requests after queueTimeout', async () => {
      mockFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 2000))
      );

      // Fill up the pool
      const longRunningPromises = [
        bulkhead.execute('pool1', mockFunction),
        bulkhead.execute('pool1', mockFunction),
      ];

      // This should timeout in the queue
      const queuedPromise = bulkhead.execute('pool1', mockFunction);

      await expect(queuedPromise).rejects.toThrow('Queue timeout');

      // Cleanup
      await Promise.allSettled(longRunningPromises);
    });

    it('should track pool metrics correctly', async () => {
      mockFunction.mockResolvedValue('success');

      await bulkhead.execute('pool1', mockFunction);
      await bulkhead.execute('pool1', mockFunction);

      const metrics = bulkhead.getPoolMetrics('pool1');
      
      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.successfulExecutions).toBe(2);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.currentActive).toBe(0);
      expect(metrics.currentQueued).toBe(0);
    });

    it('should handle execution timeouts', async () => {
      mockFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 3000)) // Longer than executionTimeout
      );

      await expect(bulkhead.execute('pool1', mockFunction))
        .rejects.toThrow('Execution timeout');
    });
  });
});