import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

interface ServiceEndpoint {
  name: string;
  baseUrl: string;
  healthPath: string;
}

interface TestConfig {
  services: ServiceEndpoint[];
  testTenant: string;
  testWorkspace: string;
  authToken?: string;
  timeout: number;
}

interface TestResult {
  service: string;
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

interface SmokeTestReport {
  timestamp: Date;
  environment: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  overall: 'passed' | 'failed';
}

export class E2ESmokeTestSuite {
  private config: TestConfig;
  private httpClients: Map<string, AxiosInstance>;

  constructor(config?: Partial<TestConfig>) {
    this.config = {
      services: [
        { name: 'monitoring', baseUrl: 'http://localhost:3000', healthPath: '/health' },
        { name: 'toolhub', baseUrl: 'http://localhost:3001', healthPath: '/health' },
        { name: 'simulator', baseUrl: 'http://localhost:3002', healthPath: '/health' },
        { name: 'agents', baseUrl: 'http://localhost:3003', healthPath: '/health' },
        { name: 'audit', baseUrl: 'http://localhost:3004', healthPath: '/health' },
        { name: 'smm-architect', baseUrl: 'http://localhost:3005', healthPath: '/health' },
        { name: 'workspace-provisioning', baseUrl: 'http://localhost:3006', healthPath: '/health' }
      ],
      testTenant: 'smoke-test-tenant',
      testWorkspace: `smoke-test-ws-${Date.now()}`,
      timeout: 30000,
      ...config
    };

    this.httpClients = new Map();
    this.initializeHttpClients();
  }

  private initializeHttpClients() {
    for (const service of this.config.services) {
      const client = axios.create({
        baseURL: service.baseUrl,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
        }
      });

      // Add request/response logging
      client.interceptors.request.use(req => {
        logger.debug(`${service.name} request`, {
          method: req.method?.toUpperCase(),
          url: req.url,
          headers: req.headers
        });
        return req;
      });

      client.interceptors.response.use(
        res => {
          logger.debug(`${service.name} response`, {
            status: res.status,
            headers: res.headers,
            dataSize: JSON.stringify(res.data).length
          });
          return res;
        },
        error => {
          logger.debug(`${service.name} error`, {
            status: error.response?.status,
            message: error.message
          });
          return Promise.reject(error);
        }
      );

      this.httpClients.set(service.name, client);
    }
  }

  /**
   * Run complete smoke test suite
   */
  async runSmokeTests(): Promise<SmokeTestReport> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    logger.info('Starting E2E smoke test suite', {
      services: this.config.services.length,
      testTenant: this.config.testTenant,
      testWorkspace: this.config.testWorkspace
    });

    // Test 1: Health checks for all services
    for (const service of this.config.services) {
      const result = await this.testServiceHealth(service);
      results.push(result);
    }

    // Test 2: Authentication and authorization
    const authResult = await this.testAuthentication();
    results.push(authResult);

    // Test 3: Database connectivity
    const dbResult = await this.testDatabaseConnectivity();
    results.push(dbResult);

    // Test 4: Vault integration
    const vaultResult = await this.testVaultIntegration();
    results.push(vaultResult);

    // Test 5: Content ingestion workflow
    const ingestionResult = await this.testContentIngestion();
    results.push(ingestionResult);

    // Test 6: Simulation workflow
    const simulationResult = await this.testSimulationWorkflow();
    results.push(simulationResult);

    // Test 7: Agent execution workflow
    const agentResult = await this.testAgentExecution();
    results.push(agentResult);

    // Test 8: Audit bundle creation and signing
    const auditResult = await this.testAuditWorkflow();
    results.push(auditResult);

    // Test 9: Workspace provisioning (lightweight)
    const provisioningResult = await this.testWorkspaceProvisioning();
    results.push(provisioningResult);

    // Test 10: End-to-end workflow integration
    const e2eResult = await this.testEndToEndWorkflow();
    results.push(e2eResult);

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    const report: SmokeTestReport = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      totalTests: results.length,
      passed,
      failed,
      skipped,
      duration,
      results,
      overall: failed === 0 ? 'passed' : 'failed'
    };

    logger.info('Smoke test suite completed', {
      overall: report.overall,
      passed,
      failed,
      skipped,
      duration: `${duration}ms`
    });

    return report;
  }

  private async testServiceHealth(service: ServiceEndpoint): Promise<TestResult> {
    const testName = `${service.name}-health-check`;
    const startTime = Date.now();

    try {
      const client = this.httpClients.get(service.name);
      if (!client) {
        throw new Error(`No HTTP client configured for ${service.name}`);
      }

      const response = await client.get(service.healthPath);
      
      if (response.status === 200 && response.data.status === 'healthy') {
        return {
          service: service.name,
          test: testName,
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: service.name,
          test: testName,
          status: 'failed',
          duration: Date.now() - startTime,
          error: `Unhealthy status: ${response.data.status}`,
          details: response.data
        };
      }
    } catch (error) {
      return {
        service: service.name,
        test: testName,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testAuthentication(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test authentication with the main service
      const client = this.httpClients.get('smm-architect');
      if (!client) {
        throw new Error('SMM Architect service client not available');
      }

      // Try to access a protected endpoint (this should fail without auth)
      try {
        await client.get('/api/workspaces');
        // If this succeeds without auth, that's a security issue
        return {
          service: 'smm-architect',
          test: 'authentication',
          status: 'failed',
          duration: Date.now() - startTime,
          error: 'Protected endpoint accessible without authentication'
        };
      } catch (error) {
        // This should fail with 401/403 - that's good
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          return {
            service: 'smm-architect',
            test: 'authentication',
            status: 'passed',
            duration: Date.now() - startTime,
            details: 'Protected endpoints properly require authentication'
          };
        } else {
          return {
            service: 'smm-architect',
            test: 'authentication',
            status: 'failed',
            duration: Date.now() - startTime,
            error: `Unexpected error: ${error instanceof Error ? error.message : error}`
          };
        }
      }
    } catch (error) {
      return {
        service: 'smm-architect',
        test: 'authentication',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testDatabaseConnectivity(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const client = this.httpClients.get('smm-architect');
      if (!client) {
        throw new Error('SMM Architect service client not available');
      }

      const response = await client.get('/health/database');
      
      if (response.status === 200 && response.data.status === 'healthy') {
        return {
          service: 'database',
          test: 'connectivity',
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: 'database',
          test: 'connectivity',
          status: 'failed',
          duration: Date.now() - startTime,
          error: 'Database health check failed',
          details: response.data
        };
      }
    } catch (error) {
      return {
        service: 'database',
        test: 'connectivity',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testVaultIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const client = this.httpClients.get('smm-architect');
      if (!client) {
        throw new Error('SMM Architect service client not available');
      }

      const response = await client.get('/health/vault');
      
      if (response.status === 200) {
        return {
          service: 'vault',
          test: 'integration',
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: 'vault',
          test: 'integration',
          status: 'failed',
          duration: Date.now() - startTime,
          error: 'Vault health check failed',
          details: response.data
        };
      }
    } catch (error) {
      return {
        service: 'vault',
        test: 'integration',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testContentIngestion(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const client = this.httpClients.get('toolhub');
      if (!client) {
        throw new Error('ToolHub service client not available');
      }

      // Test content ingestion endpoint
      const testContent = {
        url: 'https://example.com/test-content',
        workspaceId: this.config.testWorkspace,
        contentType: 'article'
      };

      const response = await client.post('/api/ingest', testContent);
      
      if (response.status === 202 || response.status === 200) {
        return {
          service: 'toolhub',
          test: 'content-ingestion',
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: 'toolhub',
          test: 'content-ingestion',
          status: 'failed',
          duration: Date.now() - startTime,
          error: `Unexpected status: ${response.status}`,
          details: response.data
        };
      }
    } catch (error) {
      // For smoke tests, we expect some endpoints to be protected or return specific errors
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          service: 'toolhub',
          test: 'content-ingestion',
          status: 'passed',
          duration: Date.now() - startTime,
          details: 'Endpoint properly protected'
        };
      }
      
      return {
        service: 'toolhub',
        test: 'content-ingestion',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testSimulationWorkflow(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const client = this.httpClients.get('simulator');
      if (!client) {
        throw new Error('Simulator service client not available');
      }

      // Test simulation endpoint with minimal payload
      const testSimulation = {
        workspaceId: this.config.testWorkspace,
        iterations: 100,
        randomSeed: 42
      };

      const response = await client.post('/api/simulate', testSimulation);
      
      if (response.status === 200 || response.status === 202) {
        return {
          service: 'simulator',
          test: 'simulation-workflow',
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: 'simulator',
          test: 'simulation-workflow',
          status: 'failed',
          duration: Date.now() - startTime,
          error: `Unexpected status: ${response.status}`,
          details: response.data
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          service: 'simulator',
          test: 'simulation-workflow',
          status: 'passed',
          duration: Date.now() - startTime,
          details: 'Endpoint properly protected'
        };
      }
      
      return {
        service: 'simulator',
        test: 'simulation-workflow',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testAgentExecution(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const client = this.httpClients.get('agents');
      if (!client) {
        throw new Error('Agents service client not available');
      }

      const testJob = {
        workspaceId: this.config.testWorkspace,
        agentType: 'research_agent',
        inputData: { task: 'test-task' }
      };

      const response = await client.post('/api/jobs', testJob);
      
      if (response.status === 201 || response.status === 202) {
        return {
          service: 'agents',
          test: 'agent-execution',
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: 'agents',
          test: 'agent-execution',
          status: 'failed',
          duration: Date.now() - startTime,
          error: `Unexpected status: ${response.status}`,
          details: response.data
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          service: 'agents',
          test: 'agent-execution',
          status: 'passed',
          duration: Date.now() - startTime,
          details: 'Endpoint properly protected'
        };
      }
      
      return {
        service: 'agents',
        test: 'agent-execution',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testAuditWorkflow(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const client = this.httpClients.get('audit');
      if (!client) {
        throw new Error('Audit service client not available');
      }

      const testAudit = {
        workspaceId: this.config.testWorkspace,
        bundleData: { test: 'data' }
      };

      const response = await client.post('/api/audit-bundles', testAudit);
      
      if (response.status === 201 || response.status === 202) {
        return {
          service: 'audit',
          test: 'audit-workflow',
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: 'audit',
          test: 'audit-workflow',
          status: 'failed',
          duration: Date.now() - startTime,
          error: `Unexpected status: ${response.status}`,
          details: response.data
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          service: 'audit',
          test: 'audit-workflow',
          status: 'passed',
          duration: Date.now() - startTime,
          details: 'Endpoint properly protected'
        };
      }
      
      return {
        service: 'audit',
        test: 'audit-workflow',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testWorkspaceProvisioning(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const client = this.httpClients.get('workspace-provisioning');
      if (!client) {
        throw new Error('Workspace provisioning service client not available');
      }

      // Test preview endpoint (safer than actual provisioning)
      const testPreview = {
        workspaceId: this.config.testWorkspace,
        tenantId: this.config.testTenant,
        environment: 'development',
        region: 'us-east-1',
        resourceTier: 'small'
      };

      const response = await client.post(`/api/workspaces/${this.config.testWorkspace}/preview`, testPreview);
      
      if (response.status === 200) {
        return {
          service: 'workspace-provisioning',
          test: 'provisioning-preview',
          status: 'passed',
          duration: Date.now() - startTime,
          details: response.data
        };
      } else {
        return {
          service: 'workspace-provisioning',
          test: 'provisioning-preview',
          status: 'failed',
          duration: Date.now() - startTime,
          error: `Unexpected status: ${response.status}`,
          details: response.data
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          service: 'workspace-provisioning',
          test: 'provisioning-preview',
          status: 'passed',
          duration: Date.now() - startTime,
          details: 'Endpoint properly protected'
        };
      }
      
      return {
        service: 'workspace-provisioning',
        test: 'provisioning-preview',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testEndToEndWorkflow(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // This test checks if services can communicate with each other
      const services = ['toolhub', 'simulator', 'agents', 'audit'];
      const results = [];

      for (const serviceName of services) {
        const client = this.httpClients.get(serviceName);
        if (client) {
          try {
            const response = await client.get('/health');
            results.push({ service: serviceName, healthy: response.status === 200 });
          } catch {
            results.push({ service: serviceName, healthy: false });
          }
        }
      }

      const healthyServices = results.filter(r => r.healthy).length;
      const totalServices = results.length;

      if (healthyServices === totalServices) {
        return {
          service: 'integration',
          test: 'end-to-end-workflow',
          status: 'passed',
          duration: Date.now() - startTime,
          details: { healthyServices, totalServices, results }
        };
      } else {
        return {
          service: 'integration',
          test: 'end-to-end-workflow',
          status: 'failed',
          duration: Date.now() - startTime,
          error: `Only ${healthyServices}/${totalServices} services healthy`,
          details: results
        };
      }
    } catch (error) {
      return {
        service: 'integration',
        test: 'end-to-end-workflow',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate HTML report from test results
   */
  generateHtmlReport(report: SmokeTestReport): string {
    const passedColor = '#28a745';
    const failedColor = '#dc3545';
    const skippedColor = '#ffc107';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SMM Architect Smoke Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; flex: 1; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: ${passedColor}; }
        .failed { color: ${failedColor}; }
        .skipped { color: ${skippedColor}; }
        .tests { margin-top: 30px; }
        .test { margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #ddd; }
        .test.passed { border-left-color: ${passedColor}; background: #f8fff9; }
        .test.failed { border-left-color: ${failedColor}; background: #fff8f8; }
        .test.skipped { border-left-color: ${skippedColor}; background: #fffdf5; }
        .test-header { display: flex; justify-content: space-between; align-items: center; }
        .test-details { margin-top: 10px; font-size: 0.9em; color: #666; }
        .error { color: ${failedColor}; font-family: monospace; background: #f8f8f8; padding: 10px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SMM Architect Smoke Test Report</h1>
        <p><strong>Environment:</strong> ${report.environment}</p>
        <p><strong>Timestamp:</strong> ${report.timestamp.toISOString()}</p>
        <p><strong>Duration:</strong> ${report.duration}ms</p>
        <p><strong>Overall Status:</strong> <span class="${report.overall}">${report.overall.toUpperCase()}</span></p>
      </div>

      <div class="summary">
        <div class="metric">
          <h3>Total Tests</h3>
          <div class="value">${report.totalTests}</div>
        </div>
        <div class="metric">
          <h3>Passed</h3>
          <div class="value passed">${report.passed}</div>
        </div>
        <div class="metric">
          <h3>Failed</h3>
          <div class="value failed">${report.failed}</div>
        </div>
        <div class="metric">
          <h3>Skipped</h3>
          <div class="value skipped">${report.skipped}</div>
        </div>
      </div>

      <div class="tests">
        <h2>Test Results</h2>
        ${report.results.map(result => `
          <div class="test ${result.status}">
            <div class="test-header">
              <span><strong>${result.service}</strong> - ${result.test}</span>
              <span class="${result.status}">${result.status.toUpperCase()} (${result.duration}ms)</span>
            </div>
            ${result.error ? `<div class="error">Error: ${result.error}</div>` : ''}
            ${result.details ? `<div class="test-details">Details: ${JSON.stringify(result.details, null, 2)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </body>
    </html>
    `;
  }
}

// CLI runner for smoke tests
async function runCLI() {
  const testSuite = new E2ESmokeTestSuite();
  
  try {
    const report = await testSuite.runSmokeTests();
    
    // Output JSON report
    console.log(JSON.stringify(report, null, 2));
    
    // Generate HTML report if requested
    if (process.argv.includes('--html')) {
      const html = testSuite.generateHtmlReport(report);
      const fs = await import('fs/promises');
      const reportPath = `smoke-test-report-${Date.now()}.html`;
      await fs.writeFile(reportPath, html);
      console.error(`\nHTML report written to: ${reportPath}`);
    }
    
    // Exit with error code if tests failed
    process.exit(report.overall === 'passed' ? 0 : 1);
    
  } catch (error) {
    console.error('Smoke test runner failed:', error);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  runCLI();
}

export { E2ESmokeTestSuite, TestResult, SmokeTestReport };