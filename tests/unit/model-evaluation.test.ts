import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ModelEvaluationService } from '../src/services/model-evaluation-service';
import { AgentManager } from '../src/services/agent-manager';
import { QualityMetricsCalculator } from '../src/utils/quality-metrics';
import { 
  ModelEvaluationResult,
  AgentType,
  EvaluationMetrics,
  DriftDetectionResult,
  CanaryTestResult 
} from '../src/types/evaluation';
import goldenDataset from '../data/model-evaluation/golden-dataset.json';

describe('Model Evaluation & Drift Detection', () => {
  let evaluationService: ModelEvaluationService;
  let agentManager: AgentManager;
  let qualityCalculator: QualityMetricsCalculator;

  beforeAll(async () => {
    evaluationService = new ModelEvaluationService();
    agentManager = new AgentManager();
    qualityCalculator = new QualityMetricsCalculator();
    
    // Load golden dataset
    await evaluationService.loadGoldenDataset(goldenDataset);
  });

  describe('Golden Dataset Evaluation', () => {
    it('should evaluate research agent against golden dataset', async () => {
      const researchSamples = goldenDataset.researchAgent.samples;
      const results: ModelEvaluationResult[] = [];

      for (const sample of researchSamples) {
        const agentOutput = await agentManager.executeAgent('research', {
          workspaceId: 'eval-test-001',
          input: sample.input
        });

        const evaluation = await evaluationService.evaluateAgentOutput(
          'research',
          sample.input,
          agentOutput,
          sample.expectedOutput,
          sample.humanEvaluation
        );

        results.push(evaluation);
      }

      // Calculate aggregate metrics
      const aggregateMetrics = evaluationService.calculateAggregateMetrics(results);

      // Assert minimum quality thresholds
      const thresholds = goldenDataset.evaluationMetrics.qualityThresholds.minimum;
      expect(aggregateMetrics.overallQuality).toBeGreaterThanOrEqual(thresholds.overallQuality);
      expect(aggregateMetrics.accuracy).toBeGreaterThanOrEqual(thresholds.accuracy);
      expect(aggregateMetrics.brandAlignment).toBeGreaterThanOrEqual(thresholds.brandAlignment);
      expect(aggregateMetrics.usefulness).toBeGreaterThanOrEqual(thresholds.usefulness);

      // Specific research agent metrics
      expect(aggregateMetrics.citationCoverage).toBeGreaterThanOrEqual(0.8);
      expect(aggregateMetrics.sourceCredibility).toBeGreaterThanOrEqual(0.85);
      expect(aggregateMetrics.insightDepth).toBeGreaterThanOrEqual(0.8);

      // Log detailed results for analysis
      console.log('Research Agent Evaluation Results:', {
        samplesEvaluated: results.length,
        aggregateMetrics,
        passRate: results.filter(r => r.passed).length / results.length
      });
    });

    it('should evaluate creative agent against golden dataset', async () => {
      const creativeSamples = goldenDataset.creativeAgent.samples;
      const results: ModelEvaluationResult[] = [];

      for (const sample of creativeSamples) {
        const agentOutput = await agentManager.executeAgent('creative', {
          workspaceId: 'eval-test-001',
          input: sample.input
        });

        const evaluation = await evaluationService.evaluateAgentOutput(
          'creative',
          sample.input,
          agentOutput,
          sample.expectedOutput,
          sample.humanEvaluation
        );

        results.push(evaluation);
      }

      const aggregateMetrics = evaluationService.calculateAggregateMetrics(results);
      const thresholds = goldenDataset.evaluationMetrics.qualityThresholds.minimum;

      expect(aggregateMetrics.overallQuality).toBeGreaterThanOrEqual(thresholds.overallQuality);
      expect(aggregateMetrics.brandAlignment).toBeGreaterThanOrEqual(thresholds.brandAlignment);

      // Creative-specific metrics
      expect(aggregateMetrics.engagementPotential).toBeGreaterThanOrEqual(0.8);
      expect(aggregateMetrics.professionalTone).toBeGreaterThanOrEqual(0.85);
      expect(aggregateMetrics.contentValue).toBeGreaterThanOrEqual(0.8);

      // Check for required elements
      const contentResults = results.map(r => r.outputAnalysis.content);
      expect(contentResults.every(c => c.callToActionPresent)).toBe(true);
      expect(contentResults.every(c => c.hashtagsAppropriate)).toBe(true);
    });

    it('should evaluate planner agent against golden dataset', async () => {
      const plannerSamples = goldenDataset.plannerAgent.samples;
      const results: ModelEvaluationResult[] = [];

      for (const sample of plannerSamples) {
        const agentOutput = await agentManager.executeAgent('planner', {
          workspaceId: 'eval-test-001',
          input: sample.input
        });

        const evaluation = await evaluationService.evaluateAgentOutput(
          'planner',
          sample.input,
          agentOutput,
          sample.expectedOutput,
          sample.humanEvaluation
        );

        results.push(evaluation);
      }

      const aggregateMetrics = evaluationService.calculateAggregateMetrics(results);
      const thresholds = goldenDataset.evaluationMetrics.qualityThresholds.minimum;

      expect(aggregateMetrics.overallQuality).toBeGreaterThanOrEqual(thresholds.overallQuality);
      expect(aggregateMetrics.strategicSoundness).toBeGreaterThanOrEqual(0.85);
      expect(aggregateMetrics.executability).toBeGreaterThanOrEqual(0.8);
      expect(aggregateMetrics.budgetRealism).toBeGreaterThanOrEqual(0.85);

      // Planner-specific validations
      const planResults = results.map(r => r.outputAnalysis.campaignPlan);
      expect(planResults.every(p => p.budgetAllocated <= p.budgetAvailable)).toBe(true);
      expect(planResults.every(p => p.timelineRealistic)).toBe(true);
      expect(planResults.every(p => p.channelSynergyScore >= 0.8)).toBe(true);
    });

    it('should evaluate legal agent against golden dataset', async () => {
      const legalSamples = goldenDataset.legalAgent.samples;
      const results: ModelEvaluationResult[] = [];

      for (const sample of legalSamples) {
        const agentOutput = await agentManager.executeAgent('legal', {
          workspaceId: 'eval-test-001',
          input: sample.input
        });

        const evaluation = await evaluationService.evaluateAgentOutput(
          'legal',
          sample.input,
          agentOutput,
          sample.expectedOutput,
          sample.humanEvaluation
        );

        results.push(evaluation);
      }

      const aggregateMetrics = evaluationService.calculateAggregateMetrics(results);

      expect(aggregateMetrics.riskDetectionAccuracy).toBeGreaterThanOrEqual(0.9);
      expect(aggregateMetrics.recommendationQuality).toBeGreaterThanOrEqual(0.85);
      expect(aggregateMetrics.complianceCoverage).toBeGreaterThanOrEqual(0.85);

      // Legal-specific validations
      const legalResults = results.map(r => r.outputAnalysis.complianceAssessment);
      expect(legalResults.every(l => l.risksCategorized)).toBe(true);
      expect(legalResults.every(l => l.recommendationsProvided)).toBe(true);
      expect(legalResults.every(l => l.jurisdictionSpecific)).toBe(true);
    });

    it('should evaluate publisher agent against golden dataset', async () => {
      const publisherSamples = goldenDataset.publisherAgent.samples;
      const results: ModelEvaluationResult[] = [];

      for (const sample of publisherSamples) {
        const agentOutput = await agentManager.executeAgent('publisher', {
          workspaceId: 'eval-test-001',
          input: sample.input
        });

        const evaluation = await evaluationService.evaluateAgentOutput(
          'publisher',
          sample.input,
          agentOutput,
          sample.expectedOutput,
          sample.humanEvaluation
        );

        results.push(evaluation);
      }

      const aggregateMetrics = evaluationService.calculateAggregateMetrics(results);

      expect(aggregateMetrics.schedulingOptimization).toBeGreaterThanOrEqual(0.85);
      expect(aggregateMetrics.audienceTargeting).toBeGreaterThanOrEqual(0.8);
      expect(aggregateMetrics.platformCompliance).toBeGreaterThanOrEqual(0.95);

      // Publisher-specific validations
      const publishResults = results.map(r => r.outputAnalysis.publishingPlan);
      expect(publishResults.every(p => p.scheduleOptimized)).toBe(true);
      expect(publishResults.every(p => p.platformCompliant)).toBe(true);
      expect(publishResults.every(p => p.audienceTargeted)).toBe(true);
    });
  });

  describe('Model Drift Detection', () => {
    it('should detect significant performance degradation', async () => {
      // Simulate model degradation by introducing noise
      const degradedAgent = await agentManager.createDegradedAgent('creative', {
        qualityReduction: 0.3,
        consistencyReduction: 0.4,
        brandAlignmentReduction: 0.2
      });

      const baselineResults = await evaluationService.runBaselineEvaluation('creative');
      const currentResults = await evaluationService.runEvaluation('creative', degradedAgent);

      const driftDetection = await evaluationService.detectDrift(
        baselineResults,
        currentResults,
        {
          significanceThreshold: 0.05,
          minimumSampleSize: 10,
          metricsToMonitor: ['overallQuality', 'brandAlignment', 'accuracy']
        }
      );

      expect(driftDetection.driftDetected).toBe(true);
      expect(driftDetection.affectedMetrics).toContain('overallQuality');
      expect(driftDetection.affectedMetrics).toContain('brandAlignment');
      expect(driftDetection.severity).toBeGreaterThanOrEqual('moderate');
      expect(driftDetection.recommendedActions).toContain('immediate_review');
    });

    it('should detect gradual quality decline over time', async () => {
      const timeSeriesResults = [];
      
      // Simulate gradual degradation over 30 days
      for (let day = 1; day <= 30; day++) {
        const qualityDecline = Math.min(day * 0.01, 0.25); // Max 25% decline
        const dailyResults = await evaluationService.runDailyEvaluation('creative', {
          qualityReduction: qualityDecline,
          timestamp: new Date(Date.now() + day * 24 * 60 * 60 * 1000)
        });
        timeSeriesResults.push(dailyResults);
      }

      const trendAnalysis = await evaluationService.analyzeTrends(timeSeriesResults, {
        trendDetectionWindow: 7, // 7-day window
        significanceLevel: 0.05,
        minTrendStrength: 0.7
      });

      expect(trendAnalysis.trendDetected).toBe(true);
      expect(trendAnalysis.trendDirection).toBe('declining');
      expect(trendAnalysis.trendStrength).toBeGreaterThan(0.7);
      expect(trendAnalysis.projectedMetrics.overallQuality).toBeLessThan(0.8);
      expect(trendAnalysis.recommendedActions).toContain('model_retraining');
    });

    it('should handle false positive drift detection', async () => {
      // Test with normal statistical variation
      const baselineResults = await evaluationService.runBaselineEvaluation('research');
      const currentResults = await evaluationService.runEvaluation('research', null, {
        addStatisticalNoise: true,
        noiseLevel: 0.05 // 5% variation
      });

      const driftDetection = await evaluationService.detectDrift(
        baselineResults,
        currentResults,
        {
          significanceThreshold: 0.01, // Strict threshold
          minimumSampleSize: 50,
          falsePositiveProtection: true
        }
      );

      expect(driftDetection.driftDetected).toBe(false);
      expect(driftDetection.statisticalSignificance).toBeLessThan(0.01);
      expect(driftDetection.confidenceLevel).toBeGreaterThan(0.95);
    });
  });

  describe('Model Swap Canary Testing', () => {
    it('should conduct safe canary test for new model version', async () => {
      const canaryConfig = {
        trafficSplit: 0.05, // 5% traffic to new model
        duration: 24 * 60 * 60 * 1000, // 24 hours
        successCriteria: {
          qualityDelta: -0.05, // Max 5% quality drop
          errorRateIncrease: 0.02, // Max 2% error rate increase
          userSatisfactionDelta: -0.1 // Max 10% satisfaction drop
        },
        rollbackTriggers: {
          qualityDrop: 0.1,
          errorSpike: 0.05,
          userComplaintIncrease: 0.2
        }
      };

      const canaryTest = await evaluationService.startCanaryTest(
        'creative',
        'v2.1.0',
        canaryConfig
      );

      expect(canaryTest.testId).toBeDefined();
      expect(canaryTest.status).toBe('running');
      expect(canaryTest.trafficSplit).toBe(0.05);

      // Simulate canary test running
      await evaluationService.simulateCanaryExecution(canaryTest.testId, {
        duration: 6 * 60 * 60 * 1000, // 6 hours of data
        newModelPerformance: {
          qualityDelta: -0.02, // 2% quality drop (within threshold)
          errorRateIncrease: 0.01,
          userSatisfactionDelta: -0.03
        }
      });

      const canaryResults = await evaluationService.getCanaryResults(canaryTest.testId);

      expect(canaryResults.status).toBe('passing');
      expect(canaryResults.qualityMetrics.qualityDelta).toBeGreaterThan(-0.05);
      expect(canaryResults.recommendedAction).toBe('continue');
    });

    it('should automatically rollback failing canary test', async () => {
      const canaryConfig = {
        trafficSplit: 0.1,
        duration: 24 * 60 * 60 * 1000,
        autoRollback: true,
        rollbackTriggers: {
          qualityDrop: 0.1,
          errorSpike: 0.05
        }
      };

      const canaryTest = await evaluationService.startCanaryTest(
        'research',
        'v1.8.0-experimental',
        canaryConfig
      );

      // Simulate failing model performance
      await evaluationService.simulateCanaryExecution(canaryTest.testId, {
        duration: 2 * 60 * 60 * 1000, // 2 hours
        newModelPerformance: {
          qualityDelta: -0.15, // 15% quality drop (exceeds threshold)
          errorRateIncrease: 0.08, // 8% error increase (exceeds threshold)
          criticalFailures: 3
        }
      });

      const canaryResults = await evaluationService.getCanaryResults(canaryTest.testId);

      expect(canaryResults.status).toBe('failed');
      expect(canaryResults.rollbackExecuted).toBe(true);
      expect(canaryResults.rollbackReason).toContain('quality_threshold_exceeded');
      expect(canaryResults.rollbackTimestamp).toBeDefined();
      expect(canaryResults.trafficSplit).toBe(0); // Traffic reverted to stable model
    });

    it('should conduct gradual rollout after successful canary', async () => {
      const canaryConfig = {
        trafficSplit: 0.05,
        duration: 12 * 60 * 60 * 1000, // 12 hours
        gradualRolloutEnabled: true,
        rolloutSteps: [0.1, 0.25, 0.5, 0.75, 1.0],
        stepDuration: 6 * 60 * 60 * 1000 // 6 hours per step
      };

      const canaryTest = await evaluationService.startCanaryTest(
        'planner',
        'v3.0.0',
        canaryConfig
      );

      // Simulate successful canary
      await evaluationService.simulateCanaryExecution(canaryTest.testId, {
        duration: 12 * 60 * 60 * 1000,
        newModelPerformance: {
          qualityDelta: 0.05, // 5% improvement
          errorRateIncrease: -0.01, // 1% error reduction
          userSatisfactionDelta: 0.08 // 8% satisfaction improvement
        }
      });

      const rolloutPlan = await evaluationService.createRolloutPlan(canaryTest.testId);

      expect(rolloutPlan.approved).toBe(true);
      expect(rolloutPlan.steps).toHaveLength(5);
      expect(rolloutPlan.totalDuration).toBe(30 * 60 * 60 * 1000); // 30 hours total
      expect(rolloutPlan.monitoringEnabled).toBe(true);

      // Execute first rollout step
      const step1Results = await evaluationService.executeRolloutStep(rolloutPlan.id, 0);

      expect(step1Results.trafficSplit).toBe(0.1);
      expect(step1Results.status).toBe('monitoring');
      expect(step1Results.qualityMetrics).toBeDefined();
    });
  });

  describe('Continuous Quality Monitoring', () => {
    it('should monitor model performance in production', async () => {
      const monitoringConfig = {
        agents: ['creative', 'research', 'planner'],
        samplingRate: 0.1, // Monitor 10% of requests
        alertThresholds: {
          qualityDrop: 0.1,
          errorRateIncrease: 0.05,
          latencyIncrease: 0.3
        },
        reportingInterval: 60 * 60 * 1000 // Hourly reports
      };

      const monitor = await evaluationService.startProductionMonitoring(monitoringConfig);

      expect(monitor.monitorId).toBeDefined();
      expect(monitor.status).toBe('active');
      expect(monitor.agentsMonitored).toHaveLength(3);

      // Simulate production traffic
      await evaluationService.simulateProductionTraffic(monitor.monitorId, {
        duration: 4 * 60 * 60 * 1000, // 4 hours
        requestVolume: 1000,
        qualityVariation: 0.03, // Normal variation
        errorRate: 0.02
      });

      const monitoringReport = await evaluationService.getMonitoringReport(monitor.monitorId);

      expect(monitoringReport.samplesProcessed).toBeGreaterThan(80); // 10% of 1000 requests
      expect(monitoringReport.qualityMetrics.averageQuality).toBeGreaterThan(0.8);
      expect(monitoringReport.alerts).toHaveLength(0); // No alerts for normal operation
      expect(monitoringReport.trendAnalysis.overallTrend).toBe('stable');
    });

    it('should generate alerts for quality degradation', async () => {
      const monitoringConfig = {
        agents: ['creative'],
        samplingRate: 0.2,
        alertThresholds: {
          qualityDrop: 0.05, // Sensitive threshold
          consecutiveFailures: 3
        }
      };

      const monitor = await evaluationService.startProductionMonitoring(monitoringConfig);

      // Simulate quality degradation
      await evaluationService.simulateProductionTraffic(monitor.monitorId, {
        duration: 2 * 60 * 60 * 1000,
        requestVolume: 500,
        qualityVariation: -0.08, // 8% quality drop
        errorRate: 0.04
      });

      const alerts = await evaluationService.getActiveAlerts(monitor.monitorId);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('quality_degradation');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].affectedAgent).toBe('creative');
      expect(alerts[0].metricValues.qualityDrop).toBeGreaterThan(0.05);
      expect(alerts[0].recommendedActions).toContain('investigate_model_performance');
    });
  });

  describe('Human-in-the-Loop Evaluation', () => {
    it('should coordinate human review of edge cases', async () => {
      const humanReviewConfig = {
        samplingStrategy: 'edge_cases',
        reviewerPool: ['expert-reviewer-001', 'expert-reviewer-002'],
        consensusRequired: true,
        maxReviewTime: 24 * 60 * 60 * 1000 // 24 hours
      };

      const edgeCases = await evaluationService.identifyEdgeCases('creative', {
        uncertaintyThreshold: 0.3,
        anomalyDetection: true,
        diversityMeasure: 'semantic'
      });

      expect(edgeCases).toHaveLength(5); // Expect some edge cases found

      const humanReview = await evaluationService.submitForHumanReview(
        edgeCases,
        humanReviewConfig
      );

      expect(humanReview.reviewId).toBeDefined();
      expect(humanReview.status).toBe('pending');
      expect(humanReview.assignedReviewers).toHaveLength(2);

      // Simulate human review completion
      const reviewResults = await evaluationService.simulateHumanReview(humanReview.reviewId, {
        reviewer1: {
          scores: { quality: 0.8, brandAlignment: 0.85, usefulness: 0.75 },
          approved: true,
          comments: "Good quality with minor brand voice inconsistencies"
        },
        reviewer2: {
          scores: { quality: 0.82, brandAlignment: 0.8, usefulness: 0.78 },
          approved: true,
          comments: "Acceptable quality, suggests model fine-tuning"
        }
      });

      expect(reviewResults.consensusReached).toBe(true);
      expect(reviewResults.aggregatedScores.quality).toBeCloseTo(0.81, 1);
      expect(reviewResults.overallApproval).toBe(true);
      expect(reviewResults.feedbackForTraining).toBeDefined();
    });
  });
});