import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

export interface SLOMetrics {
  testName: string;
  sloTarget: number;
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
  iterations: number;
  timestamp: string;
  successRate?: number;
  memoryUsage?: {
    peak: number;
    average: number;
    unit: string;
  };
}

export interface BenchmarkConfig {
  sloTargets: Record<string, Record<string, {
    p95: number;
    p50: number;
    unit: string;
    description: string;
  }>>;
  testEnvironments: Record<string, {
    profileName: string;
    iterations: number;
    timeoutMultiplier: number;
    enabledTests: string[];
  }>;
  baselineExpectations: Record<string, {
    p95Mean: number;
    p95StdDev: number;
    regressionThreshold: number;
  }>;
}

export class PerformanceTestRunner {
  private config: BenchmarkConfig;
  private results: SLOMetrics[] = [];
  private environment: string;

  constructor(configPath?: string, environment: string = 'ci') {
    this.environment = environment;
    this.loadConfig(configPath);
  }

  private async loadConfig(configPath?: string): Promise<void> {
    const defaultPath = path.join(__dirname, '../../tests/performance/benchmark-config.json');
    const finalPath = configPath || defaultPath;
    
    try {
      const configContent = await fs.readFile(finalPath, 'utf-8');
      this.config = JSON.parse(configContent);
    } catch (error) {
      console.warn(`Failed to load benchmark config from ${finalPath}, using defaults`);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): BenchmarkConfig {
    return {
      sloTargets: {
        toolhub: {
          vectorSearch: { p95: 200, p50: 100, unit: 'ms', description: 'Vector search' }
        },
        simulation: {
          smallWorkflow: { p95: 30000, p50: 20000, unit: 'ms', description: 'Small workflow' }
        }
      },
      testEnvironments: {
        ci: {
          profileName: 'light',
          iterations: 10,
          timeoutMultiplier: 1.0,
          enabledTests: ['vectorSearch', 'smallWorkflow']
        }
      },
      baselineExpectations: {}
    };
  }

  async measurePerformance<T>(
    testName: string,
    sloCategory: string,
    sloKey: string,
    testFn: () => Promise<T>,
    customIterations?: number
  ): Promise<{ result: T; metrics: SLOMetrics }> {
    const envConfig = this.config.testEnvironments[this.environment];
    const iterations = customIterations || envConfig.iterations;
    const sloTarget = this.config.sloTargets[sloCategory]?.[sloKey]?.p95 || 1000;

    console.log(`🔄 Running ${testName} (${iterations} iterations, target: ${sloTarget}ms)`);

    const measurements: number[] = [];
    const memoryMeasurements: number[] = [];
    let lastResult: T;
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const initialMemory = process.memoryUsage().heapUsed;
      
      try {
        const start = performance.now();
        lastResult = await testFn();
        const end = performance.now();
        
        measurements.push(end - start);
        successCount++;
        
        const finalMemory = process.memoryUsage().heapUsed;
        memoryMeasurements.push((finalMemory - initialMemory) / (1024 * 1024)); // MB
        
        if (i % Math.ceil(iterations / 10) === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        console.warn(`Iteration ${i} failed:`, error);
        measurements.push(sloTarget * 2); // Penalty for failures
      }
    }
    
    console.log(' ✅');

    measurements.sort((a, b) => a - b);
    const p50 = measurements[Math.floor(measurements.length * 0.5)];
    const p95 = measurements[Math.floor(measurements.length * 0.95)];
    const p99 = measurements[Math.floor(measurements.length * 0.99)];
    const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;

    const avgMemory = memoryMeasurements.reduce((a, b) => a + b, 0) / memoryMeasurements.length;
    const peakMemory = Math.max(...memoryMeasurements);

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
      timestamp: new Date().toISOString(),
      successRate: successCount / iterations,
      memoryUsage: {
        peak: Math.round(peakMemory * 100) / 100,
        average: Math.round(avgMemory * 100) / 100,
        unit: 'MB'
      }
    };

    this.results.push(metrics);
    this.logMetrics(metrics);
    
    return { result: lastResult!, metrics };
  }

  private logMetrics(metrics: SLOMetrics): void {
    const status = metrics.p95 <= metrics.sloTarget ? '✅ PASS' : '❌ FAIL';
    const successInfo = metrics.successRate ? ` (${(metrics.successRate * 100).toFixed(1)}% success)` : '';
    
    console.log(`${status} ${metrics.testName}: p95=${metrics.p95}ms (target: ${metrics.sloTarget}ms)${successInfo}`);
    
    if (metrics.memoryUsage) {
      console.log(`  📊 Memory: avg=${metrics.memoryUsage.average}MB, peak=${metrics.memoryUsage.peak}MB`);
    }
  }

  async checkRegressions(): Promise<{ hasRegressions: boolean; regressions: string[] }> {
    const regressions: string[] = [];
    
    for (const result of this.results) {
      const baselineKey = this.getBaselineKey(result.testName);
      const baseline = this.config.baselineExpectations[baselineKey];
      
      if (baseline) {
        const regressionThreshold = baseline.regressionThreshold;
        const expectedP95 = baseline.p95Mean;
        const actualDelta = result.p95 - expectedP95;
        
        if (actualDelta > regressionThreshold) {
          regressions.push(
            `${result.testName}: p95=${result.p95}ms vs expected=${expectedP95}ms (delta: +${actualDelta}ms, threshold: ${regressionThreshold}ms)`
          );
        }
      }
    }
    
    return {
      hasRegressions: regressions.length > 0,
      regressions
    };
  }

  private getBaselineKey(testName: string): string {
    // Convert test names to baseline keys
    const nameMap: Record<string, string> = {
      'ToolHub Vector Search': 'toolhubVectorSearch',
      'Small Workflow Simulation': 'smallWorkflowSimulation',
      'Agent Job Start Latency': 'agentJobStart',
      'Contract Validation': 'contractValidation'
    };
    
    return nameMap[testName] || testName.toLowerCase().replace(/\\s+/g, '');
  }

  async generateReport(outputPath?: string): Promise<void> {
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        environment: this.environment,
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.p95 <= r.sloTarget).length,
        failedTests: this.results.filter(r => r.p95 > r.sloTarget).length
      },
      results: this.results,
      regressions: await this.checkRegressions()
    };

    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`📄 Performance report saved to ${outputPath}`);
    }

    this.printSummary(report);
  }

  private printSummary(report: any): void {
    console.log('\n📊 Performance Test Summary:');
    console.log(`Environment: ${this.environment}`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests} ✅`);
    console.log(`Failed: ${report.summary.failedTests} ❌`);
    
    if (report.regressions.hasRegressions) {
      console.log('\n⚠️  Performance Regressions Detected:');
      report.regressions.regressions.forEach((regression: string) => {
        console.log(`  - ${regression}`);
      });
    } else {
      console.log('\n✅ No performance regressions detected');
    }

    console.log('\n📈 Detailed Results:');
    this.results.forEach(result => {
      const status = result.p95 <= result.sloTarget ? '✅' : '❌';
      console.log(`  ${status} ${result.testName}: ${result.p95}ms (target: ${result.sloTarget}ms)`);
    });
  }

  getResults(): SLOMetrics[] {
    return [...this.results];
  }

  isTestEnabled(testName: string): boolean {
    const envConfig = this.config.testEnvironments[this.environment];
    return envConfig.enabledTests.includes(testName) || envConfig.enabledTests.includes('all');
  }

  getSLOTarget(category: string, key: string): number {
    return this.config.sloTargets[category]?.[key]?.p95 || 1000;
  }

  getTimeout(baseTimeout: number): number {
    const envConfig = this.config.testEnvironments[this.environment];
    return baseTimeout * envConfig.timeoutMultiplier;
  }
}

export class MemoryProfiler {
  private samples: Array<{ timestamp: number; heapUsed: number; heapTotal: number; external: number }> = [];
  private interval: NodeJS.Timeout | null = null;

  start(sampleIntervalMs: number = 1000): void {
    this.samples = [];
    this.interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.samples.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });
    }, sampleIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getProfile(): {
    peakHeapUsed: number;
    averageHeapUsed: number;
    memoryGrowth: number;
    samples: number;
  } {
    if (this.samples.length === 0) {
      return { peakHeapUsed: 0, averageHeapUsed: 0, memoryGrowth: 0, samples: 0 };
    }

    const heapValues = this.samples.map(s => s.heapUsed);
    const peakHeapUsed = Math.max(...heapValues);
    const averageHeapUsed = heapValues.reduce((a, b) => a + b, 0) / heapValues.length;
    const memoryGrowth = heapValues[heapValues.length - 1] - heapValues[0];

    return {
      peakHeapUsed: Math.round(peakHeapUsed / (1024 * 1024) * 100) / 100, // MB
      averageHeapUsed: Math.round(averageHeapUsed / (1024 * 1024) * 100) / 100, // MB
      memoryGrowth: Math.round(memoryGrowth / (1024 * 1024) * 100) / 100, // MB
      samples: this.samples.length
    };
  }
}

export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeoutMs: number = 30000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

export function createLoadTestScenario(
  concurrentUsers: number,
  operationsPerUser: number,
  operationFn: (userIndex: number, operationIndex: number) => Promise<any>
): () => Promise<any[]> {
  return async () => {
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const operations = Array.from({ length: operationsPerUser }, (_, opIndex) =>
        operationFn(userIndex, opIndex)
      );
      return await Promise.all(operations);
    });

    return await Promise.all(userPromises);
  };
}