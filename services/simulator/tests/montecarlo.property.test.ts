import { MonteCarloEngine } from '../src/services/monte-carlo-engine';
import { WorkspaceContext, WorkflowNode, SimulationRequest, SimulationConfig } from '../src/types';
import * as fc from 'fast-check';

describe('Monte Carlo Properties', () => {
  
  const createValidWorkspace = (): WorkspaceContext => ({
    workspaceId: 'ws-test',
    goals: [{ key: 'test', target: 100, unit: 'leads' }],
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
      manualApprovalForPaid: true,
      legalManualApproval: false
    },
    riskProfile: 'medium',
    connectors: [
      { platform: 'linkedin', status: 'connected', lastConnectedAt: new Date().toISOString() },
      { platform: 'x', status: 'connected', lastConnectedAt: new Date().toISOString() }
    ]
  });

  const createValidWorkflow = (): WorkflowNode[] => [
    {
      id: 'research',
      type: 'agent',
      parameters: { agent: 'research-agent' },
      dependencies: [],
      estimatedDuration: 1200,
      failureRate: 0.02
    },
    {
      id: 'content',
      type: 'agent',
      parameters: { agent: 'creative-agent' },
      dependencies: ['research'],
      estimatedDuration: 2500,
      failureRate: 0.05
    }
  ];

  const createValidRequest = (): SimulationRequest => ({
    workspaceId: 'ws-test',
    workflowJson: createValidWorkflow(),
    iterations: 100,
    randomSeed: 42,
    timeoutSeconds: 60
  });

  describe('Determinism Properties', () => {
    it('should produce identical results for identical inputs and seeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // seed
          fc.integer({ min: 10, max: 100 }), // iterations
          async (seed: number, iterations: number) => {
            const config: SimulationConfig = {
              iterations,
              randomSeed: seed,
              timeoutSeconds: 60,
              convergenceThreshold: 0.001,
              confidenceLevel: 0.95,
              enableEarlyTermination: false,
              parallelBatches: 1
            };

            const engine1 = new MonteCarloEngine(config);
            const engine2 = new MonteCarloEngine(config);

            const workspace = createValidWorkspace();
            const workflow = createValidWorkflow();
            const request = createValidRequest();

            const results1 = await engine1.runSimulation(workspace, workflow, request);
            const results2 = await engine2.runSimulation(workspace, workflow, request);

            // Results should be identical for same seed
            expect(Math.abs(results1.readinessScore.mean - results2.readinessScore.mean)).toBeLessThan(1e-10);
            expect(Math.abs(results1.policyPassPct.mean - results2.policyPassPct.mean)).toBeLessThan(1e-10);
            expect(Math.abs(results1.citationCoverage.mean - results2.citationCoverage.mean)).toBeLessThan(1e-10);
            expect(Math.abs(results1.duplicationRisk.mean - results2.duplicationRisk.mean)).toBeLessThan(1e-10);
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });

    it('should produce different results for different seeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // seed1
          fc.integer({ min: 1001, max: 2000 }), // seed2 (different range)
          async (seed1: number, seed2: number) => {
            const config1: SimulationConfig = {
              iterations: 50,
              randomSeed: seed1,
              timeoutSeconds: 60,
              convergenceThreshold: 0.001,
              confidenceLevel: 0.95,
              enableEarlyTermination: false,
              parallelBatches: 1
            };

            const config2: SimulationConfig = {
              ...config1,
              randomSeed: seed2
            };

            const engine1 = new MonteCarloEngine(config1);
            const engine2 = new MonteCarloEngine(config2);

            const workspace = createValidWorkspace();
            const workflow = createValidWorkflow();
            const request = createValidRequest();

            const results1 = await engine1.runSimulation(workspace, workflow, request);
            const results2 = await engine2.runSimulation(workspace, workflow, request);

            // Results should be different for different seeds (with high probability)
            const readinessDiff = Math.abs(results1.readinessScore.mean - results2.readinessScore.mean);
            const policyDiff = Math.abs(results1.policyPassPct.mean - results2.policyPassPct.mean);
            
            // At least one metric should differ significantly
            expect(readinessDiff > 1e-6 || policyDiff > 1e-6).toBe(true);
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });
  });

  describe('Monotonicity Properties', () => {
    it('should show that higher budget cap leads to lower cost risk (higher readiness)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 3000 }), // lower budget
          fc.integer({ min: 4000, max: 8000 }), // higher budget
          async (lowerBudget: number, higherBudget: number) => {
            const seed = 42; // Fixed seed for consistent comparison
            const config: SimulationConfig = {
              iterations: 50,
              randomSeed: seed,
              timeoutSeconds: 60,
              convergenceThreshold: 0.001,
              confidenceLevel: 0.95,
              enableEarlyTermination: false,
              parallelBatches: 1
            };

            const workspaceLowBudget = {
              ...createValidWorkspace(),
              budget: {
                ...createValidWorkspace().budget,
                hardCap: lowerBudget
              }
            };

            const workspaceHighBudget = {
              ...createValidWorkspace(),
              budget: {
                ...createValidWorkspace().budget,
                hardCap: higherBudget
              }
            };

            const engine1 = new MonteCarloEngine(config);
            const engine2 = new MonteCarloEngine(config);

            const workflow = createValidWorkflow();
            const request = createValidRequest();

            const resultsLow = await engine1.runSimulation(workspaceLowBudget, workflow, request);
            const resultsHigh = await engine2.runSimulation(workspaceHighBudget, workflow, request);

            // Higher budget should generally lead to higher readiness (lower cost risk)
            // Allow for some variance due to Monte Carlo nature
            const readinessDiff = resultsHigh.readinessScore.mean - resultsLow.readinessScore.mean;
            expect(readinessDiff).toBeGreaterThan(-0.1); // Should not be significantly lower
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    it('should show that enterprise risk profile leads to higher policy compliance', async () => {
      const seed = 123;
      const config: SimulationConfig = {
        iterations: 100,
        randomSeed: seed,
        timeoutSeconds: 60,
        convergenceThreshold: 0.001,
        confidenceLevel: 0.95,
        enableEarlyTermination: false,
        parallelBatches: 1
      };

      const workspaceMedium = {
        ...createValidWorkspace(),
        riskProfile: 'medium' as const
      };

      const workspaceEnterprise = {
        ...createValidWorkspace(),
        riskProfile: 'enterprise' as const
      };

      const engine1 = new MonteCarloEngine(config);
      const engine2 = new MonteCarloEngine(config);

      const workflow = createValidWorkflow();
      const request = createValidRequest();

      const resultsMedium = await engine1.runSimulation(workspaceMedium, workflow, request);
      const resultsEnterprise = await engine2.runSimulation(workspaceEnterprise, workflow, request);

      // Enterprise should have higher policy compliance
      expect(resultsEnterprise.policyPassPct.mean).toBeGreaterThanOrEqual(resultsMedium.policyPassPct.mean);
    });
  });

  describe('Convergence Properties', () => {
    it('should show convergence as iterations increase', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // seed
          async (seed: number) => {
            const smallConfig: SimulationConfig = {
              iterations: 50,
              randomSeed: seed,
              timeoutSeconds: 60,
              convergenceThreshold: 0.001,
              confidenceLevel: 0.95,
              enableEarlyTermination: false,
              parallelBatches: 1
            };

            const largeConfig: SimulationConfig = {
              ...smallConfig,
              iterations: 200
            };

            const engineSmall = new MonteCarloEngine(smallConfig);
            const engineLarge = new MonteCarloEngine(largeConfig);

            const workspace = createValidWorkspace();
            const workflow = createValidWorkflow();
            const request = createValidRequest();

            const resultsSmall = await engineSmall.runSimulation(workspace, workflow, request);
            const resultsLarge = await engineLarge.runSimulation(workspace, workflow, request);

            // Standard deviation should generally decrease with more iterations
            expect(resultsLarge.readinessScore.std).toBeLessThanOrEqual(resultsSmall.readinessScore.std * 1.2);
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });
  });

  describe('Boundary Value Properties', () => {
    it('should keep all metrics within valid bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // seed
          fc.integer({ min: 20, max: 100 }), // iterations
          async (seed: number, iterations: number) => {
            const config: SimulationConfig = {
              iterations,
              randomSeed: seed,
              timeoutSeconds: 60,
              convergenceThreshold: 0.001,
              confidenceLevel: 0.95,
              enableEarlyTermination: false,
              parallelBatches: 1
            };

            const engine = new MonteCarloEngine(config);
            const workspace = createValidWorkspace();
            const workflow = createValidWorkflow();
            const request = createValidRequest();

            const results = await engine.runSimulation(workspace, workflow, request);

            // All probability metrics should be between 0 and 1
            expect(results.readinessScore.mean).toBeGreaterThanOrEqual(0);
            expect(results.readinessScore.mean).toBeLessThanOrEqual(1);
            
            expect(results.policyPassPct.mean).toBeGreaterThanOrEqual(0);
            expect(results.policyPassPct.mean).toBeLessThanOrEqual(1);
            
            expect(results.citationCoverage.mean).toBeGreaterThanOrEqual(0);
            expect(results.citationCoverage.mean).toBeLessThanOrEqual(1);
            
            expect(results.duplicationRisk.mean).toBeGreaterThanOrEqual(0);
            expect(results.duplicationRisk.mean).toBeLessThanOrEqual(1);
            
            expect(results.technicalReadiness.mean).toBeGreaterThanOrEqual(0);
            expect(results.technicalReadiness.mean).toBeLessThanOrEqual(1);

            // Cost should be positive
            expect(results.costEstimate.mean).toBeGreaterThan(0);

            // Standard deviations should be non-negative
            expect(results.readinessScore.std).toBeGreaterThanOrEqual(0);
            expect(results.policyPassPct.std).toBeGreaterThanOrEqual(0);
            expect(results.citationCoverage.std).toBeGreaterThanOrEqual(0);
            expect(results.duplicationRisk.std).toBeGreaterThanOrEqual(0);
            expect(results.technicalReadiness.std).toBeGreaterThanOrEqual(0);
            expect(results.costEstimate.std).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 15, timeout: 45000 }
      );
    });

    it('should maintain confidence interval bounds', async () => {
      const config: SimulationConfig = {
        iterations: 100,
        randomSeed: 42,
        timeoutSeconds: 60,
        convergenceThreshold: 0.001,
        confidenceLevel: 0.95,
        enableEarlyTermination: false,
        parallelBatches: 1
      };

      const engine = new MonteCarloEngine(config);
      const workspace = createValidWorkspace();
      const workflow = createValidWorkflow();
      const request = createValidRequest();

      const results = await engine.runSimulation(workspace, workflow, request);

      // Confidence intervals should be properly ordered
      expect(results.readinessScore.confidence.lower).toBeLessThanOrEqual(results.readinessScore.mean);
      expect(results.readinessScore.mean).toBeLessThanOrEqual(results.readinessScore.confidence.upper);
      expect(results.readinessScore.confidence.level).toBe(0.95);

      // Confidence bounds should be within [0, 1] for probability metrics
      expect(results.readinessScore.confidence.lower).toBeGreaterThanOrEqual(0);
      expect(results.readinessScore.confidence.upper).toBeLessThanOrEqual(1);
      
      expect(results.policyPassPct.confidence.lower).toBeGreaterThanOrEqual(0);
      expect(results.policyPassPct.confidence.upper).toBeLessThanOrEqual(1);
    });
  });

  describe('Statistical Properties', () => {
    it('should have percentiles in correct order', async () => {
      const config: SimulationConfig = {
        iterations: 200,
        randomSeed: 42,
        timeoutSeconds: 60,
        convergenceThreshold: 0.001,
        confidenceLevel: 0.95,
        enableEarlyTermination: false,
        parallelBatches: 1
      };

      const engine = new MonteCarloEngine(config);
      const workspace = createValidWorkspace();
      const workflow = createValidWorkflow();
      const request = createValidRequest();

      const results = await engine.runSimulation(workspace, workflow, request);

      // Percentiles should be in ascending order
      const percentiles = results.readinessScore.percentiles;
      expect(percentiles.p5).toBeLessThanOrEqual(percentiles.p25);
      expect(percentiles.p25).toBeLessThanOrEqual(percentiles.p50);
      expect(percentiles.p50).toBeLessThanOrEqual(percentiles.p75);
      expect(percentiles.p75).toBeLessThanOrEqual(percentiles.p95);

      // Median (p50) should be close to mean for reasonably normal distribution
      expect(Math.abs(percentiles.p50 - results.readinessScore.mean)).toBeLessThan(0.1);
    });
  });
});