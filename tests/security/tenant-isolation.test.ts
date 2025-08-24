/**
 * Evil Tenant Security Tests - Row Level Security (RLS) Validation
 * 
 * These tests attempt malicious cross-tenant data access to validate
 * that RLS policies properly prevent data leakage between tenants.
 * 
 * CRITICAL: All tests in this file MUST FAIL if RLS is not properly configured.
 * If any test passes, it indicates a severe security vulnerability.
 */

import { PrismaClient } from '../../services/shared/database/generated/client';
import { 
  createPrismaClient, 
  setTenantContext, 
  clearTenantContext,
  withTenantContext,
  validateRLSConfiguration,
  getCurrentTenantContext
} from '../../services/shared/database/client';

describe('Evil Tenant Security Tests - RLS Validation', () => {
  let prisma: PrismaClient;
  
  // Test tenant identifiers
  const TENANT_A = 'tenant_a_evil_test';
  const TENANT_B = 'tenant_b_evil_test';
  const EVIL_TENANT = 'evil_tenant_attacker';
  
  // Test workspace identifiers
  const WORKSPACE_A = 'workspace_a_secret';
  const WORKSPACE_B = 'workspace_b_confidential';
  const WORKSPACE_EVIL = 'workspace_evil_attempt';

  beforeAll(async () => {
    prisma = createPrismaClient();
    
    // Validate RLS is properly configured before running tests
    const rlsStatus = await validateRLSConfiguration();
    if (!rlsStatus.isConfigured) {
      throw new Error(`RLS not properly configured: ${rlsStatus.errors?.join(', ')}`);
    }
    
    console.log('✅ RLS Configuration validated before evil tenant tests');
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test data for each tenant
    await setupTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupTestData();
  });

  describe('🔴 CRITICAL: Cross-Tenant Workspace Access Prevention', () => {
    it('should PREVENT evil tenant from reading other tenant workspaces', async () => {
      // Set context as evil tenant
      await setTenantContext(prisma, EVIL_TENANT);
      
      // Attempt to read workspaces - should return empty results due to RLS
      const workspaces = await prisma.workspace.findMany();
      
      // CRITICAL: Must be empty - no cross-tenant access allowed
      expect(workspaces).toHaveLength(0);
      
      // Verify tenant context is set correctly
      const currentTenant = await getCurrentTenantContext(prisma);
      expect(currentTenant).toBe(EVIL_TENANT);
    });

    it('should PREVENT direct SQL injection attempts to bypass RLS', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      // Attempt various SQL injection patterns that try to bypass RLS
      const maliciousQueries = [
        // Attempt to reset tenant context
        `'; SELECT set_config('app.current_tenant_id', '${TENANT_A}', true); SELECT * FROM workspaces WHERE '1'='1`,
        // Attempt to access without tenant filter
        `' OR tenant_id IS NOT NULL OR '1'='1`,
        // Attempt to use UNION to access other data
        `' UNION SELECT workspace_id, '${EVIL_TENANT}' as tenant_id, created_by, created_at, lifecycle, contract_version, goals, primary_channels, budget, approval_policy, risk_profile, data_retention, ttl_hours, policy_bundle_ref, policy_bundle_checksum, contract_data FROM workspaces WHERE '1'='1`
      ];

      for (const maliciousInput of maliciousQueries) {
        try {
          // This should either fail or return empty results due to RLS
          const result = await prisma.$queryRawUnsafe(`
            SELECT * FROM workspaces WHERE workspace_id = '${maliciousInput}'
          `);
          
          // If query succeeds, it must return empty results
          expect(Array.isArray(result) ? result : [result]).toHaveLength(0);
        } catch (error) {
          // SQL injection attempts should fail - this is acceptable
          expect(error).toBeDefined();
        }
      }
    });

    it('should PREVENT workspace access with forged tenant context', async () => {
      // Legitimate tenant A creates workspace
      await withTenantContext(TENANT_A, async (client) => {
        const workspace = await client.workspace.findFirst({
          where: { workspace_id: WORKSPACE_A }
        });
        expect(workspace).toBeDefined();
        expect(workspace?.tenant_id).toBe(TENANT_A);
      });

      // Evil tenant attempts to access with different approaches
      await setTenantContext(prisma, EVIL_TENANT);
      
      // Attempt 1: Direct workspace access
      const directAccess = await prisma.workspace.findFirst({
        where: { workspace_id: WORKSPACE_A }
      });
      expect(directAccess).toBeNull();

      // Attempt 2: Try to access via workspace_runs
      const runAccess = await prisma.workspaceRun.findMany({
        where: { workspace_id: WORKSPACE_A }
      });
      expect(runAccess).toHaveLength(0);

      // Attempt 3: Try to access via related tables
      const auditAccess = await prisma.auditBundle.findMany({
        where: { workspace_id: WORKSPACE_A }
      });
      expect(auditAccess).toHaveLength(0);
    });
  });

  describe('🔴 CRITICAL: Cross-Tenant Data Modification Prevention', () => {
    it('should PREVENT evil tenant from updating other tenant workspaces', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      // Attempt to update workspace from another tenant
      try {
        const updateResult = await prisma.workspace.updateMany({
          where: { workspace_id: WORKSPACE_A },
          data: { 
            lifecycle: 'compromised',
            goals: { hacked: 'by_evil_tenant' }
          }
        });
        
        // Update should affect 0 rows due to RLS
        expect(updateResult.count).toBe(0);
      } catch (error) {
        // Update might fail entirely - this is acceptable
        expect(error).toBeDefined();
      }

      // Verify original data is unchanged
      await withTenantContext(TENANT_A, async (client) => {
        const workspace = await client.workspace.findFirst({
          where: { workspace_id: WORKSPACE_A }
        });
        expect(workspace?.lifecycle).not.toBe('compromised');
        expect(workspace?.goals).not.toHaveProperty('hacked');
      });
    });

    it('should PREVENT evil tenant from deleting other tenant data', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      // Attempt to delete workspace from another tenant
      const deleteResult = await prisma.workspace.deleteMany({
        where: { workspace_id: WORKSPACE_A }
      });
      
      // Delete should affect 0 rows due to RLS
      expect(deleteResult.count).toBe(0);

      // Verify data still exists
      await withTenantContext(TENANT_A, async (client) => {
        const workspace = await client.workspace.findFirst({
          where: { workspace_id: WORKSPACE_A }
        });
        expect(workspace).toBeDefined();
      });
    });

    it('should PREVENT evil tenant from inserting data with forged tenant_id', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      // Attempt to create workspace with different tenant_id
      try {
        await prisma.workspace.create({
          data: {
            workspace_id: 'evil_forged_workspace',
            tenant_id: TENANT_A, // Attempting to forge tenant_id
            created_by: 'evil_user',
            created_at: new Date(),
            lifecycle: 'active',
            contract_version: '1.0.0',
            goals: { malicious: 'data injection' },
            primary_channels: { channels: ['fake'] },
            budget: { total_usd: 0 },
            approval_policy: { requires_approval: false },
            risk_profile: 'high',
            data_retention: { logs_days: 1 },
            ttl_hours: 1,
            policy_bundle_ref: 'evil',
            policy_bundle_checksum: 'fake',
            contract_data: { forged: true }
          }
        });
        
        // Should not reach here - creation should fail
        fail('Evil tenant should not be able to create workspace with forged tenant_id');
      } catch (error) {
        // Creation should fail due to RLS policies
        expect(error).toBeDefined();
      }

      // Verify no malicious data was created in legitimate tenant
      await withTenantContext(TENANT_A, async (client) => {
        const maliciousWorkspace = await client.workspace.findFirst({
          where: { workspace_id: 'evil_forged_workspace' }
        });
        expect(maliciousWorkspace).toBeNull();
      });
    });
  });

  describe('🔴 CRITICAL: Related Table Access Prevention', () => {
    it('should PREVENT cross-tenant access via workspace_runs', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const runs = await prisma.workspaceRun.findMany();
      expect(runs).toHaveLength(0);
    });

    it('should PREVENT cross-tenant access via audit_bundles', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const bundles = await prisma.auditBundle.findMany();
      expect(bundles).toHaveLength(0);
    });

    it('should PREVENT cross-tenant access via connectors', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const connectors = await prisma.connector.findMany();
      expect(connectors).toHaveLength(0);
    });

    it('should PREVENT cross-tenant access via consent_records', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const consents = await prisma.consentRecord.findMany();
      expect(consents).toHaveLength(0);
    });

    it('should PREVENT cross-tenant access via brand_twins', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const brands = await prisma.brandTwin.findMany();
      expect(brands).toHaveLength(0);
    });

    it('should PREVENT cross-tenant access via decision_cards', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const decisions = await prisma.decisionCard.findMany();
      expect(decisions).toHaveLength(0);
    });

    it('should PREVENT cross-tenant access via simulation_results', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const simulations = await prisma.simulationResult.findMany();
      expect(simulations).toHaveLength(0);
    });

    it('should PREVENT cross-tenant access via asset_fingerprints', async () => {
      await setTenantContext(prisma, EVIL_TENANT);
      
      const assets = await prisma.assetFingerprint.findMany();
      expect(assets).toHaveLength(0);
    });
  });

  describe('🔴 CRITICAL: Tenant Context Validation', () => {
    it('should FAIL operations when tenant context is not set', async () => {
      // Clear any existing tenant context
      await clearTenantContext(prisma);
      
      try {
        // This should fail because no tenant context is set
        await prisma.workspace.findMany();
        fail('Operations should fail when tenant context is not set');
      } catch (error) {
        // Should fail due to missing tenant context
        expect(error).toBeDefined();
        expect(error.message).toContain('Tenant context not set');
      }
    });

    it('should FAIL operations with empty tenant context', async () => {
      try {
        await setTenantContext(prisma, '');
        fail('Should not allow empty tenant context');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Tenant ID is required');
      }
    });

    it('should correctly isolate data between legitimate tenants', async () => {
      // Tenant A should only see their data
      await withTenantContext(TENANT_A, async (client) => {
        const workspaces = await client.workspace.findMany();
        expect(workspaces).toHaveLength(1);
        expect(workspaces[0].workspace_id).toBe(WORKSPACE_A);
        expect(workspaces[0].tenant_id).toBe(TENANT_A);
      });

      // Tenant B should only see their data
      await withTenantContext(TENANT_B, async (client) => {
        const workspaces = await client.workspace.findMany();
        expect(workspaces).toHaveLength(1);
        expect(workspaces[0].workspace_id).toBe(WORKSPACE_B);
        expect(workspaces[0].tenant_id).toBe(TENANT_B);
      });
    });
  });

  // Helper functions
  async function setupTestData(): Promise<void> {
    // Create workspace for tenant A
    await withTenantContext(TENANT_A, async (client) => {
      await client.workspace.create({
        data: {
          workspace_id: WORKSPACE_A,
          tenant_id: TENANT_A,
          created_by: 'user_a',
          created_at: new Date(),
          lifecycle: 'active',
          contract_version: '1.0.0',
          goals: { secret: 'tenant_a_confidential_data' },
          primary_channels: { channels: ['linkedin'] },
          budget: { total_usd: 1000 },
          approval_policy: { requires_approval: true },
          risk_profile: 'low',
          data_retention: { logs_days: 30 },
          ttl_hours: 168,
          policy_bundle_ref: 'policy_a',
          policy_bundle_checksum: 'sha256:tenant_a_checksum',
          contract_data: { sensitive: 'tenant_a_data' }
        }
      });
    });

    // Create workspace for tenant B
    await withTenantContext(TENANT_B, async (client) => {
      await client.workspace.create({
        data: {
          workspace_id: WORKSPACE_B,
          tenant_id: TENANT_B,
          created_by: 'user_b',
          created_at: new Date(),
          lifecycle: 'active',
          contract_version: '1.0.0',
          goals: { confidential: 'tenant_b_private_information' },
          primary_channels: { channels: ['twitter'] },
          budget: { total_usd: 2000 },
          approval_policy: { requires_approval: true },
          risk_profile: 'medium',
          data_retention: { logs_days: 60 },
          ttl_hours: 168,
          policy_bundle_ref: 'policy_b',
          policy_bundle_checksum: 'sha256:tenant_b_checksum',
          contract_data: { private: 'tenant_b_data' }
        }
      });
    });
  }

  async function cleanupTestData(): Promise<void> {
    // Clean up tenant A data
    try {
      await withTenantContext(TENANT_A, async (client) => {
        await client.workspace.deleteMany({
          where: { tenant_id: TENANT_A }
        });
      });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up tenant B data
    try {
      await withTenantContext(TENANT_B, async (client) => {
        await client.workspace.deleteMany({
          where: { tenant_id: TENANT_B }
        });
      });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up any evil tenant data (should be none due to RLS)
    try {
      await withTenantContext(EVIL_TENANT, async (client) => {
        await client.workspace.deleteMany({
          where: { tenant_id: EVIL_TENANT }
        });
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

/**
 * RLS Performance Impact Tests
 * Ensure RLS policies don't significantly degrade performance
 */
describe('RLS Performance Impact Validation', () => {
  let prisma: PrismaClient;
  const PERF_TENANT = 'performance_test_tenant';

  beforeAll(async () => {
    prisma = createPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should maintain acceptable query performance with RLS enabled', async () => {
    const startTime = Date.now();
    
    await withTenantContext(PERF_TENANT, async (client) => {
      // Perform a typical query
      await client.workspace.findMany({
        take: 100,
        include: {
          workspace_runs: true,
          connectors: true
        }
      });
    });
    
    const queryTime = Date.now() - startTime;
    
    // RLS should add minimal overhead (< 100ms for typical queries)
    expect(queryTime).toBeLessThan(100);
  });
});