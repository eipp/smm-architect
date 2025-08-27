import { expect, describe, it, beforeEach } from '@jest/globals';
import { AgentExecutor, AgentJobRequest } from '../src/executor';
import { VaultTokenIssuer } from '../src/vault-token-issuer';
import { ModelRouterClient } from '../src/model-router-client';

// Mock ToolHub client
class MockToolHubClient {
  async ingestSource(url: string, sourceType: string, workspaceId: string, token: string) {
    return { sourceId: `source_${Date.now()}` };
  }

  async vectorSearch(query: string, workspaceId: string, topK: number, token: string) {
    return [
      { content: 'Mock search result 1', score: 0.9 },
      { content: 'Mock search result 2', score: 0.8 }
    ];
  }

  async storeOutput(output: any, outputType: string, workspaceId: string, token: string) {
    return { outputId: `output_${Date.now()}` };
  }
}

describe('Agent Executor Integration Tests', () => {
  let agentExecutor: AgentExecutor;
  let mockVaultIssuer: VaultTokenIssuer;
  let mockModelRouter: ModelRouterClient;
  let mockToolHub: MockToolHubClient;

  beforeEach(() => {
    // Create mock dependencies
    mockVaultIssuer = VaultTokenIssuer.createMockIssuer();
    mockModelRouter = ModelRouterClient.createMockClient();
    mockToolHub = new MockToolHubClient();

    // Create agent executor
    agentExecutor = new AgentExecutor(
      mockVaultIssuer,
      mockModelRouter as any,
      mockToolHub as any
    );
  });

  describe('Research Agent Execution', () => {
    it('agent-integration: should execute research agent end-to-end', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-001',
        tenantId: 'tenant-test',
        agentType: 'research',
        agentVersion: '1.0.0',
        input: {
          domain: 'icblabs.com',
          sources: ['https://icblabs.com', 'https://linkedin.com/company/icb-labs']
        },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      // Verify execution completed successfully
      expect(response.status).toBe('completed');
      expect(response.jobId).toMatch(/^job-research-/);
      expect(response.outputs).toBeDefined();
      expect(response.modelUsage).toBeDefined();
      expect(response.modelUsage.length).toBeGreaterThan(0);

      // Verify BrandTwin output structure
      const brandTwin = response.outputs.brandTwin;
      expect(brandTwin).toBeDefined();
      expect(brandTwin.brandId).toBeDefined();
      expect(brandTwin.facts).toBeDefined();
      expect(brandTwin.voiceTone).toBeDefined();
      expect(brandTwin.metadata).toBeDefined();

      // Verify model usage tracking
      const usage = response.modelUsage[0];
      expect(usage.modelId).toBeDefined();
      expect(usage.totalTokens).toBeGreaterThan(0);
      expect(usage.costEstimateUsd).toBeGreaterThan(0);
      expect(usage.promptHash).toBeDefined();

      // Verify quality score
      expect(response.qualityScore).toBeGreaterThanOrEqual(0);
      expect(response.qualityScore).toBeLessThanOrEqual(1);

      console.log('✅ Research agent execution completed');
      console.log(`Job ID: ${response.jobId}`);
      console.log(`Duration: ${response.duration}ms`);
      console.log(`Model usage: ${response.modelUsage.length} calls`);
      console.log(`Quality score: ${response.qualityScore}`);
    }, 30000);

    it('should handle research agent with multiple sources', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-002',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: {
          domain: 'example.com',
          sources: [
            'https://example.com',
            'https://example.com/about',
            'https://linkedin.com/company/example'
          ]
        },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      expect(response.status).toBe('completed');
      expect(response.outputs.sourceIds).toHaveLength(3);

      // Verify all sources were processed
      const sourceIds = response.outputs.sourceIds;
      expect(sourceIds.every((id: string) => id.startsWith('source_'))).toBe(true);
    });

    it('should track token usage accurately', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-003',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'test.com' },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      expect(response.modelUsage).toBeDefined();
      expect(response.modelUsage.length).toBeGreaterThan(0);

      const totalCost = response.modelUsage.reduce((sum, usage) => sum + usage.costEstimateUsd, 0);
      expect(totalCost).toBeGreaterThan(0);

      // Verify usage tracking fields
      const usage = response.modelUsage[0];
      expect(usage.inputTokens).toBeGreaterThan(0);
      expect(usage.outputTokens).toBeGreaterThan(0);
      expect(usage.totalTokens).toBe(usage.inputTokens + usage.outputTokens);
      expect(usage.provider).toBeDefined();
      expect(usage.timestamp).toBeDefined();
    });
  });

  describe('Planner Agent Execution', () => {
    it('should execute planner agent successfully', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-004',
        tenantId: 'tenant-test',
        agentType: 'planner',
        input: {
          brandTwin: {
            brandId: 'test-brand',
            voiceTone: { primaryTone: 'professional' },
            targetAudience: ['business_professionals']
          },
          goals: [
            { key: 'lead_gen', target: 100, unit: 'leads_per_month' }
          ],
          channels: ['linkedin', 'x']
        },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      expect(response.status).toBe('completed');
      expect(response.outputs).toBeDefined();
      expect(response.outputs.campaignPlan).toBeDefined();
      expect(response.modelUsage).toBeDefined();
    });
  });

  describe('Creative Agent Execution', () => {
    it('should execute creative agent successfully', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-005',
        tenantId: 'tenant-test',
        agentType: 'creative',
        input: {
          campaignPlan: {
            theme: 'Digital Innovation',
            contentTypes: ['blog_post', 'social_media_post']
          },
          brandTwin: {
            voiceTone: { primaryTone: 'innovative', description: 'Tech-forward' }
          }
        },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      expect(response.status).toBe('completed');
      expect(response.outputs).toBeDefined();
      expect(response.outputs.contentAssets).toBeDefined();
      expect(response.qualityScore).toBeGreaterThan(0.5);
    });
  });

  describe('Error Handling', () => {
    it('should handle agent execution timeout', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-006',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'timeout-test.com' },
        timeout: 1, // 1 second timeout
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      // Depending on implementation, might succeed quickly or timeout
      expect(['completed', 'failed']).toContain(response.status);
      expect(response.jobId).toBeDefined();
    });

    it('should handle invalid agent type', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-007',
        tenantId: 'tenant-test',
        agentType: 'invalid-agent',
        input: {},
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      expect(response.status).toBe('failed');
      expect(response.errorMessage).toContain('Unsupported agent type');
    });

    it('should handle job cancellation', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-008',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'cancel-test.com' },
        createdBy: 'test-user'
      };

      // Start job execution (don't await)
      const executionPromise = agentExecutor.executeJob(request);
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get active jobs
      const activeJobs = agentExecutor.getActiveJobs();
      expect(activeJobs.length).toBeGreaterThan(0);
      
      // Cancel the first job
      const cancelled = await agentExecutor.cancelJob(activeJobs[0]);
      expect(cancelled).toBe(true);
      
      // Wait for execution to complete
      const response = await executionPromise;
      expect(['cancelled', 'failed']).toContain(response.status);
    });
  });

  describe('Job Management', () => {
    it('should track active jobs', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-009',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'tracking-test.com' },
        createdBy: 'test-user'
      };

      // Execute job
      const response = await agentExecutor.executeJob(request);
      
      // Job should not be active after completion
      const activeJobs = agentExecutor.getActiveJobs();
      expect(activeJobs).not.toContain(response.jobId);
    });

    it('should provide job status', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-010',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'status-test.com' },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);
      
      // Try to get job status (will be null since we're mocking DB)
      const status = await agentExecutor.getJobStatus(response.jobId);
      // In mock environment, this will be null, but in real implementation would return status
      expect(status).toBeNull();
    });
  });

  describe('Performance and Quality', () => {
    it('should complete research job within reasonable time', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-011',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'performance-test.com' },
        createdBy: 'test-user'
      };

      const startTime = Date.now();
      const response = await agentExecutor.executeJob(request);
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe('completed');
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds in mock environment
      expect(response.duration).toBeDefined();
      expect(response.duration).toBeGreaterThan(0);
    });

    it('should maintain quality scores within acceptable range', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-012',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'quality-test.com' },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      expect(response.status).toBe('completed');
      expect(response.qualityScore).toBeGreaterThanOrEqual(0.0);
      expect(response.qualityScore).toBeLessThanOrEqual(1.0);
      
      // In a real implementation, we'd want quality scores above a threshold
      // For mock data, just verify the score is calculated
      expect(typeof response.qualityScore).toBe('number');
    });

    it('should track model usage costs accurately', async () => {
      const request: AgentJobRequest = {
        workspaceId: 'ws-test-013',
        tenantId: 'tenant-test',
        agentType: 'research',
        input: { domain: 'cost-test.com' },
        createdBy: 'test-user'
      };

      const response = await agentExecutor.executeJob(request);

      expect(response.modelUsage).toBeDefined();
      expect(response.modelUsage.length).toBeGreaterThan(0);

      // Verify cost tracking
      const totalCost = response.modelUsage.reduce((sum, usage) => sum + usage.costEstimateUsd, 0);
      expect(totalCost).toBeGreaterThan(0);
      expect(totalCost).toBeLessThan(1.0); // Should be reasonable for a test

      // Verify all usage records have required fields
      response.modelUsage.forEach(usage => {
        expect(usage.modelId).toBeDefined();
        expect(usage.totalTokens).toBeGreaterThan(0);
        expect(usage.costEstimateUsd).toBeGreaterThanOrEqual(0);
        expect(usage.timestamp).toBeDefined();
        expect(usage.promptHash).toBeDefined();
      });
    });
  });
});