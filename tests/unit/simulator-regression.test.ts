import { describe, it, expect, beforeAll } from '@jest/globals';
import { MonteCarloEngine } from '../src/services/monte-carlo-engine';
import { SimulationService } from '../src/services/simulation-service';
import { 
  WorkspaceContext, 
  SimulationRequest, 
  MonteCarloResults,
  SimulationConfig 
} from '../src/types';
import baselineResults from '../data/simulation/baseline-seed42.json';

describe('Deterministic Simulator Regression Tests', () => {
  let simulationService: SimulationService;
  let testWorkspace: WorkspaceContext;
  let simulationConfig: SimulationConfig;

  beforeAll(() => {
    simulationService = new SimulationService();
    
    // Use the exact workspace configuration from baseline
    testWorkspace = {
      workspaceId: 'ws-icblabs-001',
      tenantId: 'icblabs',
      goals: [
        {
          key: 'lead_gen',
          target: 100,
          unit: 'leads_per_month'
        },
        {
          key: 'brand_awareness',
          target: 50000,
          unit: 'impressions_per_month'
        }
      ],
      primaryChannels: ['linkedin', 'x'],
      budget: {
        currency: 'USD',
        weeklyCap: 1000,
        hardCap: 5000
      },
      connectors: [
        {
          platform: 'linkedin',
          connectorId: 'conn-li-001',
          accountId: 'li-icblabs',
          displayName: 'ICB Labs LinkedIn',
          status: 'connected',
          scopes: ['r_liteprofile', 'w_member_social']
        },
        {
          platform: 'x',
          connectorId: 'conn-x-001', 
          accountId: 'x-icblabs',
          displayName: 'ICB Labs X',
          status: 'connected',
          scopes: ['tweet.read', 'tweet.write']
        }
      ],
      consentRecords: [
        {
          consentId: 'consent-voice-001',
          type: 'voice_likeness',
          grantedBy: 'user-icblabs',
          grantedAt: '2024-01-10T09:00:00Z',
          expiresAt: '2025-01-10T09:00:00Z'
        },
        {
          consentId: 'consent-ugc-001',
          type: 'ugc_license',
          grantedBy: 'user-icblabs',
          grantedAt: '2024-01-10T09:00:00Z',
          expiresAt: '2025-01-10T09:00:00Z'
        }
      ],
      riskProfile: 'moderate'
    };

    simulationConfig = {
      randomSeed: 42,
      iterations: 1000,
      parallelBatches: 4,
      enableEarlyTermination: true,
      convergenceThreshold: 0.001,
      maxExecutionTime: 60
    };
  });

  describe('Seed Determinism Verification', () => {
    it('should produce identical results across multiple runs with same seed', async () => {
      const runs: MonteCarloResults[] = [];
      
      // Run simulation multiple times
      for (let i = 0; i < 3; i++) {
        const engine = new MonteCarloEngine(simulationConfig);
        const result = await engine.runSimulation(
          testWorkspace,
          [], // Simple workflow for baseline
          { workspaceId: testWorkspace.workspaceId }
        );
        runs.push(result);
      }

      // All runs should be identical
      for (let i = 1; i < runs.length; i++) {
        expect(runs[i].readinessScore.mean).toBeCloseTo(runs[0].readinessScore.mean, 10);
        expect(runs[i].costEstimate.mean).toBeCloseTo(runs[0].costEstimate.mean, 10);
        expect(runs[i].policyPassPct.mean).toBeCloseTo(runs[0].policyPassPct.mean, 10);
        expect(runs[i].citationCoverage.mean).toBeCloseTo(runs[0].citationCoverage.mean, 10);
        expect(runs[i].duplicationRisk.mean).toBeCloseTo(runs[0].duplicationRisk.mean, 10);
      }
    });

    it('should match baseline results within tolerance', async () => {
      const engine = new MonteCarloEngine(simulationConfig);
      const result = await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      const baseline = baselineResults.expectedResults;

      // Check readiness score against baseline
      expect(result.readinessScore.mean).toBeCloseTo(
        baseline.readinessScore.mean, 
        Math.log10(1 / baseline.readinessScore.tolerance)
      );
      expect(result.readinessScore.stdDev).toBeCloseTo(
        baseline.readinessScore.stdDev,
        2
      );

      // Check policy pass percentage
      expect(result.policyPassPct.mean).toBeCloseTo(
        baseline.policyPassPct.mean,
        Math.log10(1 / baseline.policyPassPct.tolerance)
      );

      // Check citation coverage
      expect(result.citationCoverage.mean).toBeCloseTo(
        baseline.citationCoverage.mean,
        Math.log10(1 / baseline.citationCoverage.tolerance)
      );

      // Check duplication risk
      expect(result.duplicationRisk.mean).toBeCloseTo(
        baseline.duplicationRisk.mean,
        Math.log10(1 / baseline.duplicationRisk.tolerance)
      );

      // Check cost estimate
      expect(result.costEstimate.mean).toBeCloseTo(
        baseline.costEstimate.mean,
        Math.log10(1 / baseline.costEstimate.tolerance)
      );
    });
  });

  describe('Statistical Distribution Verification', () => {
    it('should maintain expected statistical properties', async () => {
      const engine = new MonteCarloEngine(simulationConfig);
      const result = await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      const baseline = baselineResults.expectedResults;

      // Verify percentiles are within expected ranges
      expect(result.readinessScore.percentiles.p50).toBeCloseTo(
        baseline.readinessScore.p50, 2
      );
      expect(result.readinessScore.percentiles.p95).toBeCloseTo(
        baseline.readinessScore.p95, 2
      );
      expect(result.readinessScore.percentiles.p99).toBeCloseTo(
        baseline.readinessScore.p99, 2
      );

      // Verify confidence intervals are stable
      const ciWidth = result.readinessScore.confidenceInterval.upper - 
                     result.readinessScore.confidenceInterval.lower;
      const baselineCiWidth = baseline.convergenceMetrics.confidenceInterval.width;
      
      expect(ciWidth).toBeCloseTo(baselineCiWidth, 2);
    });

    it('should converge at expected iteration count', async () => {
      const engine = new MonteCarloEngine({
        ...simulationConfig,
        enableEarlyTermination: true
      });
      
      const result = await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      const baseline = baselineResults.expectedResults.convergenceMetrics;
      
      // Should converge within reasonable range of baseline
      expect(result.convergenceMetadata.iterationsExecuted).toBeLessThanOrEqual(
        baseline.convergenceIteration + 100
      );
      expect(result.convergenceMetadata.iterationsExecuted).toBeGreaterThanOrEqual(
        baseline.convergenceIteration - 100
      );
    });
  });

  describe('Performance Regression Testing', () => {
    it('should complete simulation within SLO timeframe', async () => {
      const startTime = Date.now();
      
      const engine = new MonteCarloEngine(simulationConfig);
      await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );
      
      const executionTime = (Date.now() - startTime) / 1000;
      const baselineTime = baselineResults.performanceMetrics.executionTime.total;
      
      // Should not exceed baseline by more than 50%
      expect(executionTime).toBeLessThan(baselineTime * 1.5);
    });

    it('should maintain memory efficiency', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const engine = new MonteCarloEngine(simulationConfig);
      await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );
      
      const peakMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (peakMemory - initialMemory) / (1024 * 1024); // MB
      
      const baselineMemory = baselineResults.performanceMetrics.memoryUsage.peak;
      
      // Should not exceed baseline memory by more than 20%
      expect(memoryDelta).toBeLessThan(baselineMemory * 1.2);
    });
  });

  describe('Edge Case Regression Testing', () => {
    it('should handle max budget scenario consistently', async () => {
      const maxBudgetWorkspace = {
        ...testWorkspace,
        budget: {
          currency: 'USD',
          weeklyCap: 50000,
          hardCap: 200000
        }
      };

      const engine = new MonteCarloEngine(simulationConfig);
      const result = await engine.runSimulation(
        maxBudgetWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      // High budget should result in lower cost risk
      expect(result.costRisk.mean).toBeLessThan(0.1);
      expect(result.readinessScore.mean).toBeGreaterThan(0.8);
    });

    it('should handle missing consent scenario consistently', async () => {
      const noConsentWorkspace = {
        ...testWorkspace,
        consentRecords: []
      };

      const engine = new MonteCarloEngine(simulationConfig);
      const result = await engine.runSimulation(
        noConsentWorkspace,
        [{ type: 'creative', config: { uses_synthetic_voice: true } }],
        { workspaceId: testWorkspace.workspaceId }
      );

      // Missing consent should result in policy failures
      expect(result.policyPassPct.mean).toBeLessThan(0.5);
      expect(result.readinessScore.mean).toBeLessThan(0.4);
    });

    it('should handle connector degradation consistently', async () => {
      const degradedWorkspace = {
        ...testWorkspace,
        connectors: testWorkspace.connectors.map(conn => ({
          ...conn,
          status: 'degraded' as const
        }))
      };

      const engine = new MonteCarloEngine(simulationConfig);
      const result = await engine.runSimulation(
        degradedWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      // Degraded connectors should reduce technical readiness
      expect(result.technicalReadiness.mean).toBeLessThan(0.6);
      expect(result.readinessScore.mean).toBeLessThan(0.7);
    });
  });

  describe('Regression Detection', () => {
    it('should detect critical regression in readiness score', async () => {
      // Simulate a regression by modifying baseline tolerance
      const regressionThreshold = baselineResults.regressionThresholds.critical.readinessScoreDelta;
      
      const engine = new MonteCarloEngine(simulationConfig);
      const result = await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      const baseline = baselineResults.expectedResults.readinessScore.mean;
      const delta = Math.abs(result.readinessScore.mean - baseline);
      
      // Should pass regression check
      expect(delta).toBeLessThan(regressionThreshold);
    });

    it('should generate regression report for CI', async () => {
      const engine = new MonteCarloEngine(simulationConfig);
      const result = await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      const regressionReport = await simulationService.generateRegressionReport(
        result,
        baselineResults
      );

      expect(regressionReport.status).toBe('PASS');
      expect(regressionReport.criticalRegressions).toHaveLength(0);
      expect(regressionReport.warnings).toHaveLength(0);
      expect(regressionReport.comparisonResults).toBeDefined();
    });
  });

  describe('CI Integration', () => {
    it('should fail fast on significant deviation', async () => {
      // Test with invalid configuration that should cause deviation
      const badConfig = {
        ...simulationConfig,
        randomSeed: 999 // Different seed should cause different results
      };

      const engine = new MonteCarloEngine(badConfig);
      const result = await engine.runSimulation(
        testWorkspace,
        [],
        { workspaceId: testWorkspace.workspaceId }
      );

      const regressionReport = await simulationService.generateRegressionReport(
        result,
        baselineResults
      );

      // Should detect regression due to different seed
      expect(regressionReport.status).toBe('FAIL');
      expect(regressionReport.criticalRegressions.length).toBeGreaterThan(0);
    });

    it('should validate baseline file integrity', () => {
      // Verify baseline file has required structure
      expect(baselineResults.testConfig).toBeDefined();
      expect(baselineResults.expectedResults).toBeDefined();
      expect(baselineResults.regressionThresholds).toBeDefined();
      
      // Verify critical fields
      expect(baselineResults.testConfig.randomSeed).toBe(42);
      expect(baselineResults.testConfig.iterations).toBe(1000);
      expect(baselineResults.expectedResults.readinessScore.mean).toBeDefined();
      expect(baselineResults.regressionThresholds.critical).toBeDefined();
    });
  });
});