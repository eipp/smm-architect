import { describe, it, expect } from '@jest/globals';
import { SimulationService } from '../src/services/simulation-service';
import { WorkspaceContract, SimulationRequest } from '../src/types';

const createWorkspace = (): WorkspaceContract => ({
  workspaceId: 'ws-test-001',
  tenantId: 'tenant-123',
  createdBy: 'user-1',
  createdAt: new Date().toISOString(),
  lifecycle: 'active',
  contractVersion: 'v1.0.0',
  goals: [{ key: 'lead_gen', target: 100, unit: 'leads_per_month' }],
  primaryChannels: ['linkedin'],
  budget: {
    currency: 'USD',
    weeklyCap: 1000,
    hardCap: 5000,
    breakdown: {
      paidAds: 400,
      llmModelSpend: 200,
      rendering: 200,
      thirdPartyServices: 200
    }
  },
  approvalPolicy: {
    autoApproveReadinessThreshold: 0.8,
    canaryInitialPct: 10,
    canaryWatchWindowHours: 48,
    manualApprovalForPaid: false,
    legalManualApproval: false
  },
  riskProfile: 'medium',
  dataRetention: { auditRetentionDays: 365 },
  ttlHours: 24,
  policyBundleRef: 'policy-v1',
  policyBundleChecksum: 'checksum',
  simulationConfig: { iterations: 5, randomSeed: 42, timeoutSeconds: 10 }
});

describe('DecisionCard generation', () => {
  it('produces a sanitized decision card from simulation results', async () => {
    const workspace = createWorkspace();
    const service = new SimulationService();
    const request: SimulationRequest = { targetChannels: ['linkedin'] };

    const response = await service.simulate(workspace, request);
    const card = response.decisionCard;

    expect(card.workspaceId).toBe(workspace.workspaceId);
    expect(card.readiness_score).toBeGreaterThan(0);
    expect(card.primary_action.label).toBeDefined();
    expect(JSON.stringify(card).toLowerCase()).not.toContain('credentials');
  });
});
