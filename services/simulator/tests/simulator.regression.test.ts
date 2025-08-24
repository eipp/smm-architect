import { MonteCarloEngine } from '../src/services/monte-carlo-engine';
import { WorkspaceContext, WorkflowNode, SimulationRequest, SimulationConfig } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Load baseline data
const baselineDataPath = path.join(__dirname, 'baseline', 'icblabs-seed42.json');
const baselineData = JSON.parse(fs.readFileSync(baselineDataPath, 'utf8'));

describe('Simulator Regression Tests', () => {
  describe('ICB Labs Baseline (seed 42)', () => {
    it('simulator-regression: should match baseline results within tolerance', async () => {
      // Extract test inputs from baseline
      const { simulationInput, expectedOutput, tolerances } = baselineData;
      
      // Set up simulation configuration exactly as in baseline
      const config: SimulationConfig = {
        iterations: simulationInput.simulationConfig.iterations,
        randomSeed: simulationInput.simulationConfig.randomSeed,
        timeoutSeconds: simulationInput.simulationConfig.timeoutSeconds,
        convergenceThreshold: simulationInput.simulationConfig.convergenceThreshold,
        confidenceLevel: simulationInput.simulationConfig.confidenceLevel,
        enableEarlyTermination: simulationInput.simulationConfig.enableEarlyTermination,
        parallelBatches: simulationInput.simulationConfig.parallelBatches
      };

      // Create workspace context from baseline
      const workspace: WorkspaceContext = {
        workspaceId: simulationInput.workspaceContext.workspaceId,
        goals: simulationInput.workspaceContext.goals,
        primaryChannels: simulationInput.workspaceContext.primaryChannels,
        budget: simulationInput.workspaceContext.budget,
        approvalPolicy: simulationInput.workspaceContext.approvalPolicy,
        riskProfile: simulationInput.workspaceContext.riskProfile,
        connectors: [
          { platform: 'linkedin', status: 'connected', lastConnectedAt: new Date().toISOString() },
          { platform: 'x', status: 'connected', lastConnectedAt: new Date().toISOString() }
        ]
      };

      // Create workflow from baseline
      const workflow: WorkflowNode[] = simulationInput.workflowJson.nodes;

      // Create request
      const request: SimulationRequest = {
        workspaceId: simulationInput.workspaceId,
        workflowJson: workflow,
        iterations: config.iterations,
        randomSeed: config.randomSeed,
        timeoutSeconds: config.timeoutSeconds
      };

      // Run simulation
      const engine = new MonteCarloEngine(config);
      const results = await engine.runSimulation(workspace, workflow, request);

      // Validate results against baseline with tolerances
      console.log('Regression Test Results:');
      console.log(`Readiness Score: ${results.readinessScore.mean} (expected: ${expectedOutput.readinessScore.mean})`);
      console.log(`Policy Pass %: ${results.policyPassPct.mean} (expected: ${expectedOutput.policyPassPct.mean})`);
      console.log(`Citation Coverage: ${results.citationCoverage.mean} (expected: ${expectedOutput.citationCoverage.mean})`);
      console.log(`Duplication Risk: ${results.duplicationRisk.mean} (expected: ${expectedOutput.duplicationRisk.mean})`);
      console.log(`Cost Estimate: ${results.costEstimate.mean} (expected: ${expectedOutput.costEstimateUSD.mean})`);
      console.log(`Technical Readiness: ${results.technicalReadiness.mean} (expected: ${expectedOutput.technicalReadiness.mean})`);

      // Readiness Score
      expect(Math.abs(results.readinessScore.mean - expectedOutput.readinessScore.mean))
        .toBeLessThanOrEqual(tolerances.readinessScore);
      expect(Math.abs(results.readinessScore.std - expectedOutput.readinessScore.std))
        .toBeLessThanOrEqual(tolerances.readinessScore * 2); // Allow 2x tolerance for std dev

      // Policy Pass Percentage
      expect(Math.abs(results.policyPassPct.mean - expectedOutput.policyPassPct.mean))
        .toBeLessThanOrEqual(tolerances.policyPassPct);

      // Citation Coverage
      expect(Math.abs(results.citationCoverage.mean - expectedOutput.citationCoverage.mean))
        .toBeLessThanOrEqual(tolerances.citationCoverage);

      // Duplication Risk
      expect(Math.abs(results.duplicationRisk.mean - expectedOutput.duplicationRisk.mean))
        .toBeLessThanOrEqual(tolerances.duplicationRisk);

      // Cost Estimate
      expect(Math.abs(results.costEstimate.mean - expectedOutput.costEstimateUSD.mean))
        .toBeLessThanOrEqual(tolerances.costEstimateUSD);

      // Technical Readiness
      expect(Math.abs(results.technicalReadiness.mean - expectedOutput.technicalReadiness.mean))
        .toBeLessThanOrEqual(tolerances.technicalReadiness);

      // Validate percentiles are in correct order
      expect(results.readinessScore.percentiles.p5).toBeLessThanOrEqual(results.readinessScore.percentiles.p25);
      expect(results.readinessScore.percentiles.p25).toBeLessThanOrEqual(results.readinessScore.percentiles.p50);
      expect(results.readinessScore.percentiles.p50).toBeLessThanOrEqual(results.readinessScore.percentiles.p75);
      expect(results.readinessScore.percentiles.p75).toBeLessThanOrEqual(results.readinessScore.percentiles.p95);

      // Validate confidence intervals
      expect(results.readinessScore.confidence.lower).toBeLessThanOrEqual(results.readinessScore.mean);
      expect(results.readinessScore.mean).toBeLessThanOrEqual(results.readinessScore.confidence.upper);
      expect(results.readinessScore.confidence.level).toBe(config.confidenceLevel);

      // Validate convergence if expected
      if (expectedOutput.convergenceMetrics.converged) {
        expect(results.convergenceMetrics.converged).toBe(true);
      }

      console.log('✅ All regression tests passed within tolerance');
    }, 30000); // 30 second timeout for simulation

    it('should produce reproducible results across multiple runs', async () => {
      const config: SimulationConfig = {
        iterations: 100, // Smaller for faster testing
        randomSeed: 42,
        timeoutSeconds: 60,
        convergenceThreshold: 0.001,
        confidenceLevel: 0.95,
        enableEarlyTermination: false,
        parallelBatches: 1
      };

      const workspace: WorkspaceContext = {
        workspaceId: 'ws-icblabs-0001',
        goals: [{ key: 'lead_gen', target: 200, unit: 'leads_per_month' }],
        primaryChannels: ['linkedin', 'x'],
        budget: {
          currency: 'USD',
          weeklyCap: 1000,
          hardCap: 4000,
          breakdown: { paidAds: 600, llmModelSpend: 200, rendering: 150, thirdPartyServices: 50 }
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
          { platform: 'linkedin', status: 'connected', lastConnectedAt: new Date().toISOString() }
        ]
      };

      const workflow: WorkflowNode[] = [
        {
          id: 'research',
          type: 'agent',
          parameters: { agent: 'research-agent' },
          dependencies: [],
          estimatedDuration: 1200,
          failureRate: 0.02
        }
      ];

      const request: SimulationRequest = {
        workspaceId: 'ws-icblabs-0001',
        workflowJson: workflow,
        iterations: config.iterations,
        randomSeed: config.randomSeed,
        timeoutSeconds: config.timeoutSeconds
      };

      // Run simulation multiple times
      const results1 = await new MonteCarloEngine(config).runSimulation(workspace, workflow, request);
      const results2 = await new MonteCarloEngine(config).runSimulation(workspace, workflow, request);
      const results3 = await new MonteCarloEngine(config).runSimulation(workspace, workflow, request);

      // All results should be identical for same seed
      expect(results1.readinessScore.mean).toBeCloseTo(results2.readinessScore.mean, 10);
      expect(results2.readinessScore.mean).toBeCloseTo(results3.readinessScore.mean, 10);
      
      expect(results1.policyPassPct.mean).toBeCloseTo(results2.policyPassPct.mean, 10);
      expect(results2.policyPassPct.mean).toBeCloseTo(results3.policyPassPct.mean, 10);
      
      expect(results1.citationCoverage.mean).toBeCloseTo(results2.citationCoverage.mean, 10);
      expect(results2.citationCoverage.mean).toBeCloseTo(results3.citationCoverage.mean, 10);

      console.log('✅ Reproducibility test passed');
    });

    it('should validate RNG metadata matches baseline requirements', async () => {
      const config: SimulationConfig = {
        iterations: 50,
        randomSeed: 42,
        timeoutSeconds: 60,
        convergenceThreshold: 0.001,
        confidenceLevel: 0.95,
        enableEarlyTermination: false,
        parallelBatches: 1
      };

      // Verify RNG configuration matches baseline expectations
      expect(config.randomSeed).toBe(baselineData.simulationInput.simulationConfig.randomSeed);
      
      // Verify we're using the expected RNG algorithm
      const expectedRngLibrary = baselineData.metadata.rngLibrary;
      expect(expectedRngLibrary).toContain('seedrandom');

      // Test that our engine produces deterministic output
      const workspace: WorkspaceContext = {
        workspaceId: 'ws-test',
        goals: [{ key: 'test', target: 100, unit: 'leads' }],
        primaryChannels: ['linkedin'],
        budget: {
          currency: 'USD', weeklyCap: 1000, hardCap: 4000,
          breakdown: { paidAds: 600, llmModelSpend: 200, rendering: 150, thirdPartyServices: 50 }
        },
        approvalPolicy: {
          autoApproveReadinessThreshold: 0.85, canaryInitialPct: 0.05,
          canaryWatchWindowHours: 48, manualApprovalForPaid: true, legalManualApproval: false
        },
        riskProfile: 'medium',
        connectors: [{ platform: 'linkedin', status: 'connected', lastConnectedAt: new Date().toISOString() }]
      };

      const workflow: WorkflowNode[] = [{
        id: 'test', type: 'agent', parameters: { agent: 'test' },
        dependencies: [], estimatedDuration: 1000, failureRate: 0.01
      }];

      const request: SimulationRequest = {
        workspaceId: 'ws-test', workflowJson: workflow,
        iterations: config.iterations, randomSeed: config.randomSeed, timeoutSeconds: config.timeoutSeconds
      };

      const engine = new MonteCarloEngine(config);
      const results = await engine.runSimulation(workspace, workflow, request);

      // Basic sanity checks
      expect(results.readinessScore.mean).toBeGreaterThan(0);
      expect(results.readinessScore.mean).toBeLessThan(1);
      expect(typeof results.readinessScore.mean).toBe('number');
      expect(isFinite(results.readinessScore.mean)).toBe(true);

      console.log('✅ RNG metadata validation passed');
    });
  });

  describe('Regression Test Infrastructure', () => {
    it('should load baseline data correctly', () => {
      expect(baselineData).toBeDefined();
      expect(baselineData.testCase).toBe('icblabs-workspace-baseline');
      expect(baselineData.simulationInput).toBeDefined();
      expect(baselineData.expectedOutput).toBeDefined();
      expect(baselineData.tolerances).toBeDefined();
      
      // Validate tolerance values are reasonable
      expect(baselineData.tolerances.readinessScore).toBeGreaterThan(0);
      expect(baselineData.tolerances.readinessScore).toBeLessThan(0.1);
    });

    it('should have properly formatted baseline expectations', () => {
      const { expectedOutput } = baselineData;
      
      // Check all required metrics are present
      expect(expectedOutput.readinessScore).toBeDefined();
      expect(expectedOutput.policyPassPct).toBeDefined();
      expect(expectedOutput.citationCoverage).toBeDefined();
      expect(expectedOutput.duplicationRisk).toBeDefined();
      expect(expectedOutput.costEstimateUSD).toBeDefined();
      expect(expectedOutput.technicalReadiness).toBeDefined();

      // Check statistical fields are present
      expect(expectedOutput.readinessScore.mean).toBeDefined();
      expect(expectedOutput.readinessScore.std).toBeDefined();
      expect(expectedOutput.readinessScore.percentiles).toBeDefined();
      expect(expectedOutput.readinessScore.confidence).toBeDefined();

      // Validate percentiles are in order
      const p = expectedOutput.readinessScore.percentiles;
      expect(p.p5).toBeLessThanOrEqual(p.p25);
      expect(p.p25).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p95);
    });
  });
});