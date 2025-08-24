import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { MonteCarloEngine } from '../src/services/monte-carlo-engine';
import { 
  WorkspaceContext, 
  SimulationConfig,
  MonteCarloResults 
} from '../src/types';

describe('Monte Carlo Engine Property-Based Tests', () => {
  
  const createTestWorkspace = (overrides: Partial<WorkspaceContext> = {}): WorkspaceContext => ({
    workspaceId: 'ws-test',
    tenantId: 'test-tenant',
    goals: [{ key: 'lead_gen', target: 100, unit: 'leads_per_month' }],
    primaryChannels: ['linkedin'],
    budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
    connectors: [{
      platform: 'linkedin',
      connectorId: 'conn-1',
      accountId: 'acc-1',
      displayName: 'Test LinkedIn',
      status: 'connected'
    }],
    consentRecords: [],
    riskProfile: 'moderate',
    ...overrides
  });

  describe('Monotonicity Properties', () => {
    it('should decrease cost risk when budget increases', () => {
      fc.assert(fc.property(
        fc.integer({ min: 100, max: 5000 }), // budget1
        fc.integer({ min: 100, max: 5000 }), // budget2
        fc.integer({ min: 42, max: 100 }),    // seed
        async (budget1, budget2, seed) => {
          fc.pre(budget1 !== budget2); // Ensure budgets are different
          
          const [lowerBudget, higherBudget] = budget1 < budget2 ? [budget1, budget2] : [budget2, budget1];
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations: 100, // Reduced for property testing performance
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 30
          };

          const workspace1 = createTestWorkspace({
            budget: { currency: 'USD', weeklyCap: lowerBudget, hardCap: lowerBudget * 5 }
          });
          
          const workspace2 = createTestWorkspace({
            budget: { currency: 'USD', weeklyCap: higherBudget, hardCap: higherBudget * 5 }
          });

          const engine1 = new MonteCarloEngine(config);
          const engine2 = new MonteCarloEngine(config);
          
          const result1 = await engine1.runSimulation(workspace1, [], { workspaceId: workspace1.workspaceId });
          const result2 = await engine2.runSimulation(workspace2, [], { workspaceId: workspace2.workspaceId });

          // Higher budget should result in lower or equal cost risk
          expect(result2.costRisk.mean).toBeLessThanOrEqual(result1.costRisk.mean + 0.01); // Small tolerance for noise
        }
      ), { numRuns: 20 }); // Reduced runs for CI performance
    });

    it('should increase technical readiness when more connectors are connected', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 3 }), // connectorCount1
        fc.integer({ min: 1, max: 3 }), // connectorCount2  
        fc.integer({ min: 42, max: 100 }), // seed
        async (count1, count2, seed) => {
          fc.pre(count1 !== count2);
          
          const [lowerCount, higherCount] = count1 < count2 ? [count1, count2] : [count2, count1];
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations: 100,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 30
          };

          const platforms = ['linkedin', 'x', 'instagram'];
          
          const createConnectors = (count: number) => 
            platforms.slice(0, count).map((platform, i) => ({
              platform: platform as any,
              connectorId: `conn-${i}`,
              accountId: `acc-${i}`,
              displayName: `Test ${platform}`,
              status: 'connected' as const
            }));

          const workspace1 = createTestWorkspace({
            primaryChannels: platforms.slice(0, lowerCount) as any,
            connectors: createConnectors(lowerCount)
          });
          
          const workspace2 = createTestWorkspace({
            primaryChannels: platforms.slice(0, higherCount) as any,
            connectors: createConnectors(higherCount)
          });

          const engine1 = new MonteCarloEngine(config);
          const engine2 = new MonteCarloEngine(config);
          
          const result1 = await engine1.runSimulation(workspace1, [], { workspaceId: workspace1.workspaceId });
          const result2 = await engine2.runSimulation(workspace2, [], { workspaceId: workspace2.workspaceId });

          // More connectors should result in higher technical readiness
          expect(result2.technicalReadiness.mean).toBeGreaterThanOrEqual(result1.technicalReadiness.mean - 0.01);
        }
      ), { numRuns: 15 });
    });

    it('should improve readiness score when consent coverage increases', () => {
      fc.assert(fc.property(
        fc.boolean(), // hasVoiceLikeness1
        fc.boolean(), // hasUgcLicense1
        fc.boolean(), // hasVoiceLikeness2
        fc.boolean(), // hasUgcLicense2
        fc.integer({ min: 42, max: 100 }), // seed
        async (voice1, ugc1, voice2, ugc2, seed) => {
          const consentCount1 = (voice1 ? 1 : 0) + (ugc1 ? 1 : 0);
          const consentCount2 = (voice2 ? 1 : 0) + (ugc2 ? 1 : 0);
          
          fc.pre(consentCount1 !== consentCount2);
          
          const [lowerConsent, higherConsent] = consentCount1 < consentCount2 ? 
            [[voice1, ugc1], [voice2, ugc2]] : 
            [[voice2, ugc2], [voice1, ugc1]];
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations: 100,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 30
          };

          const createConsents = (hasVoice: boolean, hasUgc: boolean) => {
            const consents = [];
            if (hasVoice) {
              consents.push({
                consentId: 'voice-consent',
                type: 'voice_likeness' as const,
                grantedBy: 'user-test',
                grantedAt: '2024-01-01T00:00:00Z',
                expiresAt: '2025-01-01T00:00:00Z'
              });
            }
            if (hasUgc) {
              consents.push({
                consentId: 'ugc-consent',
                type: 'ugc_license' as const,
                grantedBy: 'user-test',
                grantedAt: '2024-01-01T00:00:00Z',
                expiresAt: '2025-01-01T00:00:00Z'
              });
            }
            return consents;
          };

          const workspace1 = createTestWorkspace({
            consentRecords: createConsents(lowerConsent[0], lowerConsent[1])
          });
          
          const workspace2 = createTestWorkspace({
            consentRecords: createConsents(higherConsent[0], higherConsent[1])
          });

          const engine1 = new MonteCarloEngine(config);
          const engine2 = new MonteCarloEngine(config);
          
          // Test with workflow that requires consents
          const workflow = [
            { type: 'creative', config: { uses_synthetic_voice: true, requires_ugc: true } }
          ];
          
          const result1 = await engine1.runSimulation(workspace1, workflow, { workspaceId: workspace1.workspaceId });
          const result2 = await engine2.runSimulation(workspace2, workflow, { workspaceId: workspace2.workspaceId });

          // More consents should result in higher policy pass rate
          expect(result2.policyPassPct.mean).toBeGreaterThanOrEqual(result1.policyPassPct.mean - 0.01);
        }
      ), { numRuns: 10 });
    });
  });

  describe('Convergence Properties', () => {
    it('should narrow confidence intervals with more iterations', () => {
      fc.assert(fc.property(
        fc.integer({ min: 50, max: 200 }),  // iterations1
        fc.integer({ min: 201, max: 500 }), // iterations2
        fc.integer({ min: 42, max: 100 }),  // seed
        async (iter1, iter2, seed) => {
          const workspace = createTestWorkspace();
          
          const config1: SimulationConfig = {
            randomSeed: seed,
            iterations: iter1,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 60
          };

          const config2: SimulationConfig = {
            randomSeed: seed,
            iterations: iter2,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 60
          };

          const engine1 = new MonteCarloEngine(config1);
          const engine2 = new MonteCarloEngine(config2);
          
          const result1 = await engine1.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });
          const result2 = await engine2.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });

          const ci1Width = result1.readinessScore.confidenceInterval.upper - 
                          result1.readinessScore.confidenceInterval.lower;
          const ci2Width = result2.readinessScore.confidenceInterval.upper - 
                          result2.readinessScore.confidenceInterval.lower;

          // More iterations should result in narrower confidence intervals
          expect(ci2Width).toBeLessThanOrEqual(ci1Width + 0.01); // Small tolerance for statistical noise
        }
      ), { numRuns: 8 });
    });

    it('should stabilize mean estimates with sufficient iterations', () => {
      fc.assert(fc.property(
        fc.integer({ min: 42, max: 100 }), // seed
        async (seed) => {
          const workspace = createTestWorkspace();
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations: 500, // High iteration count for stability
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.001,
            maxExecutionTime: 120
          };

          const engine = new MonteCarloEngine(config);
          const result = await engine.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });

          // With sufficient iterations, confidence interval should be reasonable
          const ciWidth = result.readinessScore.confidenceInterval.upper - 
                         result.readinessScore.confidenceInterval.lower;
          
          expect(ciWidth).toBeLessThan(0.1); // Should be reasonably narrow
          expect(result.readinessScore.mean).toBeGreaterThan(0);
          expect(result.readinessScore.mean).toBeLessThan(1);
        }
      ), { numRuns: 5 });
    });
  });

  describe('Boundary Properties', () => {
    it('should keep readiness scores within valid range [0,1]', () => {
      fc.assert(fc.property(
        fc.integer({ min: 42, max: 200 }), // seed
        fc.integer({ min: 50, max: 300 }),  // iterations
        async (seed, iterations) => {
          const workspace = createTestWorkspace();
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 60
          };

          const engine = new MonteCarloEngine(config);
          const result = await engine.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });

          // All readiness metrics should be in valid ranges
          expect(result.readinessScore.mean).toBeGreaterThanOrEqual(0);
          expect(result.readinessScore.mean).toBeLessThanOrEqual(1);
          expect(result.policyPassPct.mean).toBeGreaterThanOrEqual(0);
          expect(result.policyPassPct.mean).toBeLessThanOrEqual(1);
          expect(result.citationCoverage.mean).toBeGreaterThanOrEqual(0);
          expect(result.citationCoverage.mean).toBeLessThanOrEqual(1);
          expect(result.duplicationRisk.mean).toBeGreaterThanOrEqual(0);
          expect(result.duplicationRisk.mean).toBeLessThanOrEqual(1);
          expect(result.technicalReadiness.mean).toBeGreaterThanOrEqual(0);
          expect(result.technicalReadiness.mean).toBeLessThanOrEqual(1);
          
          // Cost estimates should be positive
          expect(result.costEstimate.mean).toBeGreaterThan(0);
        }
      ), { numRuns: 20 });
    });

    it('should handle extreme budget values gracefully', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(0),                    // Zero budget
          fc.integer({ min: 1, max: 10 }),   // Very low budget
          fc.integer({ min: 100000, max: 1000000 }) // Very high budget
        ),
        fc.integer({ min: 42, max: 100 }), // seed
        async (weeklyCap, seed) => {
          const workspace = createTestWorkspace({
            budget: { 
              currency: 'USD', 
              weeklyCap, 
              hardCap: Math.max(weeklyCap * 5, 1000) 
            }
          });
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations: 100,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 30
          };

          const engine = new MonteCarloEngine(config);
          
          // Should not throw errors even with extreme values
          const result = await engine.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });
          
          expect(result).toBeDefined();
          expect(result.readinessScore.mean).toBeGreaterThanOrEqual(0);
          expect(result.readinessScore.mean).toBeLessThanOrEqual(1);
          expect(isFinite(result.costEstimate.mean)).toBe(true);
        }
      ), { numRuns: 15 });
    });
  });

  describe('Statistical Properties', () => {
    it('should produce different results with different seeds', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000 }),   // seed1
        fc.integer({ min: 1, max: 1000 }),   // seed2
        async (seed1, seed2) => {
          fc.pre(seed1 !== seed2); // Ensure seeds are different
          
          const workspace = createTestWorkspace();
          
          const config1: SimulationConfig = {
            randomSeed: seed1,
            iterations: 200,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 60
          };

          const config2: SimulationConfig = {
            randomSeed: seed2,
            iterations: 200,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 60
          };

          const engine1 = new MonteCarloEngine(config1);
          const engine2 = new MonteCarloEngine(config2);
          
          const result1 = await engine1.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });
          const result2 = await engine2.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });

          // Different seeds should produce different results (with high probability)
          const resultsAreDifferent = (
            Math.abs(result1.readinessScore.mean - result2.readinessScore.mean) > 0.001 ||
            Math.abs(result1.costEstimate.mean - result2.costEstimate.mean) > 1.0
          );
          
          expect(resultsAreDifferent).toBe(true);
        }
      ), { numRuns: 10 });
    });

    it('should maintain consistent variance patterns', () => {
      fc.assert(fc.property(
        fc.integer({ min: 42, max: 100 }), // seed
        async (seed) => {
          const workspace = createTestWorkspace();
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations: 300,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.001,
            maxExecutionTime: 90
          };

          const engine = new MonteCarloEngine(config);
          const result = await engine.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });

          // Standard deviations should be reasonable (not zero, not excessive)
          expect(result.readinessScore.stdDev).toBeGreaterThan(0.001);
          expect(result.readinessScore.stdDev).toBeLessThan(0.5);
          expect(result.costEstimate.stdDev).toBeGreaterThan(0);
          expect(result.costEstimate.stdDev / result.costEstimate.mean).toBeLessThan(2); // Coefficient of variation < 200%
        }
      ), { numRuns: 8 });
    });
  });

  describe('Performance Properties', () => {
    it('should complete within reasonable time bounds', () => {
      fc.assert(fc.property(
        fc.integer({ min: 50, max: 200 }),  // iterations
        fc.integer({ min: 42, max: 100 }), // seed
        async (iterations, seed) => {
          const workspace = createTestWorkspace();
          
          const config: SimulationConfig = {
            randomSeed: seed,
            iterations,
            parallelBatches: 1,
            enableEarlyTermination: false,
            convergenceThreshold: 0.01,
            maxExecutionTime: 30
          };

          const startTime = Date.now();
          const engine = new MonteCarloEngine(config);
          await engine.runSimulation(workspace, [], { workspaceId: workspace.workspaceId });
          const executionTime = (Date.now() - startTime) / 1000;

          // Should complete within reasonable time (rough estimate: 0.1s per 10 iterations)
          const expectedMaxTime = (iterations / 10) * 0.1 + 5; // +5s buffer
          expect(executionTime).toBeLessThan(expectedMaxTime);
        }
      ), { numRuns: 10 });
    });
  });
});