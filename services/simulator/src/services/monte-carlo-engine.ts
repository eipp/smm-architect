import seedrandom from 'seedrandom';
import { mean, std, quantile } from 'mathjs';
import { 
  SimulationRequest, 
  MonteCarloResults, 
  WorkspaceContext, 
  SimulationParameters,
  ReadinessWeights,
  ConfidenceInterval,
  WorkflowNode,
  SimulationConfig
} from '../types';

export class MonteCarloEngine {
  private rng: () => number;
  private config: SimulationConfig;
  private weights: ReadinessWeights;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.rng = seedrandom(config.randomSeed.toString());
    
    // Default readiness score weights from design specification
    this.weights = {
      policyPass: 0.35,
      citationCoverage: 0.20,
      duplicationRisk: 0.15, // inverse
      costRisk: 0.10, // inverse
      technicalReadiness: 0.20
    };
  }

  /**
   * Run Monte Carlo simulation with deterministic seeding
   */
  async runSimulation(
    workspace: WorkspaceContext,
    workflow: WorkflowNode[],
    request: SimulationRequest
  ): Promise<MonteCarloResults> {
    const iterations = this.config.iterations;
    const results = {
      readinessScores: [] as number[],
      policyPassPcts: [] as number[],
      citationCoverages: [] as number[],
      duplicationRisks: [] as number[],
      costEstimates: [] as number[],
      technicalReadiness: [] as number[]
    };

    // Run iterations in batches for memory efficiency
    const batchSize = Math.min(100, Math.ceil(iterations / this.config.parallelBatches));
    
    for (let batch = 0; batch < Math.ceil(iterations / batchSize); batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, iterations);
      
      await this.runBatch(
        batchStart, 
        batchEnd, 
        workspace, 
        workflow, 
        request, 
        results
      );

      // Check for early convergence
      if (this.config.enableEarlyTermination && batch > 5) {
        const converged = this.checkConvergence(results.readinessScores);
        if (converged) {
          console.log(`Simulation converged early at iteration ${batchEnd}`);
          break;
        }
      }
    }

    return this.analyzeResults(results);
  }

  /**
   * Run a batch of simulation iterations
   */
  private async runBatch(
    startIdx: number,
    endIdx: number,
    workspace: WorkspaceContext,
    workflow: WorkflowNode[],
    request: SimulationRequest,
    results: any
  ): Promise<void> {
    for (let i = startIdx; i < endIdx; i++) {
      const iterationResults = await this.runSingleIteration(
        workspace, 
        workflow, 
        request,
        i
      );

      results.readinessScores.push(iterationResults.readinessScore);
      results.policyPassPcts.push(iterationResults.policyPassPct);
      results.citationCoverages.push(iterationResults.citationCoverage);
      results.duplicationRisks.push(iterationResults.duplicationRisk);
      results.costEstimates.push(iterationResults.costEstimate);
      results.technicalReadiness.push(iterationResults.technicalReadiness);
    }
  }

  /**
   * Run a single simulation iteration
   */
  private async runSingleIteration(
    workspace: WorkspaceContext,
    workflow: WorkflowNode[],
    request: SimulationRequest,
    iteration: number
  ): Promise<{
    readinessScore: number;
    policyPassPct: number;
    citationCoverage: number;
    duplicationRisk: number;
    costEstimate: number;
    technicalReadiness: number;
  }> {
    // Generate simulation parameters with controlled randomness
    const params = this.generateSimulationParameters(workspace, iteration);
    
    // Simulate policy compliance
    const policyPassPct = this.simulatePolicyCompliance(workspace, params);
    
    // Simulate citation coverage based on content quality
    const citationCoverage = this.simulateCitationCoverage(workspace, params);
    
    // Simulate duplication risk
    const duplicationRisk = this.simulateDuplicationRisk(workspace, params);
    
    // Simulate cost estimate with market variations
    const costEstimate = this.simulateCostEstimate(workspace, params);
    
    // Simulate technical readiness
    const technicalReadiness = this.simulateTechnicalReadiness(workspace, workflow, params);
    
    // Calculate overall readiness score
    const readinessScore = this.calculateReadinessScore({
      policyPassPct,
      citationCoverage,
      duplicationRisk,
      costEstimate,
      technicalReadiness,
      workspace
    });

    return {
      readinessScore,
      policyPassPct,
      citationCoverage,
      duplicationRisk,
      costEstimate,
      technicalReadiness
    };
  }

  /**
   * Generate simulation parameters with controlled randomness
   */
  private generateSimulationParameters(
    workspace: WorkspaceContext,
    iteration: number
  ): SimulationParameters {
    // Use Box-Muller transform for normal distribution
    const normalRandom = () => {
      const u1 = this.rng();
      const u2 = this.rng();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    // Base parameters with controlled variance
    const baseVolatility = this.mapRiskProfileToVolatility(workspace.riskProfile);
    
    return {
      marketVolatility: Math.max(0, baseVolatility + normalRandom() * 0.1),
      competitorActivity: Math.max(0, 0.5 + normalRandom() * 0.2),
      seasonalFactor: 0.8 + 0.4 * Math.sin(2 * Math.PI * iteration / 365), // Annual cycle
      
      platformHealth: workspace.primaryChannels.reduce((acc, channel) => {
        acc[channel] = Math.max(0.1, Math.min(1.0, 0.9 + normalRandom() * 0.1));
        return acc;
      }, {} as { [key: string]: number }),
      
      rateLimits: workspace.primaryChannels.reduce((acc, channel) => {
        acc[channel] = this.getPlatformRateLimit(channel) * (0.8 + this.rng() * 0.4);
        return acc;
      }, {} as { [key: string]: number }),
      
      algorithmChanges: workspace.primaryChannels.reduce((acc, channel) => {
        acc[channel] = this.rng() < 0.05 ? 0.7 + this.rng() * 0.3 : 1.0; // 5% chance of algorithm change
        return acc;
      }, {} as { [key: string]: number }),
      
      contentQuality: Math.max(0.1, Math.min(1.0, 0.8 + normalRandom() * 0.15)),
      audienceReceptiveness: Math.max(0.1, Math.min(1.0, 0.75 + normalRandom() * 0.2)),
      timingOptimization: Math.max(0.1, Math.min(1.0, 0.85 + normalRandom() * 0.1)),
      
      apiLatency: Math.max(10, 100 + normalRandom() * 50), // milliseconds
      systemLoad: Math.max(0.1, Math.min(0.9, 0.3 + normalRandom() * 0.2)),
      networkReliability: Math.max(0.8, Math.min(1.0, 0.95 + normalRandom() * 0.05))
    };
  }

  /**
   * Simulate policy compliance with various factors
   */
  private simulatePolicyCompliance(
    workspace: WorkspaceContext,
    params: SimulationParameters
  ): number {
    let basePolicyPass = 0.95; // Start with high baseline
    
    // Risk profile affects policy compliance
    const riskMultiplier = {
      'low': 0.98,
      'medium': 0.95,
      'high': 0.90,
      'enterprise': 0.99
    }[workspace.riskProfile] || 0.95;
    
    basePolicyPass *= riskMultiplier;
    
    // Market volatility can affect compliance (rushed decisions)
    basePolicyPass *= (1 - params.marketVolatility * 0.1);
    
    // Content quality affects policy compliance
    basePolicyPass *= params.contentQuality;
    
    // Add some random variance
    const variance = (this.rng() - 0.5) * 0.02;
    
    return Math.max(0.5, Math.min(1.0, basePolicyPass + variance));
  }

  /**
   * Simulate citation coverage based on content research quality
   */
  private simulateCitationCoverage(
    workspace: WorkspaceContext,
    params: SimulationParameters
  ): number {
    let baseCoverage = 0.92; // High baseline for citation coverage
    
    // Content quality directly affects citation coverage
    baseCoverage *= params.contentQuality;
    
    // Market volatility can reduce research thoroughness
    baseCoverage *= (1 - params.marketVolatility * 0.05);
    
    // Competitor activity might pressure faster content creation
    baseCoverage *= (1 - params.competitorActivity * 0.03);
    
    // Add controlled randomness
    const variance = (this.rng() - 0.5) * 0.03;
    
    return Math.max(0.7, Math.min(1.0, baseCoverage + variance));
  }

  /**
   * Simulate duplication risk
   */
  private simulateDuplicationRisk(
    workspace: WorkspaceContext,
    params: SimulationParameters
  ): number {
    let baseRisk = 0.08; // Low baseline risk
    
    // High competitor activity increases duplication risk
    baseRisk += params.competitorActivity * 0.1;
    
    // Poor content quality might lead to more generic content
    baseRisk += (1 - params.contentQuality) * 0.15;
    
    // Market volatility can pressure faster, less original content
    baseRisk += params.marketVolatility * 0.05;
    
    // Add randomness
    const variance = this.rng() * 0.05;
    
    return Math.max(0.0, Math.min(0.4, baseRisk + variance));
  }

  /**
   * Simulate cost estimate with market variations
   */
  private simulateCostEstimate(
    workspace: WorkspaceContext,
    params: SimulationParameters
  ): number {
    const baseCost = workspace.budget.breakdown.paidAds + 
                    workspace.budget.breakdown.llmModelSpend +
                    workspace.budget.breakdown.rendering +
                    workspace.budget.breakdown.thirdPartyServices;
    
    let costMultiplier = 1.0;
    
    // Market volatility affects costs
    costMultiplier += params.marketVolatility * 0.2;
    
    // Competitor activity can drive up ad costs
    costMultiplier += params.competitorActivity * 0.15;
    
    // Seasonal factors
    costMultiplier *= params.seasonalFactor;
    
    // Platform health affects efficiency
    const avgPlatformHealth = Object.values(params.platformHealth).reduce((a, b) => a + b, 0) / 
                              Object.values(params.platformHealth).length;
    costMultiplier *= (2 - avgPlatformHealth); // Poor health increases costs
    
    // Add random variance (±15%)
    const variance = (this.rng() - 0.5) * 0.3;
    costMultiplier += variance;
    
    return Math.max(baseCost * 0.7, baseCost * Math.max(0.8, costMultiplier));
  }

  /**
   * Simulate technical readiness
   */
  private simulateTechnicalReadiness(
    workspace: WorkspaceContext,
    workflow: WorkflowNode[],
    params: SimulationParameters
  ): number {
    let baseReadiness = 0.88; // Good baseline
    
    // System load affects readiness
    baseReadiness *= (1 - params.systemLoad * 0.2);
    
    // Network reliability
    baseReadiness *= params.networkReliability;
    
    // API latency affects readiness
    const latencyImpact = Math.max(0, (params.apiLatency - 100) / 500);
    baseReadiness *= (1 - latencyImpact * 0.1);
    
    // Platform health affects technical readiness
    const avgPlatformHealth = Object.values(params.platformHealth).reduce((a, b) => a + b, 0) / 
                              Object.values(params.platformHealth).length;
    baseReadiness *= avgPlatformHealth;
    
    // Workflow complexity
    const complexityFactor = Math.min(1.0, workflow.length / 10);
    baseReadiness *= (1 - complexityFactor * 0.1);
    
    // Add random variance
    const variance = (this.rng() - 0.5) * 0.04;
    
    return Math.max(0.6, Math.min(1.0, baseReadiness + variance));
  }

  /**
   * Calculate overall readiness score using weighted formula
   */
  private calculateReadinessScore(params: {
    policyPassPct: number;
    citationCoverage: number;
    duplicationRisk: number;
    costEstimate: number;
    technicalReadiness: number;
    workspace: WorkspaceContext;
  }): number {
    const { policyPassPct, citationCoverage, duplicationRisk, costEstimate, technicalReadiness, workspace } = params;
    
    // Normalize cost risk (higher cost = higher risk)
    const costRisk = Math.min(1.0, costEstimate / workspace.budget.hardCap);
    
    // Calculate weighted readiness score
    const readinessScore = 
      this.weights.policyPass * policyPassPct +
      this.weights.citationCoverage * citationCoverage +
      this.weights.duplicationRisk * (1 - duplicationRisk) +
      this.weights.costRisk * (1 - costRisk) +
      this.weights.technicalReadiness * technicalReadiness;

    return Math.max(0, Math.min(1, readinessScore));
  }

  /**
   * Analyze simulation results and calculate statistics
   */
  private analyzeResults(results: any): MonteCarloResults {
    const confidenceLevel = this.config.confidenceLevel;
    const alpha = 1 - confidenceLevel;
    
    return {
      readinessScore: this.calculateStatistics(results.readinessScores, confidenceLevel),
      policyPassPct: this.calculateStatistics(results.policyPassPcts, confidenceLevel),
      citationCoverage: this.calculateStatistics(results.citationCoverages, confidenceLevel),
      duplicationRisk: this.calculateStatistics(results.duplicationRisks, confidenceLevel),
      costEstimate: this.calculateStatistics(results.costEstimates, confidenceLevel),
      technicalReadiness: this.calculateStatistics(results.technicalReadiness, confidenceLevel),
      convergenceMetrics: this.analyzeConvergence(results.readinessScores)
    };
  }

  /**
   * Calculate statistics for a dataset
   */
  private calculateStatistics(data: number[], confidenceLevel: number): {
    mean: number;
    std: number;
    percentiles: { [key: string]: number };
    confidence: ConfidenceInterval;
  } {
    const dataMean = mean(data) as number;
    const dataStd = std(data, 'unbiased') as number;
    const alpha = 1 - confidenceLevel;
    
    // Calculate percentiles
    const percentiles = {
      'p5': quantile(data, 0.05) as number,
      'p25': quantile(data, 0.25) as number,
      'p50': quantile(data, 0.50) as number,
      'p75': quantile(data, 0.75) as number,
      'p95': quantile(data, 0.95) as number
    };
    
    // Calculate confidence interval (assuming normal distribution)
    const marginOfError = 1.96 * (dataStd / Math.sqrt(data.length));
    
    return {
      mean: dataMean,
      std: dataStd,
      percentiles,
      confidence: {
        lower: dataMean - marginOfError,
        upper: dataMean + marginOfError,
        level: confidenceLevel
      }
    };
  }

  /**
   * Check for simulation convergence
   */
  private checkConvergence(readinessScores: number[]): boolean {
    if (readinessScores.length < 100) return false;
    
    const recentScores = readinessScores.slice(-50);
    const olderScores = readinessScores.slice(-100, -50);
    
    const recentMean = mean(recentScores) as number;
    const olderMean = mean(olderScores) as number;
    
    return Math.abs(recentMean - olderMean) < this.config.convergenceThreshold;
  }

  /**
   * Analyze convergence metrics
   */
  private analyzeConvergence(readinessScores: number[]): {
    converged: boolean;
    requiredIterations: number;
    stabilityThreshold: number;
  } {
    const converged = this.checkConvergence(readinessScores);
    
    return {
      converged,
      requiredIterations: readinessScores.length,
      stabilityThreshold: this.config.convergenceThreshold
    };
  }

  /**
   * Helper methods
   */
  private mapRiskProfileToVolatility(profile: string): number {
    const mapping = {
      'low': 0.05,
      'medium': 0.10,
      'high': 0.20,
      'enterprise': 0.03
    };
    return mapping[profile as keyof typeof mapping] || 0.10;
  }

  private getPlatformRateLimit(platform: string): number {
    const limits = {
      'linkedin': 5,
      'x': 300,
      'instagram': 10,
      'facebook': 25,
      'youtube': 5,
      'tiktok': 10
    };
    return limits[platform as keyof typeof limits] || 10;
  }
}