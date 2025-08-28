/**
 * Evil Tenant Write Operation Security Tests
 * 
 * These tests validate that RLS policies prevent malicious write operations
 * including INSERT and UPDATE with mismatched tenant_id values.
 * 
 * CRITICAL: All tests MUST FAIL if RLS is not properly configured.
 * If any malicious write succeeds, it indicates a severe security vulnerability.
 */

import { PrismaClient } from '../../services/shared/database/generated/client';
import { 
  createPrismaClient, 
  withTenantContext,
  validateRLSConfiguration,
  getCurrentTenantContext
} from '../../services/shared/database/client';

describe('Evil Tenant Write Operation Security Tests', () => {
  let prisma: PrismaClient;
  
  // Test tenant identifiers
  const LEGITIMATE_TENANT = 'legitimate_tenant_test';
  const EVIL_TENANT = 'evil_tenant_attacker';
  const TARGET_WORKSPACE_ID = 'target_workspace_secret';
  const MALICIOUS_WORKSPACE_ID = 'malicious_workspace_injection';

  beforeAll(async () => {
    prisma = createPrismaClient();
    
    // Validate RLS is properly configured before running tests
    const rlsStatus = await validateRLSConfiguration();
    if (!rlsStatus.isConfigured) {
      throw new Error(`RLS not properly configured: ${rlsStatus.errors?.join(', ')}`);
    }

    // Setup legitimate data
    await setupLegitimateData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Malicious INSERT Operations', () => {
    it('should PREVENT evil tenant from inserting workspace with wrong tenant_id', async () => {
      await withTenantContext(EVIL_TENANT, async (client) => {
        // Attempt to insert workspace with different tenant_id
        try {
          await client.workspace.create({
            data: {
              workspace_id: MALICIOUS_WORKSPACE_ID,
              tenant_id: LEGITIMATE_TENANT, // Trying to inject into different tenant
              created_by: 'evil_user',
              created_at: new Date(),
              lifecycle: 'active',
              contract_version: '1.0.0',
              goals: { malicious: 'injected data' },
              primary_channels: { channels: ['twitter'] },
              budget: { total_usd: 999999 },
              approval_policy: { requires_approval: false },
              risk_profile: 'high',
              data_retention: { logs_days: 1 },
              ttl_hours: 1,
              policy_bundle_ref: 'evil_policy',
              policy_bundle_checksum: 'evil_checksum',
              contract_data: { evil: true }
            }
          });
          
          // If we reach here, RLS failed to prevent the malicious insert
          throw new Error('RLS SECURITY FAILURE: Malicious insert succeeded');
        } catch (error) {
          // This should fail due to RLS WITH CHECK constraint
          expect(error).toBeDefined();
          if (error instanceof Error) {
            // Expect RLS policy violation or similar error
            expect(error.message).toMatch(/policy|constraint|check|permission/i);
          }
        }
      });

      // Verify malicious data was NOT inserted
      await withTenantContext(LEGITIMATE_TENANT, async (client) => {
        const maliciousWorkspace = await client.workspace.findFirst({
          where: { workspace_id: MALICIOUS_WORKSPACE_ID }
        });
        expect(maliciousWorkspace).toBeNull();
      });
    });

    it('should PREVENT evil tenant from inserting simulation report with wrong tenant_id', async () => {
      await withTenantContext(EVIL_TENANT, async (client) => {
        try {
          await client.simulationReport.create({
            data: {
              simulationId: 'evil_simulation_injection',
              workspaceId: TARGET_WORKSPACE_ID,
              tenantId: LEGITIMATE_TENANT, // Malicious tenant injection
              iterations: 1000,
              randomSeed: 12345,
              rngLibraryVersion: '1.0.0',
              nodejsVersion: '18.0.0',
              readinessScore: 0.95,
              policyPassPct: 1.0,
              citationCoverage: 1.0,
              duplicationRisk: 0.0,
              costEstimateUsd: 100.00,
              technicalReadiness: 1.0,
              startedAt: new Date(),
              completedAt: new Date(),
              durationMs: 5000,
              workspaceContext: { injected: 'malicious data' },
              workflowManifest: { evil: 'workflow' },
              simulationConfig: { malicious: true },
              createdBy: 'evil_user'
            }
          });
          
          throw new Error('RLS SECURITY FAILURE: Malicious simulation report insert succeeded');
        } catch (error) {
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toMatch(/policy|constraint|check|permission/i);
          }
        }
      });
    });

    it('should PREVENT evil tenant from inserting agent run with wrong tenant_id', async () => {
      await withTenantContext(EVIL_TENANT, async (client) => {
        try {
          await client.agentRun.create({
            data: {
              jobId: 'evil_agent_job_injection',
              workspaceId: TARGET_WORKSPACE_ID,
              tenantId: LEGITIMATE_TENANT, // Malicious tenant injection
              agentType: 'research',
              agentVersion: '1.0.0',
              status: 'completed',
              inputData: { malicious: 'injected input' },
              outputData: { evil: 'output data' },
              createdBy: 'evil_user'
            }
          });
          
          throw new Error('RLS SECURITY FAILURE: Malicious agent run insert succeeded');
        } catch (error) {
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toMatch(/policy|constraint|check|permission/i);
          }
        }
      });
    });
  });

  describe('Malicious UPDATE Operations', () => {
    it('should PREVENT evil tenant from updating workspace to wrong tenant_id', async () => {
      await withTenantContext(EVIL_TENANT, async (client) => {
        try {
          // Attempt to update workspace to change tenant_id
          const updateResult = await client.workspace.updateMany({
            where: { workspace_id: TARGET_WORKSPACE_ID },
            data: {
              tenant_id: EVIL_TENANT, // Trying to steal workspace
              goals: { compromised: 'by evil tenant' }
            }
          });
          
          // Should update 0 rows due to RLS
          expect(updateResult.count).toBe(0);
        } catch (error) {
          // Update may fail entirely due to RLS - this is acceptable
          expect(error).toBeDefined();
        }
      });

      // Verify original data is unchanged
      await withTenantContext(LEGITIMATE_TENANT, async (client) => {
        const workspace = await client.workspace.findFirst({
          where: { workspace_id: TARGET_WORKSPACE_ID }
        });
        expect(workspace?.tenant_id).toBe(LEGITIMATE_TENANT);
        expect(workspace?.goals).not.toHaveProperty('compromised');
      });
    });

    it('should PREVENT cross-tenant UPDATE via workspace_id manipulation', async () => {
      // Create evil tenant's workspace first
      await withTenantContext(EVIL_TENANT, async (client) => {
        await client.workspace.create({
          data: {
            workspace_id: 'evil_tenant_workspace',
            tenant_id: EVIL_TENANT,
            created_by: 'evil_user',
            created_at: new Date(),
            lifecycle: 'active',
            contract_version: '1.0.0',
            goals: { test: 'evil workspace' },
            primary_channels: { channels: ['twitter'] },
            budget: { total_usd: 1000 },
            approval_policy: { requires_approval: false },
            risk_profile: 'low',
            data_retention: { logs_days: 30 },
            ttl_hours: 168,
            policy_bundle_ref: 'evil_policy',
            policy_bundle_checksum: 'evil_checksum',
            contract_data: { evil: true }
          }
        });
      });

      // Now try to create audit bundle pointing to legitimate tenant's workspace
      await withTenantContext(EVIL_TENANT, async (client) => {
        try {
          await client.auditBundle.create({
            data: {
              bundle_id: 'evil_audit_bundle',
              workspace_id: TARGET_WORKSPACE_ID, // Pointing to legitimate tenant's workspace
              bundle_hash: 'evil_hash',
              bundle_data: { malicious: 'audit data' },
              created_by: 'evil_user',
              created_at: new Date()
            }
          });
          
          throw new Error('RLS SECURITY FAILURE: Cross-tenant audit bundle creation succeeded');
        } catch (error) {
          // This should fail due to RLS policy on audit_bundles
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toMatch(/policy|constraint|check|permission|not found/i);
          }
        }
      });
    });
  });

  describe('Batch Operation Security', () => {
    it('should PREVENT evil tenant from batch inserting with mixed tenant_ids', async () => {
      await withTenantContext(EVIL_TENANT, async (client) => {
        try {
          // Attempt batch insert with different tenant_ids
          await client.workspace.createMany({
            data: [
              {
                workspace_id: 'batch_evil_1',
                tenant_id: EVIL_TENANT, // Correct tenant
                created_by: 'evil_user',
                created_at: new Date(),
                lifecycle: 'active',
                contract_version: '1.0.0',
                goals: {},
                primary_channels: {},
                budget: {},
                approval_policy: {},
                risk_profile: 'low',
                data_retention: {},
                ttl_hours: 168,
                policy_bundle_ref: 'test',
                policy_bundle_checksum: 'test',
                contract_data: {}
              },
              {
                workspace_id: 'batch_evil_2',
                tenant_id: LEGITIMATE_TENANT, // Wrong tenant - should fail
                created_by: 'evil_user',
                created_at: new Date(),
                lifecycle: 'active',
                contract_version: '1.0.0',
                goals: {},
                primary_channels: {},
                budget: {},
                approval_policy: {},
                risk_profile: 'low',
                data_retention: {},
                ttl_hours: 168,
                policy_bundle_ref: 'test',
                policy_bundle_checksum: 'test',
                contract_data: {}
              }
            ]
          });
          
          throw new Error('RLS SECURITY FAILURE: Batch insert with mixed tenant_ids succeeded');
        } catch (error) {
          // Entire batch should fail due to RLS WITH CHECK constraint
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toMatch(/policy|constraint|check|permission/i);
          }
        }
      });

      // Verify no malicious data was inserted
      await withTenantContext(LEGITIMATE_TENANT, async (client) => {
        const maliciousWorkspace = await client.workspace.findFirst({
          where: { workspace_id: 'batch_evil_2' }
        });
        expect(maliciousWorkspace).toBeNull();
      });
    });
  });

  describe('Transaction Security', () => {
    it('should PREVENT evil tenant from committing transaction with wrong tenant_id', async () => {
      await withTenantContext(EVIL_TENANT, async (client) => {
        try {
          await client.$transaction(async (tx) => {
            // First operation - valid for evil tenant
            await tx.workspace.create({
              data: {
                workspace_id: 'transaction_test_1',
                tenant_id: EVIL_TENANT,
                created_by: 'evil_user',
                created_at: new Date(),
                lifecycle: 'active',
                contract_version: '1.0.0',
                goals: {},
                primary_channels: {},
                budget: {},
                approval_policy: {},
                risk_profile: 'low',
                data_retention: {},
                ttl_hours: 168,
                policy_bundle_ref: 'test',
                policy_bundle_checksum: 'test',
                contract_data: {}
              }
            });

            // Second operation - malicious tenant injection
            await tx.workspace.create({
              data: {
                workspace_id: 'transaction_test_2',
                tenant_id: LEGITIMATE_TENANT, // Wrong tenant - should fail entire transaction
                created_by: 'evil_user',
                created_at: new Date(),
                lifecycle: 'active',
                contract_version: '1.0.0',
                goals: {},
                primary_channels: {},
                budget: {},
                approval_policy: {},
                risk_profile: 'low',
                data_retention: {},
                ttl_hours: 168,
                policy_bundle_ref: 'test',
                policy_bundle_checksum: 'test',
                contract_data: {}
              }
            });
          });
          
          throw new Error('RLS SECURITY FAILURE: Transaction with malicious tenant_id succeeded');
        } catch (error) {
          // Entire transaction should fail and rollback
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toMatch(/policy|constraint|check|permission/i);
          }
        }
      });

      // Verify entire transaction was rolled back - no data should exist
      await withTenantContext(EVIL_TENANT, async (client) => {
        const workspace1 = await client.workspace.findFirst({
          where: { workspace_id: 'transaction_test_1' }
        });
        expect(workspace1).toBeNull(); // Should be rolled back
      });

      await withTenantContext(LEGITIMATE_TENANT, async (client) => {
        const workspace2 = await client.workspace.findFirst({
          where: { workspace_id: 'transaction_test_2' }
        });
        expect(workspace2).toBeNull(); // Should never have been inserted
      });
    });
  });

  // Helper functions
  async function setupLegitimateData(): Promise<void> {
    await withTenantContext(LEGITIMATE_TENANT, async (client) => {
      await client.workspace.create({
        data: {
          workspace_id: TARGET_WORKSPACE_ID,
          tenant_id: LEGITIMATE_TENANT,
          created_by: 'legitimate_user',
          created_at: new Date(),
          lifecycle: 'active',
          contract_version: '1.0.0',
          goals: { legitimate: 'business data' },
          primary_channels: { channels: ['linkedin'] },
          budget: { total_usd: 5000 },
          approval_policy: { requires_approval: true },
          risk_profile: 'low',
          data_retention: { logs_days: 90 },
          ttl_hours: 720,
          policy_bundle_ref: 'legitimate_policy',
          policy_bundle_checksum: 'legitimate_checksum',
          contract_data: { legitimate: true }
        }
      });
    });
  }

  async function cleanupTestData(): Promise<void> {
    const tenants = [LEGITIMATE_TENANT, EVIL_TENANT];
    
    for (const tenantId of tenants) {
      try {
        await withTenantContext(tenantId, async (client) => {
          // Clean up in reverse dependency order
          await client.agentRun.deleteMany({ where: { tenantId } });
          await client.simulationReport.deleteMany({ where: { tenantId } });
          await client.auditBundle.deleteMany({ where: {} });
          await client.workspace.deleteMany({ where: { tenantId } });
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
});