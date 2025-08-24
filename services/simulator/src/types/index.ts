/**
 * Types for Monte Carlo Simulation Service
 */

export interface SimulationRequest {
  workspaceId: string;
  workflowJson: any;
  dryRun?: boolean;
  iterations?: number;
  randomSeed?: number;
  timeoutSeconds?: number;
  targetChannels?: string[];
}

export interface SimulationResponse {
  simulationId: string;
  readinessScore: number;
  policyPassPct: number;
  citationCoverage: number;
  duplicationRisk: number;
  costEstimateUSD: number;
  technicalReadiness: number;
  traces: SimulationTrace[];
  confidence: ConfidenceInterval;
  metadata: SimulationMetadata;
}

export interface SimulationTrace {
  nodeId: string;
  status: 'ok' | 'warning' | 'error';
  durationMs: number;
  message?: string;
  metadata?: any;
  iteration?: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number; // e.g., 0.95 for 95% confidence
}

export interface SimulationMetadata {
  iterations: number;
  randomSeed: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  version: string;
}

export interface MonteCarloResults {
  readinessScore: {
    mean: number;
    std: number;
    percentiles: { [key: string]: number };
    confidence: ConfidenceInterval;
  };
  policyPassPct: {
    mean: number;
    std: number;
    confidence: ConfidenceInterval;
  };
  citationCoverage: {
    mean: number;
    std: number;
    confidence: ConfidenceInterval;
  };
  duplicationRisk: {
    mean: number;
    std: number;
    confidence: ConfidenceInterval;
  };
  costEstimate: {
    mean: number;
    std: number;
    confidence: ConfidenceInterval;
  };
  technicalReadiness: {
    mean: number;
    std: number;
    confidence: ConfidenceInterval;
  };
  convergenceMetrics: {
    converged: boolean;
    requiredIterations: number;
    stabilityThreshold: number;
  };
}

export interface WorkspaceContext {
  workspaceId: string;
  goals: Array<{
    key: string;
    target: number;
    unit: string;
  }>;
  primaryChannels: string[];
  budget: {
    currency: string;
    weeklyCap: number;
    hardCap: number;
    breakdown: {
      paidAds: number;
      llmModelSpend: number;
      rendering: number;
      thirdPartyServices: number;
    };
  };
  approvalPolicy: {
    autoApproveReadinessThreshold: number;
    canaryInitialPct: number;
    canaryWatchWindowHours: number;
    manualApprovalForPaid: boolean;
    legalManualApproval: boolean;
  };
  riskProfile: 'low' | 'medium' | 'high' | 'enterprise';
  connectors?: Array<{
    platform: string;
    status: 'unconnected' | 'connected' | 'degraded' | 'revoked';
    lastConnectedAt?: string;
  }>;
}

export interface SimulationParameters {
  // Market conditions
  marketVolatility: number;
  competitorActivity: number;
  seasonalFactor: number;
  
  // Platform-specific parameters
  platformHealth: { [platform: string]: number };
  rateLimits: { [platform: string]: number };
  algorithmChanges: { [platform: string]: number };
  
  // Content performance
  contentQuality: number;
  audienceReceptiveness: number;
  timingOptimization: number;
  
  // Technical factors
  apiLatency: number;
  systemLoad: number;
  networkReliability: number;
}

export interface ReadinessWeights {
  policyPass: number;
  citationCoverage: number;
  duplicationRisk: number;
  costRisk: number;
  technicalReadiness: number;
}

export interface PlatformLimits {
  postsPerHour: number;
  postsPerDay: number;
  characterLimit: number;
  imageLimit: number;
  videoLimit: number;
  apiCallsPerMinute: number;
}

export interface WorkflowNode {
  id: string;
  type: string;
  parameters: any;
  dependencies: string[];
  estimatedDuration: number;
  failureRate: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface SimulationConfig {
  iterations: number;
  randomSeed: number;
  timeoutSeconds: number;
  convergenceThreshold: number;
  confidenceLevel: number;
  enableEarlyTermination: boolean;
  parallelBatches: number;
}

export interface ErrorDistribution {
  type: 'normal' | 'uniform' | 'exponential' | 'beta';
  parameters: number[];
  description: string;
}