import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { N8nClient } from '../src/services/n8n-client';
import { MCPClient } from '../src/services/mcp-client';
import { ToolHubClient } from '../src/services/toolhub-client';
import { IntegrationTestManager } from '../utils/integration-test-manager';
import axios from 'axios';
import { WebSocket } from 'ws';

interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  finishedAt?: string;
  data?: any;
  error?: string;
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  metadata?: { [key: string]: any };
}

interface ToolHubResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    executionTime: number;
  };
}

describe('Integration Testing: n8n/MCP/ToolHub', () => {
  let n8nClient: N8nClient;
  let mcpClient: MCPClient;
  let toolhubClient: ToolHubClient;
  let testManager: IntegrationTestManager;
  let stagingWorkflows: string[] = [];

  beforeAll(async () => {
    // Initialize clients for staging environment
    n8nClient = new N8nClient({
      baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
      apiKey: process.env.N8N_API_KEY || 'test-api-key',
      environment: 'staging'
    });

    mcpClient = new MCPClient({
      serverUrl: process.env.MCP_SERVER_URL || 'ws://localhost:3000/mcp',
      clientId: 'smm-test-client',
      environment: 'staging'
    });

    toolhubClient = new ToolHubClient({
      baseUrl: process.env.TOOLHUB_BASE_URL || 'http://localhost:8080',
      apiKey: process.env.TOOLHUB_API_KEY || 'test-toolhub-key',
      environment: 'staging'
    });

    testManager = new IntegrationTestManager({
      services: [n8nClient, mcpClient, toolhubClient],
      environment: 'staging',
      cleanupOnExit: true
    });

    // Verify all services are running
    await testManager.verifyServicesHealth();
    console.log('🚀 All integration services are healthy');
  });

  afterAll(async () => {
    // Cleanup staging resources
    console.log('🧹 Cleaning up staging resources...');
    await testManager.cleanup();
    
    // Clean up workflows
    for (const workflowId of stagingWorkflows) {
      try {
        await n8nClient.deleteWorkflow(workflowId);
      } catch (error) {
        console.warn(`Failed to delete workflow ${workflowId}:`, error);
      }
    }
  });

  describe('n8n Workflow Integration', () => {
    it('should create and execute a simple workflow', async () => {
      const simpleWorkflow = {
        name: 'Test Simple Workflow',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 200],
            parameters: {}
          },
          {
            id: 'http-request',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [300, 200],
            parameters: {
              url: 'https://httpbin.org/json',
              method: 'GET'
            }
          }
        ],
        connections: {
          'start': {
            'main': [
              [{ 'node': 'http-request', 'type': 'main', 'index': 0 }]
            ]
          }
        },
        active: false,
        settings: {},
        tags: ['test', 'integration']
      };

      const workflowId = await n8nClient.createWorkflow(simpleWorkflow);
      stagingWorkflows.push(workflowId);
      
      expect(workflowId).toBeDefined();
      expect(workflowId).toMatch(/^[a-f0-9-]+$/);

      // Execute workflow
      const execution = await n8nClient.executeWorkflow(workflowId);
      expect(execution.executionId).toBeDefined();

      // Wait for completion
      const result = await n8nClient.waitForExecution(execution.executionId, 30000);
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
    }, 60000);

    it('should handle SMM Architect workflow with multiple agents', async () => {
      const smmWorkflow = {
        name: 'SMM Architect Agent Workflow',
        nodes: [
          {
            id: 'trigger',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [100, 200],
            parameters: {
              path: 'smm-test-webhook',
              httpMethod: 'POST'
            }
          },
          {
            id: 'research-agent',
            type: 'smm-nodes.researchAgent',
            typeVersion: 1,
            position: [300, 200],
            parameters: {
              query: '{{ $json.query }}',
              depth: 'comprehensive',
              sources: 10
            }
          },
          {
            id: 'creative-agent',
            type: 'smm-nodes.creativeAgent',
            typeVersion: 1,
            position: [500, 200],
            parameters: {
              format: 'carousel',
              tone: 'professional',
              length: 'medium',
              brandContext: '{{ $json.brandContext }}'
            }
          },
          {
            id: 'legal-agent',
            type: 'smm-nodes.legalAgent',
            typeVersion: 1,
            position: [700, 200],
            parameters: {
              checks: ['gdpr', 'ccpa'],
              industry: '{{ $json.industry }}'
            }
          },
          {
            id: 'toolhub-simulate',
            type: 'smm-nodes.toolhubSimulate',
            typeVersion: 1,
            position: [500, 400],
            parameters: {
              workspaceId: '{{ $json.workspaceId }}',
              iterations: 1000,
              dryRun: true
            }
          }
        ],
        connections: {
          'trigger': {
            'main': [
              [{ 'node': 'research-agent', 'type': 'main', 'index': 0 }]
            ]
          },
          'research-agent': {
            'main': [
              [{ 'node': 'creative-agent', 'type': 'main', 'index': 0 }]
            ]
          },
          'creative-agent': {
            'main': [
              [{ 'node': 'legal-agent', 'type': 'main', 'index': 0 }],
              [{ 'node': 'toolhub-simulate', 'type': 'main', 'index': 0 }]
            ]
          }
        },
        active: true,
        settings: {
          executionOrder: 'v1',
          timezone: 'UTC'
        },
        tags: ['smm', 'production', 'agent-workflow']
      };

      const workflowId = await n8nClient.createWorkflow(smmWorkflow);
      stagingWorkflows.push(workflowId);

      // Test webhook trigger
      const webhookUrl = await n8nClient.getWebhookUrl(workflowId, 'smm-test-webhook');
      expect(webhookUrl).toContain('smm-test-webhook');

      // Trigger workflow with test data
      const testPayload = {
        workspaceId: 'ws-integration-test',
        query: 'sustainability trends in tech industry',
        brandContext: 'innovative tech company focused on green solutions',
        industry: 'technology'
      };

      const response = await axios.post(webhookUrl, testPayload);
      expect(response.status).toBe(200);

      const executionId = response.data.executionId;
      const result = await n8nClient.waitForExecution(executionId, 120000);
      
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      
      // Verify each agent produced output
      expect(result.data.researchAgent).toBeDefined();
      expect(result.data.creativeAgent).toBeDefined();
      expect(result.data.legalAgent).toBeDefined();
      expect(result.data.simulationResults).toBeDefined();
    }, 180000);

    it('should handle workflow errors gracefully', async () => {
      const errorWorkflow = {
        name: 'Test Error Handling',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 200],
            parameters: {}
          },
          {
            id: 'error-node',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [300, 200],
            parameters: {
              url: 'https://invalid-domain-that-does-not-exist.com/api',
              method: 'GET'
            },
            onError: 'continueErrorOutput'
          },
          {
            id: 'error-handler',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [500, 300],
            parameters: {
              values: {
                string: [
                  {
                    name: 'errorHandled',
                    value: 'true'
                  }
                ]
              }
            }
          }
        ],
        connections: {
          'start': {
            'main': [
              [{ 'node': 'error-node', 'type': 'main', 'index': 0 }]
            ]
          },
          'error-node': {
            'error': [
              [{ 'node': 'error-handler', 'type': 'main', 'index': 0 }]
            ]
          }
        },
        active: false,
        settings: {}
      };

      const workflowId = await n8nClient.createWorkflow(errorWorkflow);
      stagingWorkflows.push(workflowId);

      const execution = await n8nClient.executeWorkflow(workflowId);
      const result = await n8nClient.waitForExecution(execution.executionId, 30000);

      // Should handle error gracefully
      expect(result.status).toBe('success');
      expect(result.data.errorHandled).toBe('true');
    }, 60000);
  });

  describe('MCP Protocol Integration', () => {
    it('should establish MCP connection and list resources', async () => {
      await mcpClient.connect();
      expect(mcpClient.isConnected()).toBe(true);

      const resources = await mcpClient.listResources();
      expect(Array.isArray(resources)).toBe(true);
      
      // Should have at least some test resources available
      expect(resources.length).toBeGreaterThan(0);
      
      const firstResource = resources[0];
      expect(firstResource.uri).toBeDefined();
      expect(firstResource.name).toBeDefined();
    }, 30000);

    it('should read and manipulate MCP resources', async () => {
      await mcpClient.connect();

      // Create a test resource
      const testResource: MCPResource = {
        uri: 'smm://test/resource/integration-test',
        name: 'Integration Test Resource',
        description: 'Test resource for MCP integration testing',
        mimeType: 'application/json',
        metadata: {
          createdBy: 'integration-test',
          version: '1.0.0'
        }
      };

      const created = await mcpClient.createResource(testResource);
      expect(created.success).toBe(true);

      // Read the resource back
      const retrieved = await mcpClient.readResource(testResource.uri);
      expect(retrieved.name).toBe(testResource.name);
      expect(retrieved.description).toBe(testResource.description);

      // Update the resource
      const updatedResource = {
        ...testResource,
        description: 'Updated description for integration test'
      };

      const updated = await mcpClient.updateResource(testResource.uri, updatedResource);
      expect(updated.success).toBe(true);

      // Verify update
      const retrievedUpdated = await mcpClient.readResource(testResource.uri);
      expect(retrievedUpdated.description).toBe('Updated description for integration test');

      // Clean up
      await mcpClient.deleteResource(testResource.uri);
    }, 45000);

    it('should handle MCP tool calls', async () => {
      await mcpClient.connect();

      // List available tools
      const tools = await mcpClient.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Find a research tool
      const researchTool = tools.find(tool => tool.name.includes('research'));
      expect(researchTool).toBeDefined();

      // Call the research tool
      const toolResult = await mcpClient.callTool(researchTool.name, {
        query: 'AI trends in marketing automation',
        depth: 'basic',
        sources: 3
      });

      expect(toolResult.success).toBe(true);
      expect(toolResult.result).toBeDefined();
      expect(toolResult.result.insights).toBeDefined();
    }, 60000);

    it('should handle MCP message streaming', async () => {
      await mcpClient.connect();

      const messages: any[] = [];
      const messageHandler = (message: any) => {
        messages.push(message);
      };

      mcpClient.onMessage(messageHandler);

      // Send a streaming request
      await mcpClient.streamingRequest('research/analyze', {
        content: 'Analyze the impact of AI on social media marketing',
        streamResults: true
      });

      // Wait for streaming to complete
      await new Promise(resolve => setTimeout(resolve, 10000));

      expect(messages.length).toBeGreaterThan(0);
      
      // Should have progress updates and final result
      const progressMessages = messages.filter(m => m.type === 'progress');
      const resultMessage = messages.find(m => m.type === 'result');
      
      expect(progressMessages.length).toBeGreaterThan(0);
      expect(resultMessage).toBeDefined();
    }, 30000);
  });

  describe('ToolHub Service Integration', () => {
    it('should perform vector search operations', async () => {
      const searchRequest = {
        workspaceId: 'ws-integration-test',
        query: 'brand voice and tone guidelines for social media',
        topK: 10,
        filters: {
          contentType: ['guidelines', 'brand-assets'],
          lastUpdated: {
            after: '2024-01-01T00:00:00Z'
          }
        }
      };

      const searchResult = await toolhubClient.vectorSearch(searchRequest);
      
      expect(searchResult.success).toBe(true);
      expect(searchResult.data.results).toBeDefined();
      expect(Array.isArray(searchResult.data.results)).toBe(true);
      expect(searchResult.data.totalFound).toBeGreaterThanOrEqual(0);
      expect(searchResult.metadata.executionTime).toBeLessThan(1000); // Should be under 1 second
    }, 30000);

    it('should execute simulation workflows', async () => {
      const simulationRequest = {
        workspaceId: 'ws-integration-test',
        workflowJson: {
          steps: [
            {
              type: 'research',
              config: { depth: 'basic', sources: 5 }
            },
            {
              type: 'creative',
              config: { format: 'text', length: 'short' }
            },
            {
              type: 'legal',
              config: { checks: ['gdpr'] }
            }
          ]
        },
        iterations: 500,
        randomSeed: 42,
        dryRun: true
      };

      const simulationResult = await toolhubClient.simulate(simulationRequest);
      
      expect(simulationResult.success).toBe(true);
      expect(simulationResult.data.simulationId).toBeDefined();
      expect(simulationResult.data.readinessScore).toBeGreaterThanOrEqual(0);
      expect(simulationResult.data.readinessScore).toBeLessThanOrEqual(1);
      expect(simulationResult.data.policyPassPct).toBeGreaterThanOrEqual(0);
      expect(simulationResult.data.costEstimateUSD).toBeGreaterThan(0);
    }, 120000);

    it('should handle content ingestion', async () => {
      const ingestionRequest = {
        workspaceId: 'ws-integration-test',
        sourceType: 'html',
        html: `
          <html>
            <head><title>Test Content</title></head>
            <body>
              <h1>Brand Guidelines</h1>
              <p>Our brand voice is professional yet approachable.</p>
              <p>We emphasize innovation and customer-centricity.</p>
            </body>
          </html>
        `,
        metadata: {
          title: 'Test Brand Guidelines',
          contentType: 'brand-guidelines',
          version: '1.0.0'
        }
      };

      const ingestionResult = await toolhubClient.ingestSource(ingestionRequest);
      
      expect(ingestionResult.success).toBe(true);
      expect(ingestionResult.data.sourceId).toBeDefined();
      expect(ingestionResult.data.extractedFacts).toBeGreaterThan(0);
      expect(ingestionResult.data.processingTime).toBeGreaterThan(0);
    }, 45000);

    it('should create and track render jobs', async () => {
      const renderRequest = {
        workspaceId: 'ws-integration-test',
        renderSpec: {
          type: 'image',
          template: 'social-post-template',
          content: {
            text: 'Exciting product launch coming soon!',
            headlines: ['Innovation Meets Excellence', 'Stay Tuned'],
            callToAction: 'Learn More'
          },
          dimensions: {
            width: 1080,
            height: 1080,
            format: 'png'
          }
        },
        priority: 'normal'
      };

      const renderResult = await toolhubClient.createRenderJob(renderRequest);
      
      expect(renderResult.success).toBe(true);
      expect(renderResult.data.jobId).toBeDefined();
      expect(renderResult.data.status).toBe('queued');

      // Check job status
      const jobStatus = await toolhubClient.getRenderJobStatus(renderResult.data.jobId);
      expect(jobStatus.success).toBe(true);
      expect(['queued', 'processing', 'completed'].includes(jobStatus.data.status)).toBe(true);
    }, 60000);
  });

  describe('Cross-Service Integration', () => {
    it('should orchestrate complete campaign workflow', async () => {
      // 1. Create workspace and ingest brand content via ToolHub
      const brandContent = await toolhubClient.ingestSource({
        workspaceId: 'ws-full-integration-test',
        sourceType: 'html',
        html: '<html><body><h1>Eco-Friendly Tech Solutions</h1><p>We create sustainable technology solutions for a better tomorrow.</p></body></html>',
        metadata: { title: 'Brand Overview', type: 'brand-content' }
      });

      expect(brandContent.success).toBe(true);

      // 2. Create n8n workflow that uses MCP and ToolHub
      const integrationWorkflow = {
        name: 'Full Integration Test Workflow',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 200],
            parameters: {}
          },
          {
            id: 'mcp-research',
            type: 'smm-nodes.mcpTool',
            typeVersion: 1,
            position: [300, 200],
            parameters: {
              tool: 'research/analyze',
              arguments: {
                query: 'sustainable technology trends',
                depth: 'comprehensive'
              }
            }
          },
          {
            id: 'toolhub-vector-search',
            type: 'smm-nodes.toolhubVectorSearch',
            typeVersion: 1,
            position: [500, 200],
            parameters: {
              workspaceId: 'ws-full-integration-test',
              query: '{{ $json.researchResults.keywords.join(" ") }}',
              topK: 5
            }
          },
          {
            id: 'creative-generation',
            type: 'smm-nodes.creativeAgent',
            typeVersion: 1,
            position: [700, 200],
            parameters: {
              brandContext: '{{ $json.brandContent }}',
              researchInsights: '{{ $json.researchResults }}',
              format: 'carousel'
            }
          },
          {
            id: 'final-simulation',
            type: 'smm-nodes.toolhubSimulate',
            typeVersion: 1,
            position: [900, 200],
            parameters: {
              workspaceId: 'ws-full-integration-test',
              workflowData: '{{ $json }}',
              iterations: 1000
            }
          }
        ],
        connections: {
          'start': { 'main': [[{ 'node': 'mcp-research', 'type': 'main', 'index': 0 }]] },
          'mcp-research': { 'main': [[{ 'node': 'toolhub-vector-search', 'type': 'main', 'index': 0 }]] },
          'toolhub-vector-search': { 'main': [[{ 'node': 'creative-generation', 'type': 'main', 'index': 0 }]] },
          'creative-generation': { 'main': [[{ 'node': 'final-simulation', 'type': 'main', 'index': 0 }]] }
        },
        active: false
      };

      const workflowId = await n8nClient.createWorkflow(integrationWorkflow);
      stagingWorkflows.push(workflowId);

      // 3. Execute the complete workflow
      const execution = await n8nClient.executeWorkflow(workflowId);
      const result = await n8nClient.waitForExecution(execution.executionId, 300000); // 5 minutes

      expect(result.status).toBe('success');
      expect(result.data.researchResults).toBeDefined();
      expect(result.data.brandContent).toBeDefined();
      expect(result.data.creativeOutput).toBeDefined();
      expect(result.data.simulationResults).toBeDefined();
      expect(result.data.simulationResults.readinessScore).toBeGreaterThan(0);
    }, 400000);

    it('should handle service failures gracefully', async () => {
      // Test workflow with simulated service failures
      const resilientWorkflow = {
        name: 'Resilience Test Workflow',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 200],
            parameters: {}
          },
          {
            id: 'primary-service',
            type: 'smm-nodes.toolhubVectorSearch',
            typeVersion: 1,
            position: [300, 200],
            parameters: {
              workspaceId: 'non-existent-workspace', // This will fail
              query: 'test query',
              topK: 5
            },
            continueOnFail: true
          },
          {
            id: 'fallback-service',
            type: 'smm-nodes.mcpTool',
            typeVersion: 1,
            position: [500, 200],
            parameters: {
              tool: 'research/basic',
              arguments: { query: 'fallback research query' }
            }
          },
          {
            id: 'success-handler',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [700, 200],
            parameters: {
              values: {
                string: [{ name: 'result', value: 'fallback_success' }]
              }
            }
          }
        ],
        connections: {
          'start': { 'main': [[{ 'node': 'primary-service', 'type': 'main', 'index': 0 }]] },
          'primary-service': { 
            'main': [[{ 'node': 'success-handler', 'type': 'main', 'index': 0 }]],
            'error': [[{ 'node': 'fallback-service', 'type': 'main', 'index': 0 }]]
          },
          'fallback-service': { 'main': [[{ 'node': 'success-handler', 'type': 'main', 'index': 0 }]] }
        },
        active: false
      };

      const workflowId = await n8nClient.createWorkflow(resilientWorkflow);
      stagingWorkflows.push(workflowId);

      const execution = await n8nClient.executeWorkflow(workflowId);
      const result = await n8nClient.waitForExecution(execution.executionId, 60000);

      expect(result.status).toBe('success');
      expect(result.data.result).toBe('fallback_success');
    }, 90000);
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent workflow executions', async () => {
      const concurrentCount = 5;
      const simpleWorkflow = {
        name: 'Concurrent Test Workflow',
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 200],
            parameters: {}
          },
          {
            id: 'delay',
            type: 'n8n-nodes-base.wait',
            typeVersion: 1,
            position: [300, 200],
            parameters: { amount: 2, unit: 'seconds' }
          },
          {
            id: 'set-result',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [500, 200],
            parameters: {
              values: {
                string: [{ name: 'completed', value: '{{ new Date().toISOString() }}' }]
              }
            }
          }
        ],
        connections: {
          'start': { 'main': [[{ 'node': 'delay', 'type': 'main', 'index': 0 }]] },
          'delay': { 'main': [[{ 'node': 'set-result', 'type': 'main', 'index': 0 }]] }
        },
        active: false
      };

      const workflowId = await n8nClient.createWorkflow(simpleWorkflow);
      stagingWorkflows.push(workflowId);

      // Execute multiple workflows concurrently
      const startTime = Date.now();
      const executions = await Promise.all(
        Array.from({ length: concurrentCount }, () => n8nClient.executeWorkflow(workflowId))
      );

      // Wait for all to complete
      const results = await Promise.all(
        executions.map(exec => n8nClient.waitForExecution(exec.executionId, 30000))
      );

      const totalTime = Date.now() - startTime;

      // All should succeed
      expect(results.every(r => r.status === 'success')).toBe(true);
      
      // Should complete in reasonable time (not much longer than sequential)
      expect(totalTime).toBeLessThan(20000); // 20 seconds max for 5 concurrent 2-second workflows

      console.log(`Completed ${concurrentCount} concurrent workflows in ${totalTime}ms`);
    }, 60000);

    it('should maintain service SLAs under load', async () => {
      const requestCount = 20;
      const toolhubRequests = Array.from({ length: requestCount }, async (_, i) => {
        const start = Date.now();
        const result = await toolhubClient.vectorSearch({
          workspaceId: 'ws-load-test',
          query: `load test query ${i}`,
          topK: 5
        });
        const duration = Date.now() - start;
        return { success: result.success, duration };
      });

      const results = await Promise.all(toolhubRequests);
      
      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // 95th percentile should be under 500ms
      const durations = results.map(r => r.duration).sort((a, b) => a - b);
      const p95 = durations[Math.floor(durations.length * 0.95)];
      expect(p95).toBeLessThan(500);
      
      console.log(`Load test: ${requestCount} requests, p95=${p95}ms`);
    }, 120000);
  });
});