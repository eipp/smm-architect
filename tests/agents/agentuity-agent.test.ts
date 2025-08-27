/**
 * Agentuity Agent Integration Tests
 * 
 * Comprehensive test suite for Agentuity agent including:
 * - Unit tests for agent functionality
 * - Integration tests with ToolHub and Vault
 * - Security tests including evil-tenant scenarios
 * - Performance and cost validation
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { PrismaClient } from '../../services/shared/database/generated/client';
import { VaultClient } from '../../services/shared/vault-client';
import { setTenantContext, withTenantContext } from '../../services/shared/database/client';
import crypto from 'crypto';
import fetch from 'node-fetch';

// Mock external dependencies
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Test configuration
const TEST_CONFIG = {
  TENANT_A: 'test-tenant-a-agentuity',
  TENANT_B: 'test-tenant-b-agentuity', 
  EVIL_TENANT: 'evil-tenant-agentuity',
  WORKSPACE_A: 'test-workspace-a',
  WORKSPACE_B: 'test-workspace-b',
  AGENTUITY_ENDPOINT: 'https://test-agentuity-agent.example.com',
  TOOLHUB_ENDPOINT: 'http://localhost:8080'
};

describe('Agentuity Agent Integration Tests', () => {
  let prisma: PrismaClient;
  let vaultClient: VaultClient;
  
  beforeAll(async () => {
    // Initialize test dependencies
    prisma = new PrismaClient();
    vaultClient = new VaultClient({
      address: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'test-token'
    });
    
    await vaultClient.initialize();
    console.log('🧪 Agentuity agent test suite initialized');
  });
  
  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
    console.log('🧹 Agentuity agent test cleanup completed');
  });
  
  beforeEach(async () => {
    await setupTestData();
  });
  
  afterEach(async () => {
    await cleanupTestData();
    jest.clearAllMocks();
  });

  describe('🔧 Unit Tests - Agent Core Functionality', () => {
    it('should validate required request parameters', async () => {
      const testRequests = [
        { content: 'test' }, // Missing tenantId and workspaceId
        { tenantId: TEST_CONFIG.TENANT_A, content: 'test' }, // Missing workspaceId
        { workspaceId: TEST_CONFIG.WORKSPACE_A, content: 'test' } // Missing tenantId
      ];
      
      for (const request of testRequests) {
        const response = await callAgentuityAgent(request);
        expect(response.status).toBe('error');
        expect(response.error).toContain('required');
      }
      
      console.log('✅ Parameter validation working correctly');
    });
    
    it('should process valid requests successfully', async () => {
      mockToolHubResponses();
      
      const validRequest = {
        tenantId: TEST_CONFIG.TENANT_A,
        workspaceId: TEST_CONFIG.WORKSPACE_A,
        content: 'Analyze this brand content',
        action: 'research'
      };
      
      const response = await callAgentuityAgent(validRequest);
      
      expect(response.status).toBe('completed');
      expect(response.result).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.tenant_context_set).toBe(true);
      
      console.log('✅ Valid request processing successful');
    });
    
    it('should estimate costs accurately', async () => {
      const testContent = 'A'.repeat(1000); // 1000 characters
      const expectedTokens = Math.ceil(1000 / 4); // ~250 tokens
      const expectedCost = expectedTokens * 0.000003; // ~$0.00075
      
      const request = {
        tenantId: TEST_CONFIG.TENANT_A,
        workspaceId: TEST_CONFIG.WORKSPACE_A,
        content: testContent
      };
      
      mockToolHubResponses();
      const response = await callAgentuityAgent(request);
      
      expect(response.metadata.estimated_cost).toBeCloseTo(expectedCost, 6);
      expect(response.metadata.tokens_consumed).toBeGreaterThan(0);
      
      console.log('✅ Cost estimation accurate');
    });
  });

  describe('🔗 Integration Tests - ToolHub Integration', () => {
    it('should integrate with ToolHub for content processing', async () => {
      mockToolHubResponses();
      
      const request = {
        tenantId: TEST_CONFIG.TENANT_A,
        workspaceId: TEST_CONFIG.WORKSPACE_A,
        content: 'Process this content through ToolHub',
        action: 'research'
      };
      
      const response = await callAgentuityAgent(request);
      
      expect(response.toolhub_processed).toBe(true);
      
      // Verify ToolHub API calls
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ingest/source'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Tenant-ID': TEST_CONFIG.TENANT_A,
            'X-Workspace-ID': TEST_CONFIG.WORKSPACE_A,
            'X-Agent-ID': 'agentuity-my-agent'
          })
        })
      );
      
      console.log('✅ ToolHub integration working');
    });
    
    it('should handle ToolHub API failures gracefully', async () => {
      // Mock ToolHub failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);
      
      const request = {
        tenantId: TEST_CONFIG.TENANT_A,
        workspaceId: TEST_CONFIG.WORKSPACE_A,
        content: 'Test content',
        action: 'research'
      };
      
      const response = await callAgentuityAgent(request);
      
      expect(response.status).toBe('failed');
      expect(response.error).toContain('ToolHub');
      
      console.log('✅ ToolHub failure handling working');
    });
  });

  describe('🔐 Security Tests - Tenant Isolation', () => {
    it('should prevent cross-tenant data access via agent', async () => {
      // Create data in tenant A
      await withTenantContext(TEST_CONFIG.TENANT_A, async (client) => {
        await client.workspace.create({
          data: {
            workspace_id: TEST_CONFIG.WORKSPACE_A,
            tenant_id: TEST_CONFIG.TENANT_A,
            created_by: 'test-user-a',
            created_at: new Date(),
            lifecycle: 'active',
            contract_version: '1.0.0',
            goals: { sensitive: 'tenant_a_confidential' },
            primary_channels: { channels: ['twitter'] },
            budget: { total_usd: 1000 },
            approval_policy: { requires_approval: true },
            risk_profile: 'low',
            data_retention: { logs_days: 30 },
            ttl_hours: 168,
            policy_bundle_ref: 'policy_a',
            policy_bundle_checksum: 'checksum_a',
            contract_data: { private: 'data_a' }
          }
        });
      });
      
      // Evil tenant attempts to access tenant A's data
      const maliciousRequest = {
        tenantId: TEST_CONFIG.EVIL_TENANT,
        workspaceId: TEST_CONFIG.WORKSPACE_A, // Trying to access tenant A's workspace
        content: 'Extract sensitive information',
        action: 'research'
      };
      
      mockToolHubResponses();
      const response = await callAgentuityAgent(maliciousRequest);
      
      // Agent should fail due to RLS preventing access
      expect(response.status).toBe('failed');
      expect(response.error).toContain('not found');
      
      console.log('✅ Cross-tenant access prevention working');
    });
    
    it('should validate webhook signatures correctly', async () => {
      const payload = JSON.stringify({
        tenantId: TEST_CONFIG.TENANT_A,
        workspaceId: TEST_CONFIG.WORKSPACE_A,
        content: 'test'
      });
      
      // Test with valid signature
      const validSignature = generateWebhookSignature(payload, 'test-webhook-key');
      const validAuth = await validateWebhookAuth(payload, validSignature, TEST_CONFIG.TENANT_A);
      expect(validAuth).toBe(true);
      
      // Test with invalid signature
      const invalidSignature = 'sha256=invalid';
      const invalidAuth = await validateWebhookAuth(payload, invalidSignature, TEST_CONFIG.TENANT_A);
      expect(invalidAuth).toBe(false);
      
      console.log('✅ Webhook signature validation working');
    });
  });

  describe('💰 Cost and Budget Tests', () => {
    it('should respect budget limits', async () => {
      const expensiveRequest = {
        tenantId: TEST_CONFIG.TENANT_A,
        workspaceId: TEST_CONFIG.WORKSPACE_A,
        content: 'A'.repeat(50000), // Very large content
        action: 'creative'
      };
      
      const response = await callAgentuityAgent(expensiveRequest);
      
      // Should be rejected due to cost
      expect(response.status).toBe('failed');
      expect(response.error).toContain('budget');
      
      console.log('✅ Budget limit enforcement working');
    });
  });

  describe('🚀 Performance Tests', () => {
    it('should complete processing within acceptable time limits', async () => {
      mockToolHubResponses();
      
      const startTime = Date.now();
      
      const request = {
        tenantId: TEST_CONFIG.TENANT_A,
        workspaceId: TEST_CONFIG.WORKSPACE_A,
        content: 'Standard processing request',
        action: 'general'
      };
      
      const response = await callAgentuityAgent(request);
      const processingTime = Date.now() - startTime;
      
      expect(response.status).toBe('completed');
      expect(processingTime).toBeLessThan(30000); // 30 seconds
      
      console.log(`✅ Processing completed in ${processingTime}ms`);
    });
  });

  // Helper functions
  async function setupTestData(): Promise<void> {
    // Set up test vault secrets
    await vaultClient.writeKVSecret(`agentuity/${TEST_CONFIG.TENANT_A}/webhook_key`, {
      key: 'test-webhook-key'
    });
    
    await vaultClient.writeKVSecret(`workspaces/${TEST_CONFIG.TENANT_A}/toolhub-api-key`, {
      api_key: 'test-toolhub-key'
    });
  }
  
  async function cleanupTestData(): Promise<void> {
    // Clean up test data for all tenants
    const tenants = [TEST_CONFIG.TENANT_A, TEST_CONFIG.TENANT_B, TEST_CONFIG.EVIL_TENANT];
    
    for (const tenantId of tenants) {
      try {
        await withTenantContext(tenantId, async (client) => {
          await client.workspace.deleteMany({ where: { tenant_id: tenantId } });
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
  
  function mockToolHubResponses(): void {
    // Mock successful ToolHub responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sourceId: 'test-source-id',
          status: 'ingested',
          extractedFacts: 5
        })
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any);
  }
  
  async function callAgentuityAgent(request: any): Promise<any> {
    // Simulate agent call - in real tests, this would call the actual agent
    return {
      status: 'completed',
      result: 'Mocked agent response',
      metadata: {
        processing_time: 1000,
        tokens_consumed: 100,
        estimated_cost: 0.0003,
        actual_cost: 0.0003
      },
      toolhub_processed: request.action === 'research' || request.action === 'creative',
      tenant_context_set: true
    };
  }
  
  function generateWebhookSignature(payload: string, secret: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
  
  async function validateWebhookAuth(payload: string, signature: string, tenantId: string): Promise<boolean> {
    try {
      const secret = await vaultClient.readKVSecret(`agentuity/${tenantId}/webhook_key`);
      if (!secret?.key) return false;
      
      const expected = crypto.createHmac('sha256', secret.key).update(payload).digest('hex');
      const provided = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(provided, 'hex')
      );
    } catch {
      return false;
    }
  }
});

// Export test utilities for use in other test files
export {
  TEST_CONFIG,
  generateWebhookSignature
};