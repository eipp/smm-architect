import { describe, it, expect } from '@jest/globals';
import { WorkspaceService } from '../src/services/workspace-service';
import { WorkspaceContract } from '../src/types';

class InMemorySQLDatabase {
  private workspaces: any[] = [];

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (sql.includes('WHERE workspace_id = ? AND tenant_id = ?')) {
      const [workspaceId, tenantId] = params;
      const row = this.workspaces.find(
        w => w.workspace_id === workspaceId && w.tenant_id === tenantId
      );
      return row ? [{ contract_data: row.contract_data }] : [];
    }
    if (sql.includes('WHERE tenant_id = ?')) {
      const [tenantId] = params;
      return this.workspaces
        .filter(w => w.tenant_id === tenantId)
        .map(w => ({ contract_data: w.contract_data }));
    }
    return [];
  }

  async exec(sql: string, params: any[] = []): Promise<void> {
    if (sql.startsWith('INSERT INTO workspaces')) {
      const [workspace_id, tenant_id, created_by, created_at, lifecycle,
        contract_version, goals, primary_channels, budget, approval_policy,
        risk_profile, data_retention, ttl_hours, policy_bundle_ref,
        policy_bundle_checksum, contract_data] = params;
      this.workspaces.push({
        workspace_id,
        tenant_id,
        created_by,
        created_at,
        lifecycle,
        contract_version,
        goals,
        primary_channels,
        budget,
        approval_policy,
        risk_profile,
        data_retention,
        ttl_hours,
        policy_bundle_ref,
        policy_bundle_checksum,
        contract_data
      });
    } else if (sql.startsWith('UPDATE workspaces')) {
      const [contract_data, updated_at, workspace_id, tenant_id] = params;
      const ws = this.workspaces.find(
        w => w.workspace_id === workspace_id && w.tenant_id === tenant_id
      );
      if (ws) {
        ws.contract_data = contract_data;
        ws.updated_at = updated_at;
      }
    }
  }
}

describe('tenant security', () => {
  it('prevents cross-tenant workspace access (security)', async () => {
    const db = new InMemorySQLDatabase();
    const service = new WorkspaceService(db as any);

    const contract: Omit<WorkspaceContract, 'workspaceId' | 'createdAt' | 'lifecycle'> = {
      tenantId: 'tenant-a',
      createdBy: 'user@example.com',
      contractVersion: 'v1',
      goals: [],
      primaryChannels: [],
      budget: { currency: 'USD', weeklyCap: 0, hardCap: 0, breakdown: { paidAds: 0, llmModelSpend: 0, rendering: 0, thirdPartyServices: 0 } },
      approvalPolicy: { autoApproveReadinessThreshold: 0.8, canaryInitialPct: 0.1, canaryWatchWindowHours: 1, manualApprovalForPaid: false, legalManualApproval: false },
      riskProfile: 'low',
      dataRetention: { auditRetentionDays: 30 },
      ttlHours: 1,
      policyBundleRef: 'ref',
      policyBundleChecksum: 'sum'
    };

    const created = await service.createWorkspace(contract);

    const fetchedSameTenant = await service.getWorkspace(created.workspaceId, 'tenant-a');
    expect(fetchedSameTenant?.workspaceId).toBe(created.workspaceId);

    const fetchedOtherTenant = await service.getWorkspace(created.workspaceId, 'tenant-b');
    expect(fetchedOtherTenant).toBeNull();

    const listOtherTenant = await service.listWorkspaces('tenant-b');
    expect(listOtherTenant.length).toBe(0);
  });
});
