import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BenchmarkResult {
  name: string;
  timestamp: string;
  environment: string;
  metrics: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    standardDeviation: number;
    iterations: number;
  };
  systemInfo: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuCount: number;
    totalMemory: number;
    freeMemory: number;
  };
  metadata?: Record<string, any>;
}

interface BenchmarkBaseline {
  name: string;
  baselineVersion: string;
  baselineDate: string;
  expectedMean: number;
  expectedP95: number;
  tolerancePercentage: number;
  regressionThreshold: number;
}

interface RegressionAnalysis {
  testName: string;
  currentMetrics: BenchmarkResult['metrics'];
  baselineMetrics: BenchmarkResult['metrics'];
  regression: {
    meanRegression: number;
    p95Regression: number;
    isRegression: boolean;
    severity: 'none' | 'minor' | 'major' | 'critical';
  };
  recommendation: string;
}

export class PerformanceBenchmarkFramework {
  private readonly baselineDir: string;
  private readonly resultsDir: string;
  private readonly configPath: string;

  constructor() {
    this.baselineDir = join(__dirname, 'baselines');
    this.resultsDir = join(__dirname, '../../reports/benchmarks');
    this.configPath = join(__dirname, 'benchmark-config.json');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.resultsDir, { recursive: true });
  }

  async benchmark<T>(
    name: string,
    testFunction: () => Promise<T> | T,
    options: {
      iterations?: number;
      warmupIterations?: number;
      timeout?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      timeout = 30000,
      metadata = {}
    } = options;

    console.log(`🏃 Running benchmark: ${name} (${iterations} iterations)`);

    // Warmup phase
    console.log('  🔥 Warming up...');
    for (let i = 0; i < warmupIterations; i++) {
      await this.runWithTimeout(testFunction, timeout);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Measurement phase
    const measurements: number[] = [];
    console.log('  📊 Measuring performance...');
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.runWithTimeout(testFunction, timeout);
      const end = performance.now();
      measurements.push(end - start);

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`    Progress: ${i + 1}/${iterations}`);
      }
    }

    // Calculate statistics
    measurements.sort((a, b) => a - b);
    const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const median = measurements[Math.floor(measurements.length * 0.5)];
    const p95 = measurements[Math.floor(measurements.length * 0.95)];
    const p99 = measurements[Math.floor(measurements.length * 0.99)];
    const min = measurements[0];
    const max = measurements[measurements.length - 1];
    
    const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
    const standardDeviation = Math.sqrt(variance);

    const result: BenchmarkResult = {
      name,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      metrics: {
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        iterations
      },
      systemInfo: await this.getSystemInfo(),
      metadata
    };

    console.log(`  ✅ Completed: ${name}`);
    console.log(`     Mean: ${result.metrics.mean}ms`);
    console.log(`     P95:  ${result.metrics.p95}ms`);
    console.log(`     P99:  ${result.metrics.p99}ms`);

    return result;
  }

  private async runWithTimeout<T>(fn: () => Promise<T> | T, timeout: number): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Benchmark operation timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = await fn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private async getSystemInfo(): Promise<BenchmarkResult['systemInfo']> {
    const os = await import('os');
    
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    };
  }

  async saveBaseline(result: BenchmarkResult): Promise<void> {
    const baselinePath = join(this.baselineDir, `${result.name}.json`);
    await fs.writeFile(baselinePath, JSON.stringify(result, null, 2));
    console.log(`📁 Baseline saved: ${baselinePath}`);
  }

  async loadBaseline(name: string): Promise<BenchmarkResult | null> {
    try {
      const baselinePath = join(this.baselineDir, `${name}.json`);
      const content = await fs.readFile(baselinePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async compareWithBaseline(current: BenchmarkResult): Promise<RegressionAnalysis | null> {
    const baseline = await this.loadBaseline(current.name);
    if (!baseline) {
      console.log(`⚠️  No baseline found for ${current.name}`);
      return null;
    }

    const meanRegression = ((current.metrics.mean - baseline.metrics.mean) / baseline.metrics.mean) * 100;
    const p95Regression = ((current.metrics.p95 - baseline.metrics.p95) / baseline.metrics.p95) * 100;

    // Load regression thresholds from config
    const config = await this.loadConfig();
    const testConfig = config.baselineExpectations[current.name.replace(/\s+/g, '')] || {
      regressionThreshold: 20 // Default 20% threshold
    };

    const isRegression = meanRegression > testConfig.regressionThreshold || p95Regression > testConfig.regressionThreshold;
    
    let severity: RegressionAnalysis['regression']['severity'] = 'none';
    if (isRegression) {
      const maxRegression = Math.max(meanRegression, p95Regression);
      if (maxRegression > 50) severity = 'critical';
      else if (maxRegression > 30) severity = 'major';
      else if (maxRegression > 10) severity = 'minor';
    }

    let recommendation = 'Performance is within expected bounds.';
    if (isRegression) {
      recommendation = `Performance regression detected. Mean: ${meanRegression.toFixed(1)}%, P95: ${p95Regression.toFixed(1)}%. ` +
                      `Consider investigating recent changes or optimizing performance.`;
    } else if (meanRegression < -10) {
      recommendation = `Performance improvement detected! Mean: ${meanRegression.toFixed(1)}%, P95: ${p95Regression.toFixed(1)}%. ` +
                      `Consider updating baseline.`;
    }

    return {
      testName: current.name,
      currentMetrics: current.metrics,
      baselineMetrics: baseline.metrics,
      regression: {
        meanRegression: Math.round(meanRegression * 100) / 100,
        p95Regression: Math.round(p95Regression * 100) / 100,
        isRegression,
        severity
      },
      recommendation
    };
  }

  private async loadConfig(): Promise<any> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Could not load benchmark config, using defaults');
      return { baselineExpectations: {} };
    }
  }

  async generateBenchmarkReport(results: BenchmarkResult[], analyses: RegressionAnalysis[]): Promise<string> {
    const reportPath = join(this.resultsDir, `benchmark-report-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBenchmarks: results.length,
        regressions: analyses.filter(a => a.regression.isRegression).length,
        improvements: analyses.filter(a => a.regression.meanRegression < -10).length,
        criticalIssues: analyses.filter(a => a.regression.severity === 'critical').length
      },
      results,
      regressionAnalyses: analyses,
      systemInfo: results.length > 0 ? results[0].systemInfo : null
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Also generate HTML report
    const htmlReportPath = await this.generateHtmlReport(report);
    
    console.log(`📊 Benchmark report generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);

    return reportPath;
  }

  private async generateHtmlReport(report: any): Promise<string> {
    const htmlPath = join(this.resultsDir, `benchmark-report-${Date.now()}.html`);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Benchmark Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .benchmark { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .regression { background: #ffe6e6; }
        .improvement { background: #e6ffe6; }
        .critical { background: #ffcccc; border-color: #ff6666; }
        .metric { display: inline-block; margin-right: 20px; }
        .chart { width: 100%; height: 200px; background: #f9f9f9; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Performance Benchmark Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric"><strong>Total Benchmarks:</strong> ${report.summary.totalBenchmarks}</div>
        <div class="metric"><strong>Regressions:</strong> ${report.summary.regressions}</div>
        <div class="metric"><strong>Improvements:</strong> ${report.summary.improvements}</div>
        <div class="metric"><strong>Critical Issues:</strong> ${report.summary.criticalIssues}</div>
        <div class="metric"><strong>Generated:</strong> ${report.timestamp}</div>
    </div>

    <h2>Benchmark Results</h2>
    ${report.results.map((result: BenchmarkResult) => `
        <div class="benchmark">
            <h3>${result.name}</h3>
            <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Mean</td><td>${result.metrics.mean}ms</td></tr>
                <tr><td>Median</td><td>${result.metrics.median}ms</td></tr>
                <tr><td>P95</td><td>${result.metrics.p95}ms</td></tr>
                <tr><td>P99</td><td>${result.metrics.p99}ms</td></tr>
                <tr><td>Min</td><td>${result.metrics.min}ms</td></tr>
                <tr><td>Max</td><td>${result.metrics.max}ms</td></tr>
                <tr><td>Std Dev</td><td>${result.metrics.standardDeviation}ms</td></tr>
                <tr><td>Iterations</td><td>${result.metrics.iterations}</td></tr>
            </table>
        </div>
    `).join('')}

    <h2>Regression Analysis</h2>
    ${report.regressionAnalyses.map((analysis: RegressionAnalysis) => `
        <div class="benchmark ${analysis.regression.severity === 'critical' ? 'critical' : 
                               analysis.regression.isRegression ? 'regression' : 
                               analysis.regression.meanRegression < -10 ? 'improvement' : ''}">
            <h3>${analysis.testName}</h3>
            <p><strong>Status:</strong> ${analysis.regression.isRegression ? 
                `⚠️ REGRESSION (${analysis.regression.severity})` : 
                analysis.regression.meanRegression < -10 ? '✅ IMPROVEMENT' : '✅ STABLE'}</p>
            <p><strong>Mean Change:</strong> ${analysis.regression.meanRegression.toFixed(1)}%</p>
            <p><strong>P95 Change:</strong> ${analysis.regression.p95Regression.toFixed(1)}%</p>
            <p><strong>Recommendation:</strong> ${analysis.recommendation}</p>
        </div>
    `).join('')}

    <h2>System Information</h2>
    ${report.systemInfo ? `
        <table>
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Node Version</td><td>${report.systemInfo.nodeVersion}</td></tr>
            <tr><td>Platform</td><td>${report.systemInfo.platform}</td></tr>
            <tr><td>Architecture</td><td>${report.systemInfo.arch}</td></tr>
            <tr><td>CPU Count</td><td>${report.systemInfo.cpuCount}</td></tr>
            <tr><td>Total Memory</td><td>${(report.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB</td></tr>
            <tr><td>Free Memory</td><td>${(report.systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB</td></tr>
        </table>
    ` : '<p>System information not available</p>'}
</body>
</html>`;

    await fs.writeFile(htmlPath, html);
    return htmlPath;
  }
}

describe('Performance Benchmark Framework', () => {
  let framework: PerformanceBenchmarkFramework;
  const benchmarkResults: BenchmarkResult[] = [];
  const regressionAnalyses: RegressionAnalysis[] = [];

  beforeAll(async () => {
    framework = new PerformanceBenchmarkFramework();
    await framework.initialize();
  });

  describe('Core Service Benchmarks', () => {
    it('should benchmark ToolHub vector search performance', async () => {
      const mockVectorSearch = async () => {
        // Simulate vector search computation
        const start = performance.now();
        
        // Simulate embedding calculation (CPU intensive)
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += Math.sqrt(i) * Math.sin(i);
        }
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));
        
        return { results: [], embedding: [sum], latency: performance.now() - start };
      };

      const result = await framework.benchmark(
        'ToolHub Vector Search',
        mockVectorSearch,
        {
          iterations: 50,
          warmupIterations: 10,
          metadata: { 
            testType: 'vector_search',
            embedding_dim: 1536,
            query_complexity: 'medium'
          }
        }
      );

      benchmarkResults.push(result);
      expect(result.metrics.p95).toBeLessThanOrEqual(200); // SLO compliance
      
      // Compare with baseline
      const analysis = await framework.compareWithBaseline(result);
      if (analysis) {
        regressionAnalyses.push(analysis);
        expect(analysis.regression.isRegression).toBe(false);
      }
    }, 120000);

    it('should benchmark Model Router routing performance', async () => {
      const mockModelRouting = async () => {
        const start = performance.now();
        
        // Simulate routing logic computation
        const models = Array.from({ length: 50 }, (_, i) => ({ 
          id: `model-${i}`, 
          latency: Math.random() * 1000,
          cost: Math.random() * 0.001,
          quality: Math.random()
        }));
        
        // Simulate routing algorithm
        const sorted = models.sort((a, b) => (a.latency * a.cost) - (b.latency * b.cost));
        const selected = sorted[0];
        
        // Simulate small network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
        
        return { selectedModel: selected, latency: performance.now() - start };
      };

      const result = await framework.benchmark(
        'Model Router Routing',
        mockModelRouting,
        {
          iterations: 100,
          warmupIterations: 20,
          metadata: { 
            testType: 'model_routing',
            model_count: 50,
            routing_complexity: 'standard'
          }
        }
      );

      benchmarkResults.push(result);
      expect(result.metrics.p95).toBeLessThanOrEqual(100); // SLO compliance
      
      const analysis = await framework.compareWithBaseline(result);
      if (analysis) {
        regressionAnalyses.push(analysis);
      }
    }, 120000);

    it('should benchmark Monte Carlo simulation convergence', async () => {
      const mockMonteCarloIteration = async () => {
        const start = performance.now();
        
        // Simulate Monte Carlo iteration
        let sum = 0;
        const samples = 1000;
        
        for (let i = 0; i < samples; i++) {
          const x = Math.random();
          const y = Math.random();
          const result = Math.exp(-x) * Math.sin(y) + Math.cos(x * y);
          sum += result;
        }
        
        const mean = sum / samples;
        const convergenceMetric = Math.abs(mean - 0.5); // Mock expected value
        
        return { mean, convergence: convergenceMetric, latency: performance.now() - start };
      };

      const result = await framework.benchmark(
        'Monte Carlo Simulation',
        mockMonteCarloIteration,
        {
          iterations: 30,
          warmupIterations: 5,
          metadata: { 
            testType: 'monte_carlo',
            sample_size: 1000,
            complexity: 'medium'
          }
        }
      );

      benchmarkResults.push(result);
      expect(result.metrics.p95).toBeLessThanOrEqual(50); // Fast iteration requirement
      
      const analysis = await framework.compareWithBaseline(result);
      if (analysis) {
        regressionAnalyses.push(analysis);
      }
    }, 60000);

    it('should benchmark JSON schema validation performance', async () => {
      const mockSchemaValidation = async () => {
        const start = performance.now();
        
        // Simulate complex JSON validation
        const largeObject = {
          workspaceId: 'ws-test-123',
          tenantId: 'tenant-456',
          goals: Array.from({ length: 10 }, (_, i) => ({
            key: `goal-${i}`,
            target: Math.random() * 1000,
            unit: 'units'
          })),
          connectors: Array.from({ length: 5 }, (_, i) => ({
            platform: `platform-${i}`,
            config: { nested: { deeply: { value: Math.random() } } }
          })),
          metadata: Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [`key-${i}`, `value-${i}`])
          )
        };
        
        // Simulate validation logic
        const validateField = (obj: any, depth = 0): boolean => {
          if (depth > 5) return true;
          
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
              if (!validateField(value, depth + 1)) return false;
            } else if (typeof value === 'string' && value.length === 0) {
              return false;
            }
          }
          return true;
        };
        
        const isValid = validateField(largeObject);
        
        return { isValid, latency: performance.now() - start };
      };

      const result = await framework.benchmark(
        'JSON Schema Validation',
        mockSchemaValidation,
        {
          iterations: 200,
          warmupIterations: 50,
          metadata: { 
            testType: 'schema_validation',
            object_complexity: 'high',
            validation_depth: 5
          }
        }
      );

      benchmarkResults.push(result);
      expect(result.metrics.p95).toBeLessThanOrEqual(10); // Very fast validation requirement
      
      const analysis = await framework.compareWithBaseline(result);
      if (analysis) {
        regressionAnalyses.push(analysis);
      }
    }, 60000);

    it('should benchmark workspace creation performance', async () => {
      const mockWorkspaceCreation = async () => {
        const start = performance.now();
        
        // Simulate workspace creation steps
        // 1. Validate input
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 2));
        
        // 2. Create database entries
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 10));
        
        // 3. Initialize default resources
        await new Promise(resolve => setTimeout(resolve, Math.random() * 15 + 5));
        
        // 4. Set up monitoring
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
        
        return { workspaceId: 'ws-new', latency: performance.now() - start };
      };

      const result = await framework.benchmark(
        'Workspace Creation',
        mockWorkspaceCreation,
        {
          iterations: 25,
          warmupIterations: 5,
          metadata: { 
            testType: 'workspace_creation',
            complexity: 'standard'
          }
        }
      );

      benchmarkResults.push(result);
      expect(result.metrics.p95).toBeLessThanOrEqual(5000); // 5 second SLO
      
      const analysis = await framework.compareWithBaseline(result);
      if (analysis) {
        regressionAnalyses.push(analysis);
      }
    }, 180000);
  });

  describe('Memory and Resource Benchmarks', () => {
    it('should benchmark memory usage during large operations', async () => {
      const memoryBenchmark = async () => {
        const start = performance.now();
        const initialMemory = process.memoryUsage();
        
        // Create large data structures
        const largeArray = Array.from({ length: 100000 }, (_, i) => ({
          id: i,
          data: `data-${i}`.repeat(10),
          nested: { value: Math.random() }
        }));
        
        // Process data
        const processed = largeArray
          .filter(item => item.id % 2 === 0)
          .map(item => ({ ...item, processed: true }))
          .slice(0, 10000);
        
        const finalMemory = process.memoryUsage();
        const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
        
        return { 
          processed: processed.length, 
          memoryGrowth,
          latency: performance.now() - start 
        };
      };

      const result = await framework.benchmark(
        'Memory Usage Large Operations',
        memoryBenchmark,
        {
          iterations: 20,
          warmupIterations: 3,
          metadata: { 
            testType: 'memory_benchmark',
            data_size: 100000
          }
        }
      );

      benchmarkResults.push(result);
      expect(result.metrics.p95).toBeLessThanOrEqual(1000); // 1 second processing time
      
      const analysis = await framework.compareWithBaseline(result);
      if (analysis) {
        regressionAnalyses.push(analysis);
      }
    }, 120000);
  });

  afterAll(async () => {
    // Generate comprehensive benchmark report
    const reportPath = await framework.generateBenchmarkReport(benchmarkResults, regressionAnalyses);
    
    console.log('\n📊 Performance Benchmark Summary:');
    console.log(`   Total Benchmarks: ${benchmarkResults.length}`);
    console.log(`   Regressions Found: ${regressionAnalyses.filter(a => a.regression.isRegression).length}`);
    console.log(`   Report Generated: ${reportPath}`);
    
    // Save successful runs as new baselines if no regressions
    const hasRegressions = regressionAnalyses.some(a => a.regression.isRegression);
    if (!hasRegressions && process.env.UPDATE_BASELINES === 'true') {
      console.log('🔄 Updating baselines...');
      for (const result of benchmarkResults) {
        await framework.saveBaseline(result);
      }
    }
  });
});