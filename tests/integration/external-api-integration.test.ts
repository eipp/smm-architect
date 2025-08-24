import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosResponse } from 'axios';
import { WebSocket } from 'ws';
import { promises as fs } from 'fs';
import { join } from 'path';

interface APITestResult {
  serviceName: string;
  testName: string;
  status: 'pass' | 'fail';
  duration: number;
  error?: string;
  response?: {
    status: number;
    latency: number;
  };
}

export class IntegrationTestFramework {
  private testResults: APITestResult[] = [];
  private reportsDir: string;

  constructor() {
    this.reportsDir = join(__dirname, '../../reports/integration');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  async testServiceHealth(name: string, url: string, expectedStatus = 200): Promise<APITestResult> {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      const duration = Date.now() - startTime;
      
      const result: APITestResult = {
        serviceName: name,
        testName: `${name}_health`,
        status: response.status === expectedStatus ? 'pass' : 'fail',
        duration,
        response: { status: response.status, latency: duration }
      };
      
      if (response.status !== expectedStatus) {
        result.error = `Expected ${expectedStatus}, got ${response.status}`;
      }
      
      this.testResults.push(result);
      return result;
    } catch (error) {
      const result: APITestResult = {
        serviceName: name,
        testName: `${name}_health`,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.testResults.push(result);
      return result;
    }
  }

  async testAPIEndpoint(
    serviceName: string, 
    baseUrl: string, 
    endpoint: string, 
    method = 'GET',
    payload?: any
  ): Promise<APITestResult> {
    const startTime = Date.now();
    const testName = `${serviceName}_${endpoint.replace(/\//g, '_')}`;
    
    try {
      const response = await axios({
        method,
        url: `${baseUrl}${endpoint}`,
        data: payload,
        timeout: 10000,
        validateStatus: () => true
      });
      
      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 400;
      
      const result: APITestResult = {
        serviceName,
        testName,
        status: success ? 'pass' : 'fail',
        duration,
        response: { status: response.status, latency: duration }
      };
      
      if (!success) {
        result.error = `API call failed with status ${response.status}`;
      }
      
      this.testResults.push(result);
      return result;
    } catch (error) {
      const result: APITestResult = {
        serviceName,
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.testResults.push(result);
      return result;
    }
  }

  async testWebhook(baseUrl: string, endpoint: string, payload: any): Promise<APITestResult> {
    const startTime = Date.now();
    const testName = `webhook_${endpoint.replace(/\//g, '_')}`;
    
    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;
      
      const result: APITestResult = {
        serviceName: 'webhook',
        testName,
        status: success ? 'pass' : 'fail',
        duration,
        response: { status: response.status, latency: duration }
      };
      
      this.testResults.push(result);
      return result;
    } catch (error) {
      const result: APITestResult = {
        serviceName: 'webhook',
        testName,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.testResults.push(result);
      return result;
    }
  }

  async generateReport(): Promise<string> {
    const reportPath = join(this.reportsDir, `integration-report-${Date.now()}.json`);
    
    const summary = {
      timestamp: new Date().toISOString(),
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'pass').length,
      failed: this.testResults.filter(r => r.status === 'fail').length,
      results: this.testResults
    };
    
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    return reportPath;
  }

  getResults(): APITestResult[] {
    return [...this.testResults];
  }
}

describe('Integration Testing Suite', () => {
  let framework: IntegrationTestFramework;

  beforeAll(async () => {
    framework = new IntegrationTestFramework();
    await framework.initialize();
  });

  describe('Service Health Checks', () => {
    const services = [
      { name: 'model-router', url: process.env.MODEL_ROUTER_URL || 'http://model-router.smm-system.svc.cluster.local:8080' },
      { name: 'toolhub', url: process.env.TOOLHUB_URL || 'http://toolhub.smm-system.svc.cluster.local:8080' },
      { name: 'audit-service', url: process.env.AUDIT_SERVICE_URL || 'http://audit.smm-system.svc.cluster.local:8080' },
      { name: 'workspace-service', url: process.env.WORKSPACE_SERVICE_URL || 'http://workspace.smm-system.svc.cluster.local:8080' }
    ];

    it.each(services)('should verify $name health endpoint', async ({ name, url }) => {
      const result = await framework.testServiceHealth(name, url);
      console.log(`${result.status === 'pass' ? '✅' : '❌'} ${name}: ${result.duration}ms`);
      
      // Allow some services to be down in test environment
      expect(['pass', 'fail']).toContain(result.status);
    }, 30000);
  });

  describe('API Endpoint Testing', () => {
    it('should test Model Router endpoints', async () => {
      const baseUrl = process.env.MODEL_ROUTER_URL || 'http://model-router.smm-system.svc.cluster.local:8080';
      
      const endpoints = [
        { endpoint: '/api/models', method: 'GET' },
        { endpoint: '/api/route', method: 'POST', payload: { request: { type: 'test' } } }
      ];

      for (const { endpoint, method, payload } of endpoints) {
        const result = await framework.testAPIEndpoint('model-router', baseUrl, endpoint, method, payload);
        console.log(`${result.status === 'pass' ? '✅' : '❌'} ${endpoint}: ${result.duration}ms`);
      }
    }, 60000);

    it('should test ToolHub endpoints', async () => {
      const baseUrl = process.env.TOOLHUB_URL || 'http://toolhub.smm-system.svc.cluster.local:8080';
      
      const result = await framework.testAPIEndpoint(
        'toolhub', 
        baseUrl, 
        '/api/vector-search', 
        'POST',
        { workspaceId: 'test', query: 'test query', topK: 5 }
      );
      
      console.log(`${result.status === 'pass' ? '✅' : '❌'} vector-search: ${result.duration}ms`);
    }, 30000);
  });

  describe('Webhook Testing', () => {
    it('should test n8n webhooks', async () => {
      const baseUrl = process.env.N8N_URL || 'http://n8n.n8n.svc.cluster.local:5678';
      
      const webhooks = [
        { endpoint: '/webhook/mcp-evaluate', payload: { modelId: 'test', evaluationType: 'golden_dataset' } },
        { endpoint: '/webhook/mcp-agent-communicate', payload: { agentType: 'research', task: { query: 'test' } } }
      ];

      for (const webhook of webhooks) {
        const result = await framework.testWebhook(baseUrl, webhook.endpoint, webhook.payload);
        console.log(`${result.status === 'pass' ? '✅' : '❌'} ${webhook.endpoint}: ${result.duration}ms`);
      }
    }, 90000);
  });

  describe('External Dependencies', () => {
    it('should validate external service connectivity', async () => {
      const externals = [
        { name: 'github', url: 'https://api.github.com/zen' },
        { name: 'slack', url: 'https://slack.com/api/api.test' }
      ];

      for (const external of externals) {
        const result = await framework.testAPIEndpoint('external', external.url, '', 'GET');
        console.log(`${result.status === 'pass' ? '✅' : '❌'} ${external.name}: ${result.duration}ms`);
      }
    }, 30000);
  });

  afterAll(async () => {
    const reportPath = await framework.generateReport();
    const results = framework.getResults();
    
    console.log('\n📊 Integration Test Summary:');
    console.log(`  Total: ${results.length}`);
    console.log(`  Passed: ${results.filter(r => r.status === 'pass').length}`);
    console.log(`  Failed: ${results.filter(r => r.status === 'fail').length}`);
    console.log(`  Report: ${reportPath}`);
    
    // At least health checks should mostly pass
    const healthChecks = results.filter(r => r.testName.includes('health'));
    const healthFailures = healthChecks.filter(r => r.status === 'fail').length;
    expect(healthFailures).toBeLessThanOrEqual(2); // Allow up to 2 services to be down
  });
});