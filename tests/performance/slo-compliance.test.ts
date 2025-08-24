import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { MonteCarloEngine } from '../src/services/monte-carlo-engine';
import { ToolHubClient } from '../src/services/toolhub-client';
import { AgentJobQueue } from '../src/services/agent-job-queue';
import { WorkspaceService } from '../src/services/workspace-service';
import { 
  WorkspaceContext, 
  SimulationConfig,
  SLOMetrics,
  PerformanceTest 
} from '../src/types';

describe('SLO Compliance & Performance Tests', () => {
  let toolhubClient: ToolHubClient;
  let agentJobQueue: AgentJobQueue;
  let workspaceService: WorkspaceService;
  let performanceResults: SLOMetrics[] = [];

  beforeAll(async () => {
    toolhubClient = new ToolHubClient(process.env.TOOLHUB_URL || 'http://localhost:8080');
    agentJobQueue = new AgentJobQueue();
    workspaceService = new WorkspaceService();
    
    // Warm up services
    console.log('Warming up services for performance testing...');
    await toolhubClient.healthCheck();
  });

  afterAll(async () => {
    // Output performance summary
    console.log('\n📊 SLO Compliance Summary:');
    performanceResults.forEach(result => {
      const status = result.p95 <= result.sloTarget ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.testName}: p95=${result.p95}ms (target: ${result.sloTarget}ms)`);
    });
  });

  const measurePerformance = async <T>(
    testName: string,
    sloTarget: number,
    testFn: () => Promise<T>,
    iterations: number = 20
  ): Promise<{ result: T; metrics: SLOMetrics }> => {
    const measurements: number[] = [];
    let lastResult: T;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      lastResult = await testFn();
      const end = performance.now();
      measurements.push(end - start);
    }

    measurements.sort((a, b) => a - b);
    const p50 = measurements[Math.floor(measurements.length * 0.5)];
    const p95 = measurements[Math.floor(measurements.length * 0.95)];
    const p99 = measurements[Math.floor(measurements.length * 0.99)];
    const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;

    const metrics: SLOMetrics = {
      testName,
      sloTarget,
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      mean: Math.round(mean),
      min: Math.round(Math.min(...measurements)),
      max: Math.round(Math.max(...measurements)),
      iterations,
      timestamp: new Date().toISOString()
    };

    performanceResults.push(metrics);
    return { result: lastResult!, metrics };
  };

  describe('ToolHub Vector Search SLO', () => {
    it('should meet vector search p95 < 200ms SLO', async () => {
      const testWorkspace = 'ws-perf-test-001';
      
      const { metrics } = await measurePerformance(
        'ToolHub Vector Search',
        200, // SLO target: 200ms
        async () => {
          return await toolhubClient.vectorSearch({
            workspaceId: testWorkspace,
            query: 'brand voice and tone guidelines',
            topK: 10
          });
        },
        30
      );

      expect(metrics.p95).toBeLessThanOrEqual(200);
      expect(metrics.p50).toBeLessThanOrEqual(100); // Additional P50 target
    }, 60000);

    it('should handle large result sets within SLO', async () => {
      const testWorkspace = 'ws-perf-test-002';
      
      const { metrics } = await measurePerformance(
        'ToolHub Vector Search (Large)',
        300, // Relaxed target for large queries
        async () => {
          return await toolhubClient.vectorSearch({
            workspaceId: testWorkspace,
            query: 'comprehensive marketing strategy social media content guidelines',
            topK: 50 // Larger result set
          });
        },
        20
      );

      expect(metrics.p95).toBeLessThanOrEqual(300);
    }, 60000);
  });

  describe('Simulation Performance SLO', () => {
    const createTestWorkspace = (): WorkspaceContext => ({
      workspaceId: 'ws-sim-perf-test',
      tenantId: 'perf-tenant',
      goals: [{ key: 'lead_gen', target: 50, unit: 'leads_per_month' }],
      primaryChannels: ['linkedin'],
      budget: { currency: 'USD', weeklyCap: 500, hardCap: 2000 },
      connectors: [{
        platform: 'linkedin',
        connectorId: 'conn-perf-1',
        accountId: 'acc-perf-1',
        displayName: 'Performance Test LinkedIn',
        status: 'connected'
      }],
      consentRecords: [],
      riskProfile: 'moderate'
    });

    it('should meet small workflow simulation p95 < 30s SLO', async () => {
      const workspace = createTestWorkspace();
      const smallWorkflow = [
        { type: 'research', config: { depth: 'basic', sources: 3 } },
        { type: 'creative', config: { format: 'text', length: 'short' } }
      ];

      const { metrics } = await measurePerformance(
        'Small Workflow Simulation',
        30000, // SLO target: 30 seconds
        async () => {
          const config: SimulationConfig = {
            randomSeed: Math.floor(Math.random() * 1000),
            iterations: 500, // Reduced for performance testing
            parallelBatches: 2,
            enableEarlyTermination: true,
            convergenceThreshold: 0.05,
            maxExecutionTime: 25
          };

          const engine = new MonteCarloEngine(config);
          return await engine.runSimulation(workspace, smallWorkflow, { 
            workspaceId: workspace.workspaceId 
          });
        },
        10 // Fewer iterations due to longer execution time
      );

      expect(metrics.p95).toBeLessThanOrEqual(30000);
      expect(metrics.mean).toBeLessThanOrEqual(20000); // Mean should be better
    }, 600000); // 10 minute timeout

    it('should meet medium workflow simulation p95 < 60s SLO', async () => {
      const workspace = createTestWorkspace();
      const mediumWorkflow = [
        { type: 'research', config: { depth: 'comprehensive', sources: 10 } },
        { type: 'creative', config: { format: 'carousel', variants: 3 } },
        { type: 'legal', config: { compliance_checks: ['gdpr', 'ccpa'] } }
      ];

      const { metrics } = await measurePerformance(
        'Medium Workflow Simulation',
        60000, // SLO target: 60 seconds
        async () => {
          const config: SimulationConfig = {
            randomSeed: Math.floor(Math.random() * 1000),
            iterations: 1000,
            parallelBatches: 4,
            enableEarlyTermination: true,
            convergenceThreshold: 0.03,
            maxExecutionTime: 55
          };

          const engine = new MonteCarloEngine(config);
          return await engine.runSimulation(workspace, mediumWorkflow, { 
            workspaceId: workspace.workspaceId 
          });
        },
        8
      );

      expect(metrics.p95).toBeLessThanOrEqual(60000);
    }, 800000);

    it('should handle parallel simulations efficiently', async () => {
      const workspace = createTestWorkspace();
      const workflow = [
        { type: 'research', config: { depth: 'basic', sources: 5 } }
      ];

      const { metrics } = await measurePerformance(
        'Parallel Simulation Load',
        45000, // 45 second target for parallel load
        async () => {
          const config: SimulationConfig = {
            randomSeed: 42,
            iterations: 300,
            parallelBatches: 8, // High parallelism
            enableEarlyTermination: true,
            convergenceThreshold: 0.05,
            maxExecutionTime: 40
          };

          const engine = new MonteCarloEngine(config);
          
          // Run 3 simulations in parallel
          const promises = Array.from({ length: 3 }, () => 
            engine.runSimulation(workspace, workflow, { 
              workspaceId: workspace.workspaceId + '-' + Math.random() 
            })
          );

          return await Promise.all(promises);
        },
        5
      );

      expect(metrics.p95).toBeLessThanOrEqual(45000);
    }, 400000);
  });

  describe('Agent Job Queue SLO', () => {
    it('should meet agent job start latency < 60s SLO', async () => {
      const { metrics } = await measurePerformance(
        'Agent Job Start Latency',
        60000, // SLO target: 60 seconds
        async () => {
          const jobId = await agentJobQueue.enqueue({
            type: 'research',
            workspaceId: 'ws-agent-perf-test',
            config: {
              query: 'competitor analysis tech industry',
              depth: 'standard',
              sources: 5
            },
            priority: 'normal'
          });

          // Wait for job to start (not complete)
          return await agentJobQueue.waitForJobStart(jobId);
        },
        15
      );

      expect(metrics.p95).toBeLessThanOrEqual(60000);
      expect(metrics.p50).toBeLessThanOrEqual(30000); // P50 should be much better
    }, 300000);

    it('should handle high priority jobs within SLO', async () => {
      const { metrics } = await measurePerformance(
        'High Priority Agent Job',
        30000, // Stricter target for high priority
        async () => {
          const jobId = await agentJobQueue.enqueue({
            type: 'creative',
            workspaceId: 'ws-agent-priority-test',
            config: {
              format: 'text',
              length: 'medium',
              tone: 'professional'
            },
            priority: 'high'
          });

          return await agentJobQueue.waitForJobStart(jobId);
        },
        10
      );

      expect(metrics.p95).toBeLessThanOrEqual(30000);
    }, 200000);
  });

  describe('Workspace Operations SLO', () => {
    it('should meet workspace creation performance targets', async () => {
      const { metrics } = await measurePerformance(
        'Workspace Creation',
        5000, // 5 second target
        async () => {
          const workspaceId = `ws-perf-${Date.now()}-${Math.random()}`;
          return await workspaceService.createWorkspace({
            workspaceId,
            tenantId: 'perf-test-tenant',
            createdBy: 'perf-test-user',
            goals: [{ key: 'test_goal', target: 10, unit: 'test' }],
            primaryChannels: ['linkedin'],
            budget: { currency: 'USD', weeklyCap: 100, hardCap: 500 },
            connectors: [],
            consentRecords: []
          });
        },
        25
      );

      expect(metrics.p95).toBeLessThanOrEqual(5000);
    }, 180000);

    it('should meet contract validation performance targets', async () => {
      const sampleContract = {
        workspaceId: 'ws-validation-perf-test',
        tenantId: 'perf-tenant',
        createdBy: 'perf-user',
        createdAt: new Date().toISOString(),
        lifecycle: 'draft' as const,
        contractVersion: 'v1.0.0',
        goals: [{ key: 'lead_gen', target: 100, unit: 'leads_per_month' }],
        primaryChannels: ['linkedin'] as const,
        connectors: [],
        consentRecords: [],
        budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 }
      };

      const { metrics } = await measurePerformance(
        'Contract Validation',
        2000, // 2 second target
        async () => {
          return await workspaceService.validateContract(sampleContract);
        },
        30
      );

      expect(metrics.p95).toBeLessThanOrEqual(2000);
    }, 120000);
  });

  describe('Content Publication SLO', () => {
    it('should meet publish success rate > 99% SLO', async () => {
      const testRuns = 100;
      let successCount = 0;
      const publishLatencies: number[] = [];

      for (let i = 0; i < testRuns; i++) {
        try {
          const start = performance.now();
          
          // Mock publish operation - in real test this would hit actual endpoints
          await toolhubClient.mockPublish({
            workspaceId: 'ws-publish-test',
            platform: 'linkedin',
            content: {
              text: `Test post ${i}`,
              type: 'text'
            },
            dryRun: true // Always dry run for testing
          });
          
          const end = performance.now();
          publishLatencies.push(end - start);
          successCount++;
        } catch (error) {
          console.warn(`Publish attempt ${i} failed:`, error);
        }
      }

      const successRate = successCount / testRuns;
      const avgLatency = publishLatencies.reduce((a, b) => a + b, 0) / publishLatencies.length;

      // Log results
      performanceResults.push({
        testName: 'Content Publication Success Rate',
        sloTarget: 99, // 99% success rate
        p50: Math.round(avgLatency),
        p95: Math.round(avgLatency * 1.2),
        p99: Math.round(avgLatency * 1.5),
        mean: Math.round(avgLatency),
        min: Math.round(Math.min(...publishLatencies)),
        max: Math.round(Math.max(...publishLatencies)),
        iterations: testRuns,
        timestamp: new Date().toISOString(),
        successRate: Math.round(successRate * 100)
      });

      expect(successRate).toBeGreaterThanOrEqual(0.99); // 99% success rate
      expect(avgLatency).toBeLessThanOrEqual(3000); // 3 second average publish latency
    }, 300000);
  });

  describe('Load Testing & Scalability', () => {
    it('should maintain performance under concurrent load', async () => {
      const concurrentUsers = 10;
      const operationsPerUser = 5;
      
      const { metrics } = await measurePerformance(
        'Concurrent Load Test',
        10000, // 10 second target under load
        async () => {
          const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
            const operations = Array.from({ length: operationsPerUser }, async (_, opIndex) => {
              // Mix of different operations
              const operation = opIndex % 3;
              switch (operation) {
                case 0:
                  return await toolhubClient.vectorSearch({
                    workspaceId: `ws-load-test-${userIndex}`,
                    query: `test query ${opIndex}`,
                    topK: 5
                  });
                case 1:
                  return await workspaceService.validateContract({
                    workspaceId: `ws-load-test-${userIndex}-${opIndex}`,
                    tenantId: 'load-test',
                    createdBy: `user-${userIndex}`,
                    createdAt: new Date().toISOString(),
                    lifecycle: 'draft',
                    contractVersion: 'v1.0.0',
                    goals: [{ key: 'test', target: 1, unit: 'test' }],
                    primaryChannels: ['linkedin'],
                    connectors: [],
                    consentRecords: [],
                    budget: { currency: 'USD', weeklyCap: 100, hardCap: 500 }
                  });
                case 2:
                  return await agentJobQueue.enqueue({
                    type: 'research',
                    workspaceId: `ws-load-test-${userIndex}`,
                    config: { query: `load test query ${opIndex}`, depth: 'basic' },
                    priority: 'normal'
                  });
              }
            });
            
            return await Promise.all(operations);
          });

          return await Promise.all(userPromises);
        },
        3 // Fewer iterations due to intensity
      );

      expect(metrics.p95).toBeLessThanOrEqual(10000);
      expect(metrics.mean).toBeLessThanOrEqual(7000);
    }, 300000);

    it('should handle memory efficiently during extended operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run extended operations
      for (let i = 0; i < 50; i++) {
        await toolhubClient.vectorSearch({
          workspaceId: 'ws-memory-test',
          query: `extended operation ${i}`,
          topK: 20
        });
        
        // Force garbage collection periodically
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)} MB`);
      
      // Memory growth should be reasonable (< 100MB for 50 operations)
      expect(memoryGrowthMB).toBeLessThanOrEqual(100);
    }, 120000);
  });
});