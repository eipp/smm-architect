export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'custom';
  modelType: 'chat' | 'completion' | 'embedding' | 'image' | 'audio';
  capabilities: ModelCapability[];
  parameters: ModelParameters;
  status: ModelStatus;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface ModelCapability {
  type: 'text-generation' | 'image-generation' | 'text-analysis' | 'embeddings';
  maxTokens?: number;
  supportedLanguages?: string[];
  specialFeatures?: string[];
}

export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  customConfig?: Record<string, any>;
}

export type ModelStatus = 'active' | 'inactive' | 'deprecated' | 'canary' | 'testing';

export interface ModelEndpoint {
  id: string;
  modelId: string;
  url: string;
  authType: 'apikey' | 'oauth' | 'custom';
  authConfig: Record<string, any>;
  healthCheckUrl?: string;
  rateLimit: RateLimit;
  retryConfig: RetryConfig;
  timeout: number;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute?: number;
}

export interface RetryConfig {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: RoutingCondition;
  targetModels: ModelTarget[];
  trafficSplit: TrafficSplit;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutingCondition {
  agentType?: string[];
  workspaceId?: string[];
  userTier?: string[];
  requestType?: string[];
  contentLength?: { min?: number; max?: number };
  timeOfDay?: { start: string; end: string };
  customConditions?: Record<string, any>;
}

export interface ModelTarget {
  modelId: string;
  weight: number;
  fallbackOrder: number;
  maxConcurrentRequests?: number;
}

export interface TrafficSplit {
  primary: number;
  canary?: number;
  experimental?: number;
}

export interface ModelRequest {
  id: string;
  agentType: string;
  workspaceId: string;
  userId: string;
  prompt: string;
  parameters: ModelParameters;
  metadata: RequestMetadata;
  timestamp: Date;
}

export interface RequestMetadata {
  requestType: 'completion' | 'chat' | 'embedding' | 'analysis';
  priority: 'low' | 'normal' | 'high' | 'critical';
  context?: Record<string, any>;
  tags?: string[];
}

export interface ModelResponse {
  id: string;
  requestId: string;
  modelId: string;
  response: any;
  usage: TokenUsage;
  latency: number;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  error?: string;
  timestamp: Date;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface ModelEvaluation {
  id: string;
  modelId: string;
  evaluationType: 'quality' | 'performance' | 'safety' | 'cost';
  testDataset: string;
  results: EvaluationResults;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface EvaluationResults {
  overallScore: number;
  metrics: Record<string, number>;
  qualityMetrics?: QualityMetrics;
  performanceMetrics?: PerformanceMetrics;
  safetyMetrics?: SafetyMetrics;
  costMetrics?: CostMetrics;
  recommendations: string[];
}

export interface QualityMetrics {
  bleuScore?: number;
  rougeScore?: number;
  semanticSimilarity?: number;
  factualAccuracy?: number;
  coherence?: number;
  creativity?: number;
  brandAlignment?: number;
}

export interface PerformanceMetrics {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  timeoutRate: number;
}

export interface SafetyMetrics {
  toxicityScore: number;
  biasScore: number;
  privacyRisk: number;
  contentPolicy: number;
  harmfulContent: number;
}

export interface CostMetrics {
  costPerToken: number;
  costPerRequest: number;
  dailyCost: number;
  monthlyCost: number;
  costEfficiency: number;
}

export interface CanaryDeployment {
  id: string;
  name: string;
  primaryModelId: string;
  canaryModelId: string;
  trafficPercentage: number;
  startTime: Date;
  endTime?: Date;
  status: 'planning' | 'active' | 'completed' | 'failed' | 'rolled_back';
  criteria: CanaryCriteria;
  metrics: CanaryMetrics;
  decisions: CanaryDecision[];
}

export interface CanaryCriteria {
  maxErrorRate: number;
  maxLatencyIncrease: number;
  minQualityScore: number;
  maxCostIncrease: number;
  evaluationPeriod: number; // hours
  successThreshold: number;
}

export interface CanaryMetrics {
  primaryMetrics: ModelMetrics;
  canaryMetrics: ModelMetrics;
  comparison: MetricsComparison;
}

export interface ModelMetrics {
  requestCount: number;
  errorRate: number;
  averageLatency: number;
  qualityScore: number;
  userSatisfaction: number;
  cost: number;
}

export interface MetricsComparison {
  errorRateDelta: number;
  latencyDelta: number;
  qualityDelta: number;
  costDelta: number;
  overallHealth: 'healthy' | 'warning' | 'critical';
}

export interface CanaryDecision {
  timestamp: Date;
  decision: 'continue' | 'promote' | 'rollback' | 'pause';
  reason: string;
  triggeredBy: 'automated' | 'manual';
  metadata?: Record<string, any>;
}

export interface ModelHealth {
  modelId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastChecked: Date;
  uptime: number;
  responseTime: number;
  errorRate: number;
  availability: number;
  healthScore: number;
  issues: HealthIssue[];
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'availability' | 'error_rate' | 'cost' | 'quality';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface AgentModelPreference {
  agentType: string;
  preferredModels: string[];
  fallbackModels: string[];
  requiredCapabilities: string[];
  performanceRequirements: {
    maxLatency: number;
    minQuality: number;
    maxCost: number;
  };
}

export interface WorkspaceModelConfig {
  workspaceId: string;
  modelRestrictions: string[];
  budgetLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    costPerRequest: number;
  };
  qualityRequirements: {
    minQualityScore: number;
    requireHumanReview: boolean;
  };
  complianceRequirements: string[];
}