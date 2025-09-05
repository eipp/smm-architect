import request from 'supertest';
import axios from 'axios';
import app from '../src/server';
import { MonteCarloEngine } from '../src/services/monte-carlo-engine';
import { WorkspaceContext } from '../src/types';

jest.mock('axios');
jest.mock('../src/config/sentry', () => ({}));

describe('Simulator server workspace fetching', () => {
  const mockWorkspace: WorkspaceContext = {
    workspaceId: 'ws-test',
    goals: [{ key: 'lead_gen', target: 100, unit: 'leads_per_month' }],
    primaryChannels: ['linkedin'],
    budget: {
      currency: 'USD',
      weeklyCap: 1000,
      hardCap: 4000,
      breakdown: { paidAds: 600, llmModelSpend: 200, rendering: 100, thirdPartyServices: 100 }
    },
    approvalPolicy: {
      autoApproveReadinessThreshold: 0.8,
      canaryInitialPct: 0.1,
      canaryWatchWindowHours: 24,
      manualApprovalForPaid: false,
      legalManualApproval: false
    },
    riskProfile: 'medium',
    connectors: [{ platform: 'linkedin', status: 'connected', lastConnectedAt: new Date().toISOString() }]
  };

  const mockResults = {
    readinessScore: { mean: 0.9, confidence: { lower: 0.8, upper: 1, level: 0.95 } },
    policyPassPct: { mean: 0.95 },
    citationCoverage: { mean: 0.9 },
    duplicationRisk: { mean: 0.1 },
    costEstimate: { mean: 100 },
    technicalReadiness: { mean: 0.85 },
    convergenceMetrics: { converged: true, requiredIterations: 1, stabilityThreshold: 0.001 }
  } as any;

  beforeEach(() => {
    jest.spyOn(MonteCarloEngine.prototype, 'runSimulation').mockResolvedValue(mockResults);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 404 when workspace is missing', async () => {
    (axios.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });

    const res = await request(app).post('/simulate').send({ workspaceId: 'missing', workflowJson: {} });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('WORKSPACE_NOT_FOUND');
  });

  it('returns simulation result when workspace exists', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockWorkspace });

    const res = await request(app)
      .post('/simulate')
      .send({ workspaceId: 'ws-test', workflowJson: {}, iterations: 1, randomSeed: 42, timeoutSeconds: 10 });

    expect(res.status).toBe(200);
    expect(res.body.readinessScore).toBe(mockResults.readinessScore.mean);
  });
});
