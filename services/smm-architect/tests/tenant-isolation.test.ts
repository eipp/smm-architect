import { describe, it, expect, beforeEach } from '@jest/globals';

import { WorkspaceService } from '../src/services/workspace-service';
import { setTenantId } from '../../shared/request-context';
import { WorkspaceContract } from '../src/types';

class InMemoryDB {
  private workspaces: Array<{ workspace_id: string; tenant_id: string; contract_data: string }> = [];

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (sql.startsWith('SELECT contract_data FROM workspaces WHERE workspace_id')) {
      return this.workspaces.filter(
        w => w.workspace_id === params[0] && w.tenant_id === params[1]
      );
    }
    if (sql.startsWith('SELECT contract_data FROM workspaces WHERE tenant_id')) {
      return this.workspaces.filter(w => w.tenant_id === params[0]);
    }
    return [];
  }

  async exec(sql: string, params: any[] = []): Promise<void> {
    if (sql.startsWith('INSERT INTO workspaces')) {
      this.workspaces.push({
        workspace_id: params[0],
        tenant_id: params[1],
        contract_data: params[15]
      });
    }
  }
}

function baseContract(tenantId: string): Omit<WorkspaceContract, 'workspaceId' | 'createdAt' | 'lifecycle'> {
  return {
    tenantId,
    createdBy: 'user',
    contractVersion: '1.0',
    goals: [{ key: 'reach', target: 100, unit: 'impressions' }],
    primaryChannels: ['linkedin'],
    budget: {
      currency: 'USD',
      weeklyCap: 1000,
      hardCap: 5000,
      breakdown: { paidAds: 0, llmModelSpend: 0, rendering: 0, thirdPartyServices: 0 }
    },
    approvalPolicy: {
      autoApproveReadinessThreshold: 0.9,
      canaryInitialPct: 0.1,
      canaryWatchWindowHours: 24,
      manualApprovalForPaid: false,
      legalManualApproval: false
    },
    riskProfile: 'low',
    dataRetention: { auditRetentionDays: 30 },
    ttlHours: 24,
    policyBundleRef: 'ref',
    policyBundleChecksum: 'checksum'
  };
}

describe('WorkspaceService tenant isolation', () => {
  let db: InMemoryDB;
  let service: WorkspaceService;

  beforeEach(() => {
    db = new InMemoryDB();
    service = new WorkspaceService(db as any);
  });

  it('returns workspaces for current tenant only', async () => {
    setTenantId('tenantA');
    await service.createWorkspace(baseContract('tenantA'));
    setTenantId('tenantB');
    await service.createWorkspace(baseContract('tenantB'));

    setTenantId('tenantA');
    const listA = await service.listWorkspaces();
    expect(listA).toHaveLength(1);
    expect(listA[0].tenantId).toBe('tenantA');

    setTenantId('tenantB');
    const listB = await service.listWorkspaces();
    expect(listB).toHaveLength(1);
    expect(listB[0].tenantId).toBe('tenantB');
  });

  it('prevents cross-tenant workspace access', async () => {
    setTenantId('tenantA');
    const wsA = await service.createWorkspace(baseContract('tenantA'));
    setTenantId('tenantB');
    const wsB = await service.createWorkspace(baseContract('tenantB'));

    setTenantId('tenantA');
    const fetchedB = await service.getWorkspace(wsB.workspaceId);
    expect(fetchedB).toBeNull();
  });
});
