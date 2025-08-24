import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

interface LoadTestConfig {
  target: string;
  phases: Array<{
    duration: number;
    arrivalRate: number;
    name?: string;
  }>;
  scenarios: LoadTestScenario[];
}

interface LoadTestScenario {
  name: string;
  weight: number;
  flow: Array<{
    post?: {
      url: string;
      json: Record<string, any>;
      headers?: Record<string, string>;
    };
    get?: {
      url: string;
      headers?: Record<string, string>;
    };
    think?: number;
    capture?: Array<{
      json: string;
      as: string;
    }>;
  }>;
}

interface LoadTestResult {
  timestamp: string;
  scenarioName: string;
  target: string;
  summary: {
    requestsTotal: number;
    requestsCompleted: number;
    requestsFailed: number;
    responseTimeP50: number;
    responseTimeP95: number;
    responseTimeP99: number;
    responseTimeMax: number;
    errorRate: number;
    throughputRps: number;
  };
  sloCompliance: {
    latencySloMet: boolean;
    errorRateSloMet: boolean;
    throughputSloMet: boolean;
  };
}

export class LoadTestingFramework {
  private readonly configDir: string;
  private readonly resultsDir: string;

  constructor() {
    this.configDir = join(__dirname, 'configs');
    this.resultsDir = join(__dirname, '../../reports/performance');
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.mkdir(this.resultsDir, { recursive: true });
  }

  async createLoadTestConfig(name: string, config: LoadTestConfig): Promise<string> {
    const artilleryConfig = {
      config: {
        target: config.target,
        phases: config.phases,
        http: {
          timeout: 30,
          pool: 10
        },
        variables: {
          workspaceId: 'ws-load-test-{{ $randomString() }}',
          tenantId: 'tenant-load-test'
        }
      },
      scenarios: config.scenarios
    };

    const configPath = join(this.configDir, `${name}.yml`);
    await fs.writeFile(configPath, this.yamlStringify(artilleryConfig));
    return configPath;
  }

  async runLoadTest(configPath: string, testName: string): Promise<LoadTestResult> {
    return new Promise((resolve, reject) => {
      const reportPath = join(this.resultsDir, `${testName}-${Date.now()}.json`);
      
      const artillery = spawn('npx', [
        'artillery', 'run',
        '--output', reportPath,
        configPath
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      artillery.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(data.toString());
      });

      artillery.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(data.toString());
      });

      artillery.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`Artillery process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const reportData = await fs.readFile(reportPath, 'utf-8');
          const result = this.parseArtilleryReport(JSON.parse(reportData), testName);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Artillery report: ${error}`));
        }
      });
    });
  }

  private parseArtilleryReport(report: any, testName: string): LoadTestResult {
    const aggregate = report.aggregate;
    
    return {
      timestamp: new Date().toISOString(),
      scenarioName: testName,
      target: report.target || 'unknown',
      summary: {
        requestsTotal: aggregate.counters['http.requests'] || 0,
        requestsCompleted: aggregate.counters['http.responses'] || 0,
        requestsFailed: aggregate.counters['http.request_rate'] ? 
          aggregate.counters['http.requests'] - aggregate.counters['http.responses'] : 0,
        responseTimeP50: Math.round(aggregate.histograms['http.response_time']?.p50 || 0),
        responseTimeP95: Math.round(aggregate.histograms['http.response_time']?.p95 || 0),
        responseTimeP99: Math.round(aggregate.histograms['http.response_time']?.p99 || 0),
        responseTimeMax: Math.round(aggregate.histograms['http.response_time']?.max || 0),
        errorRate: this.calculateErrorRate(aggregate),
        throughputRps: Math.round(aggregate.rates['http.request_rate']?.mean || 0)
      },
      sloCompliance: {
        latencySloMet: (aggregate.histograms['http.response_time']?.p95 || Infinity) <= 5000,
        errorRateSloMet: this.calculateErrorRate(aggregate) <= 0.05,
        throughputSloMet: (aggregate.rates['http.request_rate']?.mean || 0) >= 10
      }
    };
  }

  private calculateErrorRate(aggregate: any): number {
    const total = aggregate.counters['http.requests'] || 1;
    const errors = (aggregate.counters['http.codes.400'] || 0) +
                  (aggregate.counters['http.codes.401'] || 0) +
                  (aggregate.counters['http.codes.403'] || 0) +
                  (aggregate.counters['http.codes.404'] || 0) +
                  (aggregate.counters['http.codes.500'] || 0) +
                  (aggregate.counters['http.codes.502'] || 0) +
                  (aggregate.counters['http.codes.503'] || 0);
    
    return errors / total;
  }

  private yamlStringify(obj: any): string {
    // Simple YAML serialization for Artillery config
    const lines: string[] = [];
    
    const stringify = (data: any, indent: number = 0): void => {
      const spaces = '  '.repeat(indent);
      
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (typeof item === 'object') {
            lines.push(`${spaces}-`);
            stringify(item, indent + 1);
          } else {
            lines.push(`${spaces}- ${item}`);
          }
        });
      } else if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            lines.push(`${spaces}${key}:`);
            stringify(value, indent + 1);
          } else if (typeof value === 'object' && value !== null) {
            lines.push(`${spaces}${key}:`);
            stringify(value, indent + 1);
          } else {
            lines.push(`${spaces}${key}: ${value}`);
          }
        });
      }
    };

    stringify(obj);
    return lines.join('\n');
  }

  async generateLoadTestReport(results: LoadTestResult[]): Promise<string> {
    const reportPath = join(this.resultsDir, `load-test-summary-${Date.now()}.json`);
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests: results.filter(r => 
        r.sloCompliance.latencySloMet && 
        r.sloCompliance.errorRateSloMet && 
        r.sloCompliance.throughputSloMet
      ).length,
      averageMetrics: {
        responseTimeP95: Math.round(
          results.reduce((sum, r) => sum + r.summary.responseTimeP95, 0) / results.length
        ),
        errorRate: results.reduce((sum, r) => sum + r.summary.errorRate, 0) / results.length,
        throughputRps: Math.round(
          results.reduce((sum, r) => sum + r.summary.throughputRps, 0) / results.length
        )
      },
      results
    };

    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    return reportPath;
  }
}

describe('Load Testing Framework', () => {
  let framework: LoadTestingFramework;

  beforeAll(async () => {
    framework = new LoadTestingFramework();
    await framework.initialize();
  });

  describe('Model Router Service Load Tests', () => {
    it('should handle model registration load', async () => {
      const config: LoadTestConfig = {
        target: 'http://model-router.smm-system.svc.cluster.local:8080',
        phases: [
          { duration: 30, arrivalRate: 5, name: 'ramp-up' },
          { duration: 60, arrivalRate: 10, name: 'sustained' },
          { duration: 30, arrivalRate: 5, name: 'ramp-down' }
        ],
        scenarios: [{
          name: 'model-registration',
          weight: 100,
          flow: [
            {
              post: {
                url: '/api/models',
                json: {
                  id: 'model-{{ $randomString() }}',
                  name: 'Test Model {{ $randomString() }}',
                  type: 'text-generation',
                  version: '1.0.0',
                  endpoint: 'https://api.example.com/v1/models/test',
                  apiKey: 'test-key-{{ $randomString() }}',
                  config: {
                    maxTokens: 4096,
                    temperature: 0.7
                  },
                  capabilities: ['text-generation', 'chat'],
                  costPerToken: 0.0001
                },
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test-token'
                }
              },
              capture: [{
                json: '$.id',
                as: 'modelId'
              }]
            },
            { think: 1 },
            {
              get: {
                url: '/api/models/{{ modelId }}',
                headers: {
                  'Authorization': 'Bearer test-token'
                }
              }
            }
          ]
        }]
      };

      const configPath = await framework.createLoadTestConfig('model-registration', config);
      const result = await framework.runLoadTest(configPath, 'model-registration-load');

      expect(result.sloCompliance.latencySloMet).toBe(true);
      expect(result.sloCompliance.errorRateSloMet).toBe(true);
      expect(result.summary.responseTimeP95).toBeLessThanOrEqual(2000);
    }, 300000);

    it('should handle model routing load', async () => {
      const config: LoadTestConfig = {
        target: 'http://model-router.smm-system.svc.cluster.local:8080',
        phases: [
          { duration: 60, arrivalRate: 20, name: 'high-throughput' }
        ],
        scenarios: [{
          name: 'model-routing',
          weight: 100,
          flow: [
            {
              post: {
                url: '/api/route',
                json: {
                  request: {
                    type: 'text-generation',
                    prompt: 'Generate a marketing email for {{ $randomString() }}',
                    agentType: 'creative',
                    workspaceId: '{{ workspaceId }}',
                    priority: 'normal'
                  },
                  routingHints: {
                    preferredModels: ['gpt-4', 'claude-3-sonnet'],
                    excludeModels: ['gpt-3.5-turbo']
                  }
                },
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test-token'
                }
              }
            },
            { think: 0.5 }
          ]
        }]
      };

      const configPath = await framework.createLoadTestConfig('model-routing', config);
      const result = await framework.runLoadTest(configPath, 'model-routing-load');

      expect(result.sloCompliance.latencySloMet).toBe(true);
      expect(result.summary.responseTimeP95).toBeLessThanOrEqual(1000);
      expect(result.summary.throughputRps).toBeGreaterThanOrEqual(15);
    }, 200000);
  });

  describe('n8n Workflow Load Tests', () => {
    it('should handle MCP workflow execution load', async () => {
      const config: LoadTestConfig = {
        target: 'http://n8n.n8n.svc.cluster.local:5678',
        phases: [
          { duration: 45, arrivalRate: 8, name: 'workflow-load' }
        ],
        scenarios: [{
          name: 'mcp-evaluation',
          weight: 100,
          flow: [
            {
              post: {
                url: '/webhook/mcp-evaluate',
                json: {
                  modelId: 'model-{{ $randomString() }}',
                  evaluationType: 'golden_dataset',
                  datasetId: 'golden-dataset-v1',
                  timeout: 60000
                },
                headers: {
                  'Content-Type': 'application/json',
                  'X-N8N-Webhook-Token': 'test-webhook-token'
                }
              }
            },
            { think: 2 }
          ]
        }]
      };

      const configPath = await framework.createLoadTestConfig('mcp-workflow', config);
      const result = await framework.runLoadTest(configPath, 'mcp-workflow-load');

      expect(result.sloCompliance.latencySloMet).toBe(true);
      expect(result.summary.responseTimeP95).toBeLessThanOrEqual(10000);
    }, 180000);
  });

  describe('ToolHub Load Tests', () => {
    it('should handle vector search load', async () => {
      const config: LoadTestConfig = {
        target: 'http://toolhub.smm-system.svc.cluster.local:8080',
        phases: [
          { duration: 60, arrivalRate: 15, name: 'vector-search-load' }
        ],
        scenarios: [{
          name: 'vector-search',
          weight: 100,
          flow: [
            {
              post: {
                url: '/api/vector-search',
                json: {
                  workspaceId: '{{ workspaceId }}',
                  query: 'brand guidelines social media {{ $randomString() }}',
                  topK: 10,
                  filters: {
                    category: 'guidelines'
                  }
                },
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test-token'
                }
              }
            },
            { think: 0.3 }
          ]
        }]
      };

      const configPath = await framework.createLoadTestConfig('vector-search', config);
      const result = await framework.runLoadTest(configPath, 'vector-search-load');

      expect(result.sloCompliance.latencySloMet).toBe(true);
      expect(result.summary.responseTimeP95).toBeLessThanOrEqual(300);
      expect(result.summary.throughputRps).toBeGreaterThanOrEqual(10);
    }, 150000);
  });

  describe('End-to-End Workflow Load Tests', () => {
    it('should handle complete campaign creation load', async () => {
      const config: LoadTestConfig = {
        target: 'http://api-gateway.smm-system.svc.cluster.local:8080',
        phases: [
          { duration: 120, arrivalRate: 5, name: 'e2e-campaign-load' }
        ],
        scenarios: [{
          name: 'campaign-creation',
          weight: 100,
          flow: [
            // 1. Create workspace
            {
              post: {
                url: '/api/workspaces',
                json: {
                  workspaceId: 'ws-{{ $randomString() }}',
                  tenantId: '{{ tenantId }}',
                  goals: [{ key: 'lead_generation', target: 50, unit: 'leads_per_month' }],
                  primaryChannels: ['linkedin'],
                  budget: { currency: 'USD', weeklyCap: 500, hardCap: 2000 }
                },
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test-token'
                }
              },
              capture: [{
                json: '$.workspaceId',
                as: 'workspaceId'
              }]
            },
            { think: 1 },
            // 2. Start simulation
            {
              post: {
                url: '/api/simulations',
                json: {
                  workspaceId: '{{ workspaceId }}',
                  workflow: [
                    { type: 'research', config: { depth: 'basic', sources: 5 } },
                    { type: 'creative', config: { format: 'text', length: 'medium' } }
                  ],
                  config: {
                    iterations: 100,
                    parallelBatches: 2,
                    maxExecutionTime: 30
                  }
                },
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test-token'
                }
              },
              capture: [{
                json: '$.simulationId',
                as: 'simulationId'
              }]
            },
            { think: 5 },
            // 3. Check simulation status
            {
              get: {
                url: '/api/simulations/{{ simulationId }}/status',
                headers: {
                  'Authorization': 'Bearer test-token'
                }
              }
            }
          ]
        }]
      };

      const configPath = await framework.createLoadTestConfig('e2e-campaign', config);
      const result = await framework.runLoadTest(configPath, 'e2e-campaign-load');

      expect(result.sloCompliance.latencySloMet).toBe(true);
      expect(result.summary.responseTimeP95).toBeLessThanOrEqual(15000);
    }, 400000);
  });

  afterAll(async () => {
    // Generate consolidated load test report
    const allResults: LoadTestResult[] = []; // In practice, collect all results
    const reportPath = await framework.generateLoadTestReport(allResults);
    console.log(`Load test report generated: ${reportPath}`);
  });
});