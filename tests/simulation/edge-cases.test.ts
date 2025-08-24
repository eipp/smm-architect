import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { MonteCarloEngine } from '../../services/simulator/src/services/monte-carlo-engine';
import { SimulationService } from '../../services/smm-architect/src/services/simulation-service';
import { 
  WorkspaceContext,
  SimulationConfig,
  EdgeCaseScenario,
  SimulationResult
} from '../types/simulation';

describe('Comprehensive Simulation Edge Case Testing', () => {
  let simulationService: SimulationService;
  let baseWorkspace: WorkspaceContext;

  beforeAll(() => {
    simulationService = new SimulationService();
    
    baseWorkspace = {
      workspaceId: 'ws-edge-test',
      tenantId: 'edge-tenant',
      goals: [{ key: 'lead_gen', target: 100, unit: 'leads_per_month' }],
      primaryChannels: ['linkedin', 'x'],
      budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
      connectors: [
        {
          platform: 'linkedin',
          connectorId: 'conn-li',
          accountId: 'li-acc',
          displayName: 'LinkedIn Test',
          status: 'connected'
        }
      ],
      consentRecords: [],
      riskProfile: 'moderate'
    };
  });

  afterEach(() => {
    // Reset any simulation state
    simulationService.reset();
  });

  describe('Budget Edge Cases', () => {
    it('should handle maximum budget scenario correctly', async () => {
      const maxBudgetWorkspace = {
        ...baseWorkspace,
        budget: {
          currency: 'USD',
          weeklyCap: 50000,
          hardCap: 200000
        }
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 1000,
        parallelBatches: 4,
        enableEarlyTermination: false,
        convergenceThreshold: 0.001,
        maxExecutionTime: 60000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        maxBudgetWorkspace,
        [],
        { workspaceId: maxBudgetWorkspace.workspaceId }
      );

      // High budget should result in:
      expect(result.costRisk.mean).toBeLessThan(0.1); // Low cost risk
      expect(result.readinessScore.mean).toBeGreaterThan(0.8); // High readiness
      expect(result.budgetUtilization.mean).toBeLessThan(0.5); // Conservative utilization
      
      // Validate cost estimates don't exceed budget
      expect(result.costEstimate.p99).toBeLessThan(maxBudgetWorkspace.budget.hardCap);
      
      // Should recommend more aggressive spending
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'budget_optimization',
          message: expect.stringContaining('consider_increased_spend')
        })
      );
    });

    it('should handle zero budget scenario', async () => {
      const zeroBudgetWorkspace = {
        ...baseWorkspace,
        budget: {
          currency: 'USD',
          weeklyCap: 0,
          hardCap: 0
        }
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 100,
        parallelBatches: 1,
        enableEarlyTermination: false,
        convergenceThreshold: 0.01,
        maxExecutionTime: 30000
      };

      const engine = new MonteCarloEngine(config);
      
      await expect(
        engine.runSimulation(
          zeroBudgetWorkspace,
          [],
          { workspaceId: zeroBudgetWorkspace.workspaceId }
        )
      ).rejects.toThrow('Budget constraint error: Cannot operate with zero budget');
    });

    it('should handle budget-cost mismatch scenarios', async () => {
      const scenarios = [
        {
          name: 'weekly_exceeds_hard_cap',
          budget: { currency: 'USD', weeklyCap: 10000, hardCap: 5000 },
          expectedError: 'Weekly cap cannot exceed hard cap'
        },
        {
          name: 'unrealistic_low_budget',
          budget: { currency: 'USD', weeklyCap: 1, hardCap: 5 },
          expectedWarning: 'budget_too_low_for_objectives'
        },
        {
          name: 'currency_mismatch',
          budget: { currency: 'EUR', weeklyCap: 1000, hardCap: 5000 },
          expectedAdaptation: 'currency_conversion_applied'
        }
      ];

      for (const scenario of scenarios) {
        const testWorkspace = {
          ...baseWorkspace,
          budget: scenario.budget
        };

        const config: SimulationConfig = {
          randomSeed: 42,
          iterations: 100,
          parallelBatches: 1,
          enableEarlyTermination: false,
          maxExecutionTime: 30000
        };

        const engine = new MonteCarloEngine(config);

        if (scenario.expectedError) {
          await expect(
            engine.runSimulation(testWorkspace, [], { workspaceId: testWorkspace.workspaceId })
          ).rejects.toThrow(scenario.expectedError);
        } else {
          const result = await engine.runSimulation(
            testWorkspace,
            [],
            { workspaceId: testWorkspace.workspaceId }
          );

          if (scenario.expectedWarning) {
            expect(result.warnings).toContainEqual(
              expect.objectContaining({
                type: scenario.expectedWarning
              })
            );
          }

          if (scenario.expectedAdaptation) {
            expect(result.adaptations).toContainEqual(
              expect.objectContaining({
                type: scenario.expectedAdaptation
              })
            );
          }
        }
      }
    });
  });

  describe('Consent Edge Cases', () => {
    it('should handle missing required consent for voice synthesis', async () => {
      const missingConsentWorkspace = {
        ...baseWorkspace,
        consentRecords: [] // No consents
      };

      const voiceWorkflow = [
        {
          type: 'creative',
          config: {
            uses_synthetic_voice: true,
            voice_type: 'brand_spokesperson'
          }
        }
      ];

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 1000,
        parallelBatches: 4,
        enableEarlyTermination: false,
        maxExecutionTime: 60000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        missingConsentWorkspace,
        voiceWorkflow,
        { workspaceId: missingConsentWorkspace.workspaceId }
      );

      // Policy should fail due to missing consent
      expect(result.policyPassPct.mean).toBe(0);
      expect(result.readinessScore.mean).toBeLessThan(0.3);
      
      // Should identify specific consent violation
      expect(result.policyViolations).toContainEqual(
        expect.objectContaining({
          type: 'missing_consent',
          requiredConsent: 'voice_likeness',
          severity: 'blocking'
        })
      );

      // Should provide remediation steps
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'consent_required',
          action: 'obtain_voice_likeness_consent'
        })
      );
    });

    it('should handle expired consent scenarios', async () => {
      const expiredConsentWorkspace = {
        ...baseWorkspace,
        consentRecords: [
          {
            consentId: 'consent-expired',
            type: 'voice_likeness',
            grantedBy: 'user-123',
            grantedAt: '2023-01-01T00:00:00Z',
            expiresAt: '2023-12-31T23:59:59Z', // Expired
            documentRef: 'consent-doc-123'
          }
        ]
      };

      const voiceWorkflow = [
        {
          type: 'creative',
          config: { uses_synthetic_voice: true }
        }
      ];

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 500,
        parallelBatches: 2,
        enableEarlyTermination: false,
        maxExecutionTime: 30000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        expiredConsentWorkspace,
        voiceWorkflow,
        { workspaceId: expiredConsentWorkspace.workspaceId }
      );

      expect(result.policyPassPct.mean).toBe(0);
      expect(result.policyViolations).toContainEqual(
        expect.objectContaining({
          type: 'expired_consent',
          consentId: 'consent-expired'
        })
      );
    });

    it('should handle partial consent coverage', async () => {
      const partialConsentWorkspace = {
        ...baseWorkspace,
        consentRecords: [
          {
            consentId: 'consent-voice',
            type: 'voice_likeness',
            grantedBy: 'user-123',
            grantedAt: '2024-01-01T00:00:00Z',
            expiresAt: '2025-01-01T00:00:00Z'
          }
          // Missing UGC license consent
        ]
      };

      const mixedWorkflow = [
        {
          type: 'creative',
          config: {
            uses_synthetic_voice: true,
            includes_user_content: true // Requires UGC consent
          }
        }
      ];

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 1000,
        parallelBatches: 4,
        maxExecutionTime: 60000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        partialConsentWorkspace,
        mixedWorkflow,
        { workspaceId: partialConsentWorkspace.workspaceId }
      );

      // Should have partial success
      expect(result.policyPassPct.mean).toBeGreaterThan(0);
      expect(result.policyPassPct.mean).toBeLessThan(1);
      
      // Should identify missing UGC consent
      expect(result.policyViolations).toContainEqual(
        expect.objectContaining({
          type: 'missing_consent',
          requiredConsent: 'ugc_license'
        })
      );
    });
  });

  describe('Connector Degradation Edge Cases', () => {
    it('should handle all connectors degraded scenario', async () => {
      const degradedWorkspace = {
        ...baseWorkspace,
        connectors: [
          {
            platform: 'linkedin',
            connectorId: 'conn-li',
            accountId: 'li-acc',
            displayName: 'LinkedIn',
            status: 'degraded'
          },
          {
            platform: 'x',
            connectorId: 'conn-x',
            accountId: 'x-acc',
            displayName: 'X/Twitter',
            status: 'degraded'
          },
          {
            platform: 'instagram',
            connectorId: 'conn-ig',
            accountId: 'ig-acc',
            displayName: 'Instagram',
            status: 'degraded'
          }
        ]
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 1000,
        parallelBatches: 4,
        maxExecutionTime: 60000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        degradedWorkspace,
        [],
        { workspaceId: degradedWorkspace.workspaceId }
      );

      // Technical readiness should be severely impacted
      expect(result.technicalReadiness.mean).toBeLessThan(0.3);
      expect(result.readinessScore.mean).toBeLessThan(0.5);
      
      // Should recommend connector repair
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'connector_maintenance',
          priority: 'high',
          action: 'repair_all_connectors'
        })
      );
    });

    it('should handle revoked connector scenarios', async () => {
      const revokedWorkspace = {
        ...baseWorkspace,
        connectors: [
          {
            platform: 'linkedin',
            connectorId: 'conn-li',
            accountId: 'li-acc',
            displayName: 'LinkedIn',
            status: 'revoked' // OAuth revoked
          }
        ]
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 500,
        parallelBatches: 2,
        maxExecutionTime: 30000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        revokedWorkspace,
        [],
        { workspaceId: revokedWorkspace.workspaceId }
      );

      expect(result.technicalReadiness.mean).toBeLessThan(0.2);
      expect(result.platformAvailability['linkedin']).toBe(0);
      
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'reauthorization_required',
          platform: 'linkedin'
        })
      );
    });

    it('should handle mixed connector health scenarios', async () => {
      const mixedHealthWorkspace = {
        ...baseWorkspace,
        connectors: [
          {
            platform: 'linkedin',
            connectorId: 'conn-li',
            accountId: 'li-acc',
            displayName: 'LinkedIn',
            status: 'connected'
          },
          {
            platform: 'x',
            connectorId: 'conn-x',
            accountId: 'x-acc',
            displayName: 'X/Twitter',
            status: 'degraded'
          },
          {
            platform: 'instagram',
            connectorId: 'conn-ig',
            accountId: 'ig-acc',
            displayName: 'Instagram',
            status: 'revoked'
          }
        ]
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 1000,
        parallelBatches: 4,
        maxExecutionTime: 60000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        mixedHealthWorkspace,
        [],
        { workspaceId: mixedHealthWorkspace.workspaceId }
      );

      // Should balance healthy vs unhealthy connectors
      expect(result.technicalReadiness.mean).toBeGreaterThan(0.3);
      expect(result.technicalReadiness.mean).toBeLessThan(0.8);
      
      // Should recommend targeted fixes
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'selective_connector_repair',
          platforms: ['x', 'instagram']
        })
      );
    });
  });

  describe('High Duplication Risk Scenarios', () => {
    it('should detect and handle high content duplication risk', async () => {
      const highDuplicationWorkspace = {
        ...baseWorkspace,
        contentHistory: {
          recentPosts: Array.from({ length: 100 }, (_, i) => ({
            id: `post-${i}`,
            content: 'Very similar content about AI marketing trends',
            platform: 'linkedin',
            publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
          }))
        }
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 1000,
        parallelBatches: 4,
        maxExecutionTime: 60000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        highDuplicationWorkspace,
        [{ type: 'creative', config: { topic: 'AI marketing trends' } }],
        { workspaceId: highDuplicationWorkspace.workspaceId }
      );

      // High duplication risk should be detected
      expect(result.duplicationRisk.mean).toBeGreaterThan(0.8);
      expect(result.readinessScore.mean).toBeLessThan(0.6);
      
      // Should recommend content diversification
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'content_diversification',
          severity: 'high',
          action: 'generate_alternative_topics'
        })
      );
    });

    it('should handle semantic similarity edge cases', async () => {
      const semanticSimilarityWorkspace = {
        ...baseWorkspace,
        contentHistory: {
          recentPosts: [
            {
              content: 'AI is revolutionizing marketing automation',
              semanticVector: [0.1, 0.2, 0.3, 0.4, 0.5] // Mock vector
            },
            {
              content: 'Marketing automation is being transformed by AI',
              semanticVector: [0.11, 0.19, 0.31, 0.39, 0.51] // Very similar vector
            }
          ]
        }
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 500,
        parallelBatches: 2,
        maxExecutionTime: 30000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        semanticSimilarityWorkspace,
        [{ type: 'creative', config: { topic: 'AI marketing automation' } }],
        { workspaceId: semanticSimilarityWorkspace.workspaceId }
      );

      expect(result.duplicationRisk.mean).toBeGreaterThan(0.7);
      expect(result.contentDiversityScore).toBeLessThan(0.4);
    });
  });

  describe('Extreme Parameter Edge Cases', () => {
    it('should handle very high iteration counts efficiently', async () => {
      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 10000, // Very high iteration count
        parallelBatches: 8,
        enableEarlyTermination: true,
        convergenceThreshold: 0.0001,
        maxExecutionTime: 120000 // 2 minutes max
      };

      const startTime = Date.now();
      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        baseWorkspace,
        [],
        { workspaceId: baseWorkspace.workspaceId }
      );
      const executionTime = Date.now() - startTime;

      // Should complete within time limit
      expect(executionTime).toBeLessThan(120000);
      
      // Should achieve high confidence
      expect(result.confidenceInterval.confidence).toBeGreaterThanOrEqual(0.99);
      
      // May terminate early due to convergence
      if (result.convergenceMetadata?.earlyTermination) {
        expect(result.convergenceMetadata.iterationsExecuted).toBeLessThan(10000);
      }
    });

    it('should handle memory constraints with large workspaces', async () => {
      const largeWorkspace = {
        ...baseWorkspace,
        connectors: Array.from({ length: 1000 }, (_, i) => ({
          platform: 'linkedin',
          connectorId: `conn-${i}`,
          accountId: `acc-${i}`,
          displayName: `Account ${i}`,
          status: 'connected'
        })),
        contentHistory: {
          recentPosts: Array.from({ length: 10000 }, (_, i) => ({
            id: `post-${i}`,
            content: `Content piece ${i}`,
            publishedAt: new Date(Date.now() - i * 60 * 1000).toISOString()
          }))
        }
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 1000,
        parallelBatches: 4,
        memoryOptimization: true,
        maxExecutionTime: 60000
      };

      const initialMemory = process.memoryUsage().heapUsed;
      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        largeWorkspace,
        [],
        { workspaceId: largeWorkspace.workspaceId }
      );
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (finalMemory - initialMemory) / (1024 * 1024); // MB

      expect(result.success).toBe(true);
      expect(memoryDelta).toBeLessThan(500); // Should not use more than 500MB
    });

    it('should handle network timeout scenarios gracefully', async () => {
      const networkConstrainedWorkspace = {
        ...baseWorkspace,
        externalDependencies: [
          'https://api.slow-external-service.com/data',
          'https://api.unreliable-service.com/insights'
        ]
      };

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 500,
        parallelBatches: 2,
        networkTimeout: 1000, // Very short timeout
        maxExecutionTime: 30000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        networkConstrainedWorkspace,
        [],
        { workspaceId: networkConstrainedWorkspace.workspaceId }
      );

      // Should complete despite network issues
      expect(result.success).toBe(true);
      
      // May have reduced confidence due to missing external data
      if (result.warnings.some((w: any) => w.type === 'external_data_unavailable')) {
        expect(result.confidence).toBeLessThan(0.9);
      }
    });
  });

  describe('Workflow Complexity Edge Cases', () => {
    it('should handle deeply nested workflow scenarios', async () => {
      const complexWorkflow = [
        {
          type: 'research',
          config: { depth: 'comprehensive' },
          children: [
            {
              type: 'planner',
              config: { strategy: 'data-driven' },
              children: [
                {
                  type: 'creative',
                  config: { variations: 5 },
                  children: [
                    {
                      type: 'legal',
                      config: { strictness: 'high' },
                      children: [
                        {
                          type: 'publisher',
                          config: { optimization: 'aggressive' }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ];

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 500,
        parallelBatches: 2,
        maxWorkflowDepth: 10,
        maxExecutionTime: 90000
      };

      const engine = new MonteCarloEngine(config);
      const result = await engine.runSimulation(
        baseWorkspace,
        complexWorkflow,
        { workspaceId: baseWorkspace.workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.workflowComplexity).toBeGreaterThan(0.8);
      expect(result.executionPath.depth).toBe(5);
    });

    it('should handle circular workflow dependencies', async () => {
      const circularWorkflow = [
        {
          type: 'creative',
          id: 'creative-1',
          dependencies: ['legal-1']
        },
        {
          type: 'legal',
          id: 'legal-1',
          dependencies: ['creative-1'] // Circular dependency
        }
      ];

      const config: SimulationConfig = {
        randomSeed: 42,
        iterations: 100,
        parallelBatches: 1,
        detectCircularDependencies: true,
        maxExecutionTime: 30000
      };

      const engine = new MonteCarloEngine(config);
      
      await expect(
        engine.runSimulation(
          baseWorkspace,
          circularWorkflow,
          { workspaceId: baseWorkspace.workspaceId }
        )
      ).rejects.toThrow('Circular dependency detected');
    });
  });
});