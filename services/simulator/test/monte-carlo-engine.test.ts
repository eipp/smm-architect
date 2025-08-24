import { MonteCarloEngine } from '../src/services/monte-carlo-engine';
import { SimulationConfig, WorkspaceContext, WorkflowNode, SimulationRequest } from '../src/types';

describe('MonteCarloEngine - Deterministic Tests', () => {
  let engine: MonteCarloEngine;
  let mockWorkspace: WorkspaceContext;
  let mockWorkflow: WorkflowNode[];
  let mockRequest: SimulationRequest;

  beforeEach(() => {
    // Use fixed seed for deterministic results
    const config: SimulationConfig = {
      iterations: 100, // Small number for fast tests
      randomSeed: 42,
      timeoutSeconds: 60,
      convergenceThreshold: 0.001,
      confidenceLevel: 0.95,
      enableEarlyTermination: false,
      parallelBatches: 1
    };

    engine = new MonteCarloEngine(config);

    mockWorkspace = {
      workspaceId: 'ws-test-001',
      goals: [
        { key: 'lead_gen', target: 200, unit: 'leads_per_month' }
      ],
      primaryChannels: ['linkedin', 'x'],
      budget: {
        currency: 'USD',
        weeklyCap: 1000,
        hardCap: 4000,
        breakdown: {
          paidAds: 600,
          llmModelSpend: 200,
          rendering: 150,
          thirdPartyServices: 50
        }
      },
      approvalPolicy: {
        autoApproveReadinessThreshold: 0.85,
        canaryInitialPct: 0.05,
        canaryWatchWindowHours: 48,
        manualApprovalForPaid: false,
        legalManualApproval: false
      },
      riskProfile: 'medium'
    };

    mockWorkflow = [
      {
        id: 'research',
        type: 'agent',
        parameters: {},
        dependencies: [],
        estimatedDuration: 1000,
        failureRate: 0.02
      },
      {
        id: 'create_content',
        type: 'agent',
        parameters: {},
        dependencies: ['research'],
        estimatedDuration: 2000,
        failureRate: 0.03
      }
    ];

    mockRequest = {
      workspaceId: 'ws-test-001',
      workflowJson: {},
      dryRun: true,
      iterations: 100,
      randomSeed: 42
    };
  });

  test('should produce identical results with same seed', async () => {
    // Run simulation twice with same seed
    const result1 = await engine.runSimulation(mockWorkspace, mockWorkflow, mockRequest);
    
    // Create new engine with same seed
    const engine2 = new MonteCarloEngine({
      iterations: 100,
      randomSeed: 42,
      timeoutSeconds: 60,
      convergenceThreshold: 0.001,
      confidenceLevel: 0.95,
      enableEarlyTermination: false,
      parallelBatches: 1
    });
    
    const result2 = await engine2.runSimulation(mockWorkspace, mockWorkflow, mockRequest);

    // Results should be identical
    expect(result1.readinessScore.mean).toBeCloseTo(result2.readinessScore.mean, 5);
    expect(result1.policyPassPct.mean).toBeCloseTo(result2.policyPassPct.mean, 5);
    expect(result1.citationCoverage.mean).toBeCloseTo(result2.citationCoverage.mean, 5);
    expect(result1.duplicationRisk.mean).toBeCloseTo(result2.duplicationRisk.mean, 5);
    expect(result1.costEstimate.mean).toBeCloseTo(result2.costEstimate.mean, 5);
    expect(result1.technicalReadiness.mean).toBeCloseTo(result2.technicalReadiness.mean, 5);
  });

  test('should produce different results with different seeds', async () => {
    const result1 = await engine.runSimulation(mockWorkspace, mockWorkflow, mockRequest);
    
    // Create engine with different seed
    const engine2 = new MonteCarloEngine({
      iterations: 100,
      randomSeed: 123, // Different seed
      timeoutSeconds: 60,
      convergenceThreshold: 0.001,
      confidenceLevel: 0.95,
      enableEarlyTermination: false,
      parallelBatches: 1
    });
    
    const result2 = await engine2.runSimulation(mockWorkspace, mockWorkflow, mockRequest);

    // Results should be different (with high probability)
    expect(Math.abs(result1.readinessScore.mean - result2.readinessScore.mean)).toBeGreaterThan(0.001);
  });

  test('should maintain readiness score >= 0.7 for example workflow', async () => {
    const result = await engine.runSimulation(mockWorkspace, mockWorkflow, mockRequest);
    
    expect(result.readinessScore.mean).toBeGreaterThanOrEqual(0.7);
    expect(result.readinessScore.confidence.lower).toBeGreaterThanOrEqual(0.6);
    expect(result.policyPassPct.mean).toBeGreaterThanOrEqual(0.8);
    expect(result.citationCoverage.mean).toBeGreaterThanOrEqual(0.8);
    expect(result.duplicationRisk.mean).toBeLessThanOrEqual(0.3);
    expect(result.technicalReadiness.mean).toBeGreaterThanOrEqual(0.7);
  });

  test('should respect budget constraints in cost estimation', async () => {
    const result = await engine.runSimulation(mockWorkspace, mockWorkflow, mockRequest);
    
    // Cost should generally be within reasonable bounds of budget
    expect(result.costEstimate.mean).toBeGreaterThan(0);
    expect(result.costEstimate.confidence.upper).toBeLessThan(mockWorkspace.budget.hardCap * 2);
    
    // 95% of estimates should be below hard cap * 1.5 (allowing for variance)
    expect(result.costEstimate.percentiles.p95).toBeLessThan(mockWorkspace.budget.hardCap * 1.5);
  });

  test('should generate valid confidence intervals', async () => {
    const result = await engine.runSimulation(mockWorkspace, mockWorkflow, mockRequest);
    
    // Confidence intervals should be valid
    expect(result.readinessScore.confidence.lower).toBeLessThan(result.readinessScore.confidence.upper);
    expect(result.readinessScore.confidence.lower).toBeGreaterThanOrEqual(0);
    expect(result.readinessScore.confidence.upper).toBeLessThanOrEqual(1);
    expect(result.readinessScore.confidence.level).toBe(0.95);
    
    // Mean should be within confidence interval
    expect(result.readinessScore.mean).toBeGreaterThanOrEqual(result.readinessScore.confidence.lower);
    expect(result.readinessScore.mean).toBeLessThanOrEqual(result.readinessScore.confidence.upper);
  });

  test('should handle different risk profiles appropriately', async () => {
    const lowRiskWorkspace = { ...mockWorkspace, riskProfile: 'low' as const };
    const highRiskWorkspace = { ...mockWorkspace, riskProfile: 'high' as const };
    
    const lowRiskResult = await engine.runSimulation(lowRiskWorkspace, mockWorkflow, mockRequest);
    
    // Create new engine for high risk (to avoid state contamination)
    const highRiskEngine = new MonteCarloEngine({
      iterations: 100,
      randomSeed: 42,
      timeoutSeconds: 60,
      convergenceThreshold: 0.001,
      confidenceLevel: 0.95,
      enableEarlyTermination: false,
      parallelBatches: 1
    });
    
    const highRiskResult = await highRiskEngine.runSimulation(highRiskWorkspace, mockWorkflow, mockRequest);
    
    // Low risk should generally have better policy compliance
    expect(lowRiskResult.policyPassPct.mean).toBeGreaterThanOrEqual(highRiskResult.policyPassPct.mean - 0.01);
  });

  test('should have reasonable statistical properties', async () => {
    // Use more iterations for better statistical properties
    const largerEngine = new MonteCarloEngine({
      iterations: 500,
      randomSeed: 42,
      timeoutSeconds: 120,
      convergenceThreshold: 0.001,
      confidenceLevel: 0.95,
      enableEarlyTermination: false,
      parallelBatches: 1
    });
    
    const result = await largerEngine.runSimulation(mockWorkspace, mockWorkflow, mockRequest);
    
    // Standard deviation should be reasonable (not too high or too low)
    expect(result.readinessScore.std).toBeGreaterThan(0.001);
    expect(result.readinessScore.std).toBeLessThan(0.2);
    
    // Percentiles should be ordered correctly
    expect(result.readinessScore.percentiles.p5).toBeLessThan(result.readinessScore.percentiles.p25);
    expect(result.readinessScore.percentiles.p25).toBeLessThan(result.readinessScore.percentiles.p50);
    expect(result.readinessScore.percentiles.p50).toBeLessThan(result.readinessScore.percentiles.p75);
    expect(result.readinessScore.percentiles.p75).toBeLessThan(result.readinessScore.percentiles.p95);
  });

  test('should handle edge case parameters gracefully', async () => {
    // Test with minimum budget
    const minBudgetWorkspace = {
      ...mockWorkspace,
      budget: {
        ...mockWorkspace.budget,
        weeklyCap: 100,
        hardCap: 200,
        breakdown: {
          paidAds: 80,
          llmModelSpend: 15,
          rendering: 5,
          thirdPartyServices: 0
        }
      }
    };
    
    const result = await engine.runSimulation(minBudgetWorkspace, mockWorkflow, mockRequest);
    
    expect(result.readinessScore.mean).toBeGreaterThan(0);
    expect(result.readinessScore.mean).toBeLessThan(1);
    expect(result.costEstimate.mean).toBeGreaterThan(0);
  });

  test('should complete simulation within reasonable time', async () => {
    const startTime = Date.now();
    
    await engine.runSimulation(mockWorkspace, mockWorkflow, mockRequest);
    
    const duration = Date.now() - startTime;
    
    // Should complete within 10 seconds for 100 iterations
    expect(duration).toBeLessThan(10000);
  });
});

describe('MonteCarloEngine - Integration Tests', () => {
  test('should integrate with full workflow simulation', async () => {
    const config: SimulationConfig = {
      iterations: 1000,
      randomSeed: 42,
      timeoutSeconds: 120,
      convergenceThreshold: 0.001,
      confidenceLevel: 0.95,
      enableEarlyTermination: true,
      parallelBatches: 4
    };

    const engine = new MonteCarloEngine(config);
    
    const fullWorkspace: WorkspaceContext = {
      workspaceId: 'ws-integration-001',
      goals: [
        { key: 'lead_gen', target: 200, unit: 'leads_per_month' },
        { key: 'brand_awareness', target: 100000, unit: 'impressions_per_month' }
      ],
      primaryChannels: ['linkedin', 'x', 'instagram'],
      budget: {
        currency: 'USD',
        weeklyCap: 2000,
        hardCap: 8000,
        breakdown: {
          paidAds: 1200,
          llmModelSpend: 400,
          rendering: 300,
          thirdPartyServices: 100
        }
      },
      approvalPolicy: {
        autoApproveReadinessThreshold: 0.85,
        canaryInitialPct: 0.05,
        canaryWatchWindowHours: 48,
        manualApprovalForPaid: true,
        legalManualApproval: true
      },
      riskProfile: 'enterprise',
      connectors: [
        { platform: 'linkedin', status: 'connected', lastConnectedAt: '2025-08-24T10:00:00Z' },
        { platform: 'x', status: 'connected', lastConnectedAt: '2025-08-24T10:00:00Z' },
        { platform: 'instagram', status: 'connected', lastConnectedAt: '2025-08-24T10:00:00Z' }
      ]
    };

    const fullWorkflow: WorkflowNode[] = [
      { id: 'research_brand', type: 'agent', parameters: {}, dependencies: [], estimatedDuration: 1200, failureRate: 0.02 },
      { id: 'analyze_competitors', type: 'agent', parameters: {}, dependencies: ['research_brand'], estimatedDuration: 800, failureRate: 0.03 },
      { id: 'generate_content', type: 'agent', parameters: {}, dependencies: ['research_brand'], estimatedDuration: 2500, failureRate: 0.05 },
      { id: 'legal_review', type: 'validation', parameters: {}, dependencies: ['generate_content'], estimatedDuration: 600, failureRate: 0.01 },
      { id: 'policy_check', type: 'validation', parameters: {}, dependencies: ['generate_content'], estimatedDuration: 150, failureRate: 0.01 },
      { id: 'render_assets', type: 'render', parameters: {}, dependencies: ['generate_content'], estimatedDuration: 1800, failureRate: 0.04 },
      { id: 'schedule_posts', type: 'automation', parameters: {}, dependencies: ['legal_review', 'policy_check', 'render_assets'], estimatedDuration: 300, failureRate: 0.02 }
    ];

    const request: SimulationRequest = {
      workspaceId: 'ws-integration-001',
      workflowJson: { nodes: fullWorkflow },
      dryRun: true,
      iterations: 1000,
      randomSeed: 42,
      targetChannels: ['linkedin', 'x', 'instagram']
    };

    const result = await engine.runSimulation(fullWorkspace, fullWorkflow, request);

    // Verify comprehensive results
    expect(result.readinessScore.mean).toBeGreaterThanOrEqual(0.7);
    expect(result.policyPassPct.mean).toBeGreaterThanOrEqual(0.9); // Enterprise should have high compliance
    expect(result.citationCoverage.mean).toBeGreaterThanOrEqual(0.85);
    expect(result.duplicationRisk.mean).toBeLessThanOrEqual(0.15);
    expect(result.costEstimate.mean).toBeGreaterThan(1000);
    expect(result.costEstimate.mean).toBeLessThan(6000); // Should be within reasonable bounds
    expect(result.technicalReadiness.mean).toBeGreaterThanOrEqual(0.8);

    // Verify convergence
    expect(result.convergenceMetrics.requiredIterations).toBeGreaterThan(0);
    expect(result.convergenceMetrics.requiredIterations).toBeLessThanOrEqual(1000);
  });
});