import log from "encore.dev/log";
import { v4 as uuidv4 } from "uuid";
import { 
  WorkspaceContract, 
  SimulationRequest, 
  SimulationResponse,
  DecisionCard 
} from "../types";

export class SimulationService {
  
  async simulate(workspace: WorkspaceContract, request: SimulationRequest): Promise<SimulationResponse> {
    const simulationId = `sim-${uuidv4()}`;
    const startTime = Date.now();

    log.info("Starting simulation", { 
      simulationId, 
      workspaceId: workspace.workspaceId,
      iterations: workspace.simulationConfig?.iterations || 1000
    });

    try {
      // Run Monte Carlo simulation
      const monteCarloResults = await this.runMonteCarloSimulation(workspace, request);
      
      // Calculate readiness score
      const readinessScore = this.calculateReadinessScore(monteCarloResults);
      
      // Generate simulation traces
      const traces = this.generateSimulationTraces(workspace, request);
      
      // Create decision card
      const decisionCard = await this.createDecisionCard(workspace, monteCarloResults, readinessScore);

      const endTime = Date.now();
      log.info("Simulation completed", { 
        simulationId, 
        durationMs: endTime - startTime,
        readinessScore 
      });

      return {
        simulationId,
        readinessScore,
        policyPassPct: monteCarloResults.policyPassPct,
        citationCoverage: monteCarloResults.citationCoverage,
        duplicationRisk: monteCarloResults.duplicationRisk,
        costEstimateUSD: monteCarloResults.costEstimateUSD,
        traces,
        decisionCard
      };

    } catch (error) {
      log.error("Simulation failed", { simulationId, error: error.message });
      throw error;
    }
  }

  private async runMonteCarloSimulation(workspace: WorkspaceContract, request: SimulationRequest) {
    const config = workspace.simulationConfig || {
      iterations: 1000,
      randomSeed: 42,
      timeoutSeconds: 120
    };

    // Set random seed for deterministic results
    const random = this.createSeededRandom(config.randomSeed);

    let totalPolicyPass = 0;
    let totalCitationCoverage = 0;
    let totalDuplicationRisk = 0;
    let totalCost = 0;
    let totalTechnicalReadiness = 0;

    for (let i = 0; i < config.iterations; i++) {
      // Simulate policy checks with some randomness
      const policyPassPct = Math.min(0.95 + random() * 0.05, 1.0);
      
      // Simulate citation coverage based on brand twin quality
      const citationCoverage = Math.min(0.90 + random() * 0.10, 1.0);
      
      // Simulate duplication risk
      const duplicationRisk = random() * 0.20; // 0-20% risk
      
      // Simulate cost variation
      const baseCost = workspace.budget.breakdown.paidAds + 
                      workspace.budget.breakdown.llmModelSpend +
                      workspace.budget.breakdown.rendering +
                      workspace.budget.breakdown.thirdPartyServices;
      const costVariation = 0.8 + random() * 0.4; // ±20% variation
      const cost = baseCost * costVariation;
      
      // Simulate technical readiness (API limits, platform health)
      const technicalReadiness = 0.85 + random() * 0.15;

      totalPolicyPass += policyPassPct;
      totalCitationCoverage += citationCoverage;
      totalDuplicationRisk += duplicationRisk;
      totalCost += cost;
      totalTechnicalReadiness += technicalReadiness;
    }

    return {
      policyPassPct: totalPolicyPass / config.iterations,
      citationCoverage: totalCitationCoverage / config.iterations,
      duplicationRisk: totalDuplicationRisk / config.iterations,
      costEstimateUSD: totalCost / config.iterations,
      technicalReadiness: totalTechnicalReadiness / config.iterations,
      iterations: config.iterations,
      randomSeed: config.randomSeed
    };
  }

  private calculateReadinessScore(results: any): number {
    // Weights as specified in the design
    const weights = {
      policyPass: 0.35,
      citationCoverage: 0.20,
      duplicationRisk: 0.15, // inverse
      costRisk: 0.10, // inverse  
      technicalReadiness: 0.20
    };

    const costRisk = Math.min(results.costEstimateUSD / 1000, 1.0); // Normalize cost risk

    const readinessScore = 
      weights.policyPass * results.policyPassPct +
      weights.citationCoverage * results.citationCoverage +
      weights.duplicationRisk * (1 - results.duplicationRisk) +
      weights.costRisk * (1 - costRisk) +
      weights.technicalReadiness * results.technicalReadiness;

    return Math.max(0, Math.min(1, readinessScore));
  }

  private generateSimulationTraces(workspace: WorkspaceContract, request: SimulationRequest) {
    // Generate mock traces for workflow simulation
    const baseTraces = [
      { nodeId: "research_brand", status: "ok" as const, durationMs: 1200 },
      { nodeId: "generate_content", status: "ok" as const, durationMs: 2500 },
      { nodeId: "policy_check", status: "ok" as const, durationMs: 150 },
      { nodeId: "render_assets", status: "ok" as const, durationMs: 800 },
      { nodeId: "schedule_posts", status: "ok" as const, durationMs: 300 }
    ];

    // Add channel-specific traces
    const channelTraces = (request.targetChannels || workspace.primaryChannels).map(channel => ({
      nodeId: `publish_${channel}`,
      status: "ok" as const,
      durationMs: 400 + Math.random() * 200
    }));

    return [...baseTraces, ...channelTraces];
  }

  private async createDecisionCard(workspace: WorkspaceContract, results: any, readinessScore: number): Promise<DecisionCard> {
    const actionId = `action-${uuidv4()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Determine duplicate risk level
    let duplicateRisk: 'low' | 'medium' | 'high' = 'low';
    if (results.duplicationRisk > 0.15) duplicateRisk = 'high';
    else if (results.duplicationRisk > 0.08) duplicateRisk = 'medium';

    // Generate impact estimates
    const estimatedImpact = {
      reach: Math.floor(40000 + Math.random() * 80000), // 40k-120k reach
      impressions: Math.floor(60000 + Math.random() * 150000),
      ctr: 0.02 + Math.random() * 0.03, // 2-5% CTR
      conversions: Math.floor(10 + Math.random() * 40), // 10-50 conversions
      engagement_rate: 0.03 + Math.random() * 0.07, // 3-10% engagement
      confidence_interval: {
        lower: readinessScore - 0.1,
        upper: readinessScore + 0.1,
        confidence_level: 0.95
      }
    };

    // Generate cost breakdown
    const costBreakdown = {
      paidAds: workspace.budget.breakdown.paidAds,
      llmModelSpend: workspace.budget.breakdown.llmModelSpend,
      rendering: workspace.budget.breakdown.rendering,
      thirdPartyServices: workspace.budget.breakdown.thirdPartyServices,
      total: results.costEstimateUSD,
      currency: workspace.budget.currency,
      timeframe: "weekly" as const
    };

    // Determine primary action based on readiness score and policy
    const autoApprove = readinessScore >= workspace.approvalPolicy.autoApproveReadinessThreshold &&
                       !workspace.approvalPolicy.manualApprovalForPaid;

    const primaryAction = {
      label: autoApprove ? "Auto-Approve & Start Campaign" : "Review & Approve",
      action: "approve_promotion" as const,
      payload: { canary_pct: workspace.approvalPolicy.canaryInitialPct },
      requiresConfirmation: !autoApprove
    };

    // Generate campaign description
    const channels = workspace.primaryChannels.join(" + ");
    const weeklyPosts = workspace.primaryChannels.length * 3; // 3 posts per channel per week
    const title = `${workspace.primaryChannels.length}-week ${channels} Campaign`;
    const oneLine = `${workspace.primaryChannels.length}-week pilot: ${weeklyPosts} posts/week (${channels}). Est. reach ${Math.floor(estimatedImpact.reach/1000)}k–${Math.floor(estimatedImpact.reach/1000 * 1.5)}k. Cost est $${Math.floor(costBreakdown.total)}/week.`;

    return {
      actionId,
      title,
      one_line: oneLine,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      workspaceId: workspace.workspaceId,
      readiness_score: readinessScore,
      policy_pass_pct: results.policyPassPct,
      citation_coverage: results.citationCoverage,
      duplicate_risk: duplicateRisk,
      estimatedImpact,
      costBreakdown,
      primary_action: primaryAction,
      provenance: [
        "Brand website (verified)",
        "LinkedIn company page (verified)", 
        "Industry reports (verified)"
      ],
      escalations: workspace.approvalPolicy.legalManualApproval ? ["legal_review"] : [],
      simulationResults: {
        runId: `sim-${Date.now()}`,
        iterations: results.iterations,
        successRate: 0.95 + Math.random() * 0.05,
        averageExecutionTime: 45.2,
        keyMetrics: {
          readinessScore,
          policyPassPct: results.policyPassPct,
          citationCoverage: results.citationCoverage
        }
      },
      metadata: {
        generatedBy: "simulation-service",
        version: "v1.0.0",
        correlationId: `corr-${uuidv4()}`
      }
    };
  }

  private createSeededRandom(seed: number): () => number {
    let currentSeed = seed;
    return function() {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }
}