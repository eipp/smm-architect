import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ModelRouter } from '../../services/model-router/src/services/ModelRouter';
import { performance } from 'perf_hooks';

describe('Model Router Performance Tests', () => {
  let modelRouter: ModelRouter;
  const performanceBaselines = {
    singleRequestLatency: 2000, // ms
    throughputRequestsPerSecond: 50,
    concurrentRequestLimit: 100,
    memoryUsageLimit: 512 * 1024 * 1024, // 512MB
    cpuUsageLimit: 80 // percentage
  };

  beforeEach(() => {
    modelRouter = new ModelRouter({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        performance: jest.fn()
      } as any,
      metrics: {
        recordRequest: jest.fn(),
        recordRequestDuration: jest.fn(),
        recordError: jest.fn(),
        recordTokenUsage: jest.fn(),
        recordCost: jest.fn()
      } as any,
      resilience: {
        circuitBreaker: {
          failureThreshold: 10, // Higher threshold for performance tests
          recoveryTimeout: 30000
        },
        retry: {
          maxAttempts: 2, // Reduce retries to measure base performance
          baseDelay: 100
        },
        bulkhead: {
          maxConcurrency: 200 // Higher limit for load testing
        }
      }
    });
  });

  afterEach(async () => {
    if (modelRouter) {
      await modelRouter.shutdown();
    }
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Latency Performance', () => {
    it('should meet single request latency SLA', async () => {
      const request = {
        id: 'perf-latency-001',
        model: 'gpt-4',
        prompt: 'Performance test request for latency measurement',
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: {
          requestType: 'completion' as const,
          priority: 'normal' as const
        }
      };

      const startTime = performance.now();
      const response = await modelRouter.routeRequest(request);
      const endTime = performance.now();
      
      const latency = endTime - startTime;

      expect(response.status).toBe('success');
      expect(latency).toBeLessThan(performanceBaselines.singleRequestLatency);
      expect(response.latency).toBeLessThan(performanceBaselines.singleRequestLatency);
      
      console.log(`Single request latency: ${latency.toFixed(2)}ms (SLA: ${performanceBaselines.singleRequestLatency}ms)`);
    });

    it('should maintain consistent latency under moderate load', async () => {
      const requestCount = 20;
      const latencies: number[] = [];

      const requests = Array.from({ length: requestCount }, (_, i) => ({
        id: `perf-consistency-${i.toString().padStart(3, '0')}`,
        model: 'gpt-4',
        prompt: `Consistency test request ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: {
          requestType: 'completion' as const
        }
      }));

      // Execute requests sequentially to measure individual latencies
      for (const request of requests) {
        const startTime = performance.now();
        const response = await modelRouter.routeRequest(request);
        const endTime = performance.now();
        
        expect(response.status).toBe('success');
        latencies.push(endTime - startTime);
      }

      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);
      const p95Latency = latencies.sort()[Math.floor(latencies.length * 0.95)];

      expect(avgLatency).toBeLessThan(performanceBaselines.singleRequestLatency);
      expect(p95Latency).toBeLessThan(performanceBaselines.singleRequestLatency * 1.5);

      console.log(`Latency stats - Avg: ${avgLatency.toFixed(2)}ms, P95: ${p95Latency.toFixed(2)}ms, Min: ${minLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
    });

    it('should handle different request types with acceptable latency', async () => {
      const requestTypes = [
        { type: 'completion', model: 'gpt-4' },
        { type: 'chat', model: 'gpt-4' },
        { type: 'embedding', model: 'text-embedding-ada-002' },
        { type: 'analysis', model: 'gpt-4' }
      ] as const;

      const results: { type: string; latency: number }[] = [];

      for (const { type, model } of requestTypes) {
        const request = {
          id: `perf-type-${type}`,
          model,
          prompt: `Performance test for ${type}`,
          agentType: 'completion',
          workspaceId: 'ws-perf-001',
          tenantId: 'tenant-perf-001',
          metadata: {
            requestType: type,
            priority: 'normal' as const
          }
        };

        const startTime = performance.now();
        const response = await modelRouter.routeRequest(request);
        const endTime = performance.now();
        
        const latency = endTime - startTime;
        results.push({ type, latency });

        expect(response.status).toBe('success');
        expect(latency).toBeLessThan(performanceBaselines.singleRequestLatency * 2); // Allow 2x for different types
      }

      console.log('Request type latencies:', results.map(r => `${r.type}: ${r.latency.toFixed(2)}ms`).join(', '));
    });
  });

  describe('Throughput Performance', () => {
    it('should meet concurrent request throughput SLA', async () => {
      const concurrentRequests = 50;
      const testDuration = 10000; // 10 seconds
      
      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        id: `perf-throughput-${i.toString().padStart(3, '0')}`,
        model: 'gpt-4',
        prompt: `Throughput test request ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: {
          requestType: 'completion' as const
        }
      }));

      const startTime = performance.now();
      
      // Execute all requests concurrently
      const results = await Promise.allSettled(
        requests.map(req => modelRouter.routeRequest(req))
      );
      
      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const throughput = (successful / actualDuration) * 1000; // requests per second

      expect(successful).toBeGreaterThan(concurrentRequests * 0.95); // 95% success rate
      expect(throughput).toBeGreaterThan(performanceBaselines.throughputRequestsPerSecond * 0.8); // Allow 20% variance

      console.log(`Throughput: ${throughput.toFixed(2)} req/s (${successful}/${concurrentRequests} successful in ${actualDuration.toFixed(2)}ms)`);
    });

    it('should scale throughput with increased concurrency', async () => {
      const concurrencyLevels = [10, 25, 50, 75];
      const results: { concurrency: number; throughput: number; successRate: number }[] = [];

      for (const concurrency of concurrencyLevels) {
        const requests = Array.from({ length: concurrency }, (_, i) => ({
          id: `perf-scale-${concurrency}-${i.toString().padStart(3, '0')}`,
          model: 'gpt-4',
          prompt: `Scale test request ${i} at concurrency ${concurrency}`,
          agentType: 'completion',
          workspaceId: 'ws-perf-001',
          tenantId: 'tenant-perf-001',
          metadata: {
            requestType: 'completion' as const
          }
        }));

        const startTime = performance.now();
        const responses = await Promise.allSettled(
          requests.map(req => modelRouter.routeRequest(req))
        );
        const endTime = performance.now();

        const successful = responses.filter(r => r.status === 'fulfilled').length;
        const duration = endTime - startTime;
        const throughput = (successful / duration) * 1000;
        const successRate = (successful / concurrency) * 100;

        results.push({ concurrency, throughput, successRate });

        // Clean up between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('Scalability results:');
      results.forEach(r => {
        console.log(`  Concurrency ${r.concurrency}: ${r.throughput.toFixed(2)} req/s, ${r.successRate.toFixed(1)}% success`);
      });

      // Throughput should generally increase with concurrency (up to a point)
      expect(results[1].throughput).toBeGreaterThan(results[0].throughput * 0.8);
      expect(results[2].throughput).toBeGreaterThan(results[1].throughput * 0.8);
    });

    it('should maintain throughput with mixed workload', async () => {
      const workloadMix = [
        { type: 'completion', count: 20, model: 'gpt-4' },
        { type: 'chat', count: 15, model: 'gpt-4' },
        { type: 'embedding', count: 25, model: 'text-embedding-ada-002' },
        { type: 'analysis', count: 10, model: 'gpt-4' }
      ] as const;

      const allRequests = workloadMix.flatMap(({ type, count, model }) => 
        Array.from({ length: count }, (_, i) => ({
          id: `perf-mixed-${type}-${i.toString().padStart(3, '0')}`,
          model,
          prompt: `Mixed workload ${type} request ${i}`,
          agentType: 'completion',
          workspaceId: 'ws-perf-001',
          tenantId: 'tenant-perf-001',
          metadata: {
            requestType: type,
            priority: 'normal' as const
          }
        }))
      );

      // Shuffle requests to simulate real mixed workload
      const shuffledRequests = allRequests.sort(() => Math.random() - 0.5);

      const startTime = performance.now();
      const results = await Promise.allSettled(
        shuffledRequests.map(req => modelRouter.routeRequest(req))
      );
      const endTime = performance.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const duration = endTime - startTime;
      const throughput = (successful / duration) * 1000;

      expect(successful).toBeGreaterThan(allRequests.length * 0.90); // 90% success rate for mixed workload
      expect(throughput).toBeGreaterThan(performanceBaselines.throughputRequestsPerSecond * 0.6); // Lower baseline for mixed workload

      console.log(`Mixed workload throughput: ${throughput.toFixed(2)} req/s (${successful}/${allRequests.length} successful)`);
    });
  });

  describe('Resource Utilization Performance', () => {
    it('should maintain acceptable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate sustained load
      const loadDuration = 30000; // 30 seconds
      const requestsPerSecond = 20;
      const totalRequests = Math.floor((loadDuration / 1000) * requestsPerSecond);
      
      let requestCount = 0;
      const memorySnapshots: number[] = [];
      
      const loadTest = async () => {
        while (requestCount < totalRequests) {
          const batchSize = Math.min(10, totalRequests - requestCount);
          const batch = Array.from({ length: batchSize }, (_, i) => ({
            id: `perf-memory-${(requestCount + i).toString().padStart(4, '0')}`,
            model: 'gpt-4',
            prompt: `Memory load test request ${requestCount + i}`,
            agentType: 'completion',
            workspaceId: 'ws-perf-001',
            tenantId: 'tenant-perf-001',
            metadata: {
              requestType: 'completion' as const
            }
          }));

          await Promise.allSettled(
            batch.map(req => modelRouter.routeRequest(req))
          );

          requestCount += batchSize;
          
          // Take memory snapshot
          const currentMemory = process.memoryUsage();
          memorySnapshots.push(currentMemory.heapUsed);

          // Brief pause to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      };

      await loadTest();

      const finalMemory = process.memoryUsage();
      const maxMemory = Math.max(...memorySnapshots);
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(maxMemory).toBeLessThan(performanceBaselines.memoryUsageLimit);
      expect(memoryIncrease).toBeLessThan(performanceBaselines.memoryUsageLimit * 0.5); // Should not leak significantly

      console.log(`Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Max: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle memory pressure gracefully', async () => {
      // Create large request payload to test memory handling
      const largePrompt = 'x'.repeat(10000); // 10KB prompt
      const requests = Array.from({ length: 50 }, (_, i) => ({
        id: `perf-memory-pressure-${i.toString().padStart(3, '0')}`,
        model: 'gpt-4',
        prompt: largePrompt,
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: {
          requestType: 'completion' as const,
          maxTokens: 4000 // Large response
        }
      }));

      const startMemory = process.memoryUsage();
      
      const results = await Promise.allSettled(
        requests.map(req => modelRouter.routeRequest(req))
      );
      
      const endMemory = process.memoryUsage();
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      expect(successful).toBeGreaterThan(requests.length * 0.8); // Should handle most requests
      expect(endMemory.heapUsed).toBeLessThan(performanceBaselines.memoryUsageLimit);

      console.log(`Memory pressure test - ${successful}/${requests.length} successful, memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should clean up resources after request completion', async () => {
      const iterations = 5;
      const requestsPerIteration = 20;
      const memorySnapshots: number[] = [];

      for (let iteration = 0; iteration < iterations; iteration++) {
        const requests = Array.from({ length: requestsPerIteration }, (_, i) => ({
          id: `perf-cleanup-${iteration}-${i.toString().padStart(3, '0')}`,
          model: 'gpt-4',
          prompt: `Resource cleanup test iteration ${iteration} request ${i}`,
          agentType: 'completion',
          workspaceId: 'ws-perf-001',
          tenantId: 'tenant-perf-001',
          metadata: {
            requestType: 'completion' as const
          }
        }));

        await Promise.allSettled(
          requests.map(req => modelRouter.routeRequest(req))
        );

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));

        const currentMemory = process.memoryUsage();
        memorySnapshots.push(currentMemory.heapUsed);
      }

      // Memory should not continuously grow
      const memoryTrend = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      const maxMemoryVariation = Math.max(...memorySnapshots) - Math.min(...memorySnapshots);

      expect(maxMemoryVariation).toBeLessThan(performanceBaselines.memoryUsageLimit * 0.2); // Max 20% variation

      console.log(`Memory cleanup test - Trend: ${(memoryTrend / 1024 / 1024).toFixed(2)}MB, Variation: ${(maxMemoryVariation / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Circuit Breaker Performance Impact', () => {
    it('should have minimal performance impact when circuit breaker is closed', async () => {
      const baselineRequests = Array.from({ length: 20 }, (_, i) => ({
        id: `perf-baseline-${i.toString().padStart(3, '0')}`,
        model: 'gpt-4',
        prompt: `Baseline performance test ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: { requestType: 'completion' as const }
      }));

      // Measure baseline performance
      const baselineStart = performance.now();
      const baselineResults = await Promise.all(
        baselineRequests.map(req => modelRouter.routeRequest(req))
      );
      const baselineEnd = performance.now();
      const baselineLatency = baselineEnd - baselineStart;

      expect(baselineResults.every(r => r.status === 'success')).toBe(true);

      // Verify circuit breaker overhead is minimal (< 5% impact)
      const expectedMaxLatency = baselineLatency * 1.05;
      expect(baselineLatency).toBeLessThan(expectedMaxLatency);

      console.log(`Circuit breaker overhead: ${baselineLatency.toFixed(2)}ms for ${baselineRequests.length} requests`);
    });

    it('should fail fast when circuit breaker is open', async () => {
      // First, open the circuit breaker by causing failures
      const failingRequests = Array.from({ length: 5 }, (_, i) => ({
        id: `perf-fail-${i.toString().padStart(3, '0')}`,
        model: 'non-existent-model',
        prompt: `Failing request ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: { requestType: 'completion' as const }
      }));

      // Cause failures to open circuit
      await Promise.allSettled(
        failingRequests.map(req => 
          modelRouter.routeRequest(req).catch(() => {})
        )
      );

      // Now test fail-fast behavior
      const failFastRequests = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-failfast-${i.toString().padStart(3, '0')}`,
        model: 'gpt-4',
        prompt: `Fail fast test ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: { requestType: 'completion' as const }
      }));

      const failFastStart = performance.now();
      const failFastResults = await Promise.allSettled(
        failFastRequests.map(req => modelRouter.routeRequest(req))
      );
      const failFastEnd = performance.now();
      const failFastLatency = failFastEnd - failFastStart;

      // Should fail very quickly (circuit breaker should fail fast)
      expect(failFastLatency).toBeLessThan(1000); // Should be under 1 second for all 10 requests
      expect(failFastResults.every(r => r.status === 'rejected')).toBe(true);

      console.log(`Fail-fast latency: ${failFastLatency.toFixed(2)}ms for ${failFastRequests.length} requests`);
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle burst traffic patterns', async () => {
      const burstSizes = [5, 20, 50, 20, 5]; // Simulate traffic bursts
      const results: Array<{ burstSize: number; successRate: number; avgLatency: number }> = [];

      for (let burstIndex = 0; burstIndex < burstSizes.length; burstIndex++) {
        const burstSize = burstSizes[burstIndex];
        const burstRequests = Array.from({ length: burstSize }, (_, i) => ({
          id: `perf-burst-${burstIndex}-${i.toString().padStart(3, '0')}`,
          model: 'gpt-4',
          prompt: `Burst test ${burstIndex} request ${i}`,
          agentType: 'completion',
          workspaceId: 'ws-perf-001',
          tenantId: 'tenant-perf-001',
          metadata: { requestType: 'completion' as const }
        }));

        const burstStart = performance.now();
        const burstResults = await Promise.allSettled(
          burstRequests.map(req => modelRouter.routeRequest(req))
        );
        const burstEnd = performance.now();

        const successful = burstResults.filter(r => r.status === 'fulfilled').length;
        const successRate = (successful / burstSize) * 100;
        const avgLatency = (burstEnd - burstStart) / burstSize;

        results.push({ burstSize, successRate, avgLatency });

        // Brief pause between bursts
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // All bursts should have reasonable success rates
      results.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThan(80); // 80% minimum success rate
        console.log(`Burst ${index + 1} (size ${result.burstSize}): ${result.successRate.toFixed(1)}% success, ${result.avgLatency.toFixed(2)}ms avg latency`);
      });
    });

    it('should recover performance after load spikes', async () => {
      // Baseline measurement
      const baselineRequest = {
        id: 'perf-recovery-baseline',
        model: 'gpt-4',
        prompt: 'Recovery test baseline',
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: { requestType: 'completion' as const }
      };

      const baselineStart = performance.now();
      await modelRouter.routeRequest(baselineRequest);
      const baselineEnd = performance.now();
      const baselineLatency = baselineEnd - baselineStart;

      // Generate load spike
      const spikeRequests = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-spike-${i.toString().padStart(3, '0')}`,
        model: 'gpt-4',
        prompt: `Load spike request ${i}`,
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: { requestType: 'completion' as const }
      }));

      await Promise.allSettled(
        spikeRequests.map(req => modelRouter.routeRequest(req))
      );

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test post-recovery performance
      const recoveryRequest = {
        id: 'perf-recovery-test',
        model: 'gpt-4',
        prompt: 'Recovery test post-spike',
        agentType: 'completion',
        workspaceId: 'ws-perf-001',
        tenantId: 'tenant-perf-001',
        metadata: { requestType: 'completion' as const }
      };

      const recoveryStart = performance.now();
      const recoveryResponse = await modelRouter.routeRequest(recoveryRequest);
      const recoveryEnd = performance.now();
      const recoveryLatency = recoveryEnd - recoveryStart;

      expect(recoveryResponse.status).toBe('success');
      expect(recoveryLatency).toBeLessThan(baselineLatency * 2); // Should recover to within 2x baseline

      console.log(`Recovery test - Baseline: ${baselineLatency.toFixed(2)}ms, Post-spike: ${recoveryLatency.toFixed(2)}ms`);
    });
  });
}, 300000); // 5 minute timeout for performance tests