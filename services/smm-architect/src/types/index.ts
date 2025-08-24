/**
 * TypeScript types for SMM Architect service
 * Auto-generated from JSON schemas
 */

export interface WorkspaceContract {
  workspaceId: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  lifecycle: 'draft' | 'validated' | 'signed' | 'provisioning' | 'active' | 'paused' | 'decommissioned';
  contractVersion: string;
  signedBy?: {
    principal: string;
    signedAt: string;
    signatureId: string;
  };
  effectiveFrom?: string;
  effectiveTo?: string;
  goals: Array<{
    key: string;
    target: number;
    unit: string;
  }>;
  primaryChannels: Array<'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok'>;
  connectors?: Array<{
    platform: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok';
    connectorId: string;
    accountId: string;
    displayName: string;
    status: 'unconnected' | 'connected' | 'degraded' | 'revoked';
    lastConnectedAt?: string;
    scopes?: string[];
    ownerContact?: string;
  }>;
  consentRecords?: Array<{
    consentId: string;
    type: 'voice_likeness' | 'ugc_license' | 'celebrity_release' | 'data_processing' | 'marketing_use';
    grantedBy: string;
    grantedAt: string;
    expiresAt: string;
    documentRef?: string;
    verifierSignature?: string;
  }>;
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
    forecast?: {
      estimatedWeeklySpend: number;
      confidence: number;
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
  dataRetention: {
    auditRetentionDays: number;
  };
  ttlHours: number;
  policyBundleRef: string;
  policyBundleChecksum: string;
  lastRun?: {
    runId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: string;
    finishedAt?: string;
  };
  currentCanary?: {
    pct: number;
    startedAt: string;
    status: 'monitoring' | 'passed' | 'rolled_back';
  };
  audit?: {
    retentionDays: number;
    storageRef: string;
    lastBundleId?: string;
  };
  simulationConfig?: {
    iterations: number;
    randomSeed: number;
    timeoutSeconds: number;
  };
  emergencyFlags?: {
    pauseAll: boolean;
    pausedAt?: string;
    reason?: string;
  };
  kmsKeyRef?: string;
  vaultMount?: string;
}

export interface DecisionCard {
  actionId: string;
  title: string;
  one_line: string;
  createdAt: string;
  expiresAt: string;
  workspaceId?: string;
  campaignId?: string;
  readiness_score: number;
  policy_pass_pct?: number;
  citation_coverage?: number;
  duplicate_risk?: 'low' | 'medium' | 'high';
  estimatedImpact?: {
    reach: number;
    impressions?: number;
    ctr: number;
    conversions: number;
    engagement_rate?: number;
    confidence_interval?: {
      lower: number;
      upper: number;
      confidence_level?: number;
    };
  };
  costBreakdown?: {
    paidAds: number;
    llmModelSpend: number;
    rendering: number;
    thirdPartyServices: number;
    total: number;
    currency: string;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'campaign_total';
  };
  primary_action: {
    label: string;
    action: 'approve_promotion' | 'reject_promotion' | 'request_changes' | 'schedule_review' | 'escalate';
    payload?: any;
    requiresConfirmation?: boolean;
  };
  secondary_actions?: Array<{
    label: string;
    action: string;
    payload?: any;
  }>;
  provenance?: string[];
  escalations?: string[];
  riskFactors?: Array<{
    type: 'policy' | 'budget' | 'content' | 'legal' | 'technical' | 'reputation';
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation?: string;
  }>;
  simulationResults?: {
    runId: string;
    iterations: number;
    successRate: number;
    averageExecutionTime?: number;
    keyMetrics?: any;
  };
  approvalChain?: Array<{
    role: string;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    approvedBy?: string;
    approvedAt?: string;
    comments?: string;
  }>;
  metadata?: {
    generatedBy?: string;
    version?: string;
    correlationId?: string;
  };
}

export interface BrandTwin {
  brandId: string;
  snapshotAt: string;
  metadata: {
    modelVersion: string;
    ingestedBy: string;
    ingestedAt: string;
    sourceCount?: number;
    processingDurationMs?: number;
  };
  facts: Array<{
    claim: string;
    sourceUrl: string;
    sourceId: string;
    provenanceId: string;
    embeddingId: string;
    claimType: 'factual' | 'opinion' | 'marketing' | 'testimonial' | 'product_info';
    spanStart: number;
    spanEnd: number;
    confidence: number;
    extractedAt?: string;
    verificationStatus?: 'unverified' | 'verified' | 'disputed' | 'outdated';
  }>;
  voiceTone?: {
    primaryTone: 'professional' | 'casual' | 'authoritative' | 'friendly' | 'technical' | 'creative' | 'corporate' | 'personal';
    description: string;
    examples?: string[];
    keywords?: string[];
  };
  audience?: {
    segments: string[];
    geos: string[];
    demographics?: {
      ageRange?: string;
      interests?: string[];
      platforms?: string[];
    };
  };
  assets?: Array<{
    assetId: string;
    type: 'logo' | 'image' | 'video' | 'audio' | 'document' | 'font' | 'color_palette';
    fingerprint: string;
    license: 'proprietary' | 'cc0' | 'cc-by' | 'cc-by-sa' | 'mit' | 'apache' | 'custom';
    url?: string;
    metadata?: {
      size?: number;
      dimensions?: string;
      format?: string;
    };
  }>;
  competitors?: Array<{
    name: string;
    profileUrl: string;
    notes: string;
    strengthsWeaknesses?: {
      strengths?: string[];
      weaknesses?: string[];
    };
    marketPosition?: 'leader' | 'challenger' | 'follower' | 'niche';
  }>;
  industries?: string[];
  tags?: string[];
  lastUpdated?: string;
  qualityScore?: number;
}

// API Request/Response types
export interface CreateWorkspaceRequest {
  contract: Omit<WorkspaceContract, 'workspaceId' | 'createdAt' | 'lifecycle'>;
}

export interface CreateWorkspaceResponse {
  workspaceId: string;
  status: 'created' | 'validation_failed';
  validationErrors?: string[];
}

export interface WorkspaceStatusResponse {
  workspace: WorkspaceContract;
  health: {
    connectors: Array<{
      platform: string;
      status: 'healthy' | 'degraded' | 'failed';
      lastCheck: string;
    }>;
    lastSimulation?: {
      runId: string;
      readinessScore: number;
      completedAt: string;
    };
  };
  metrics: {
    totalRuns: number;
    successRate: number;
    averageCost: number;
    lastActivity: string;
  };
}

export interface ApprovalRequest {
  action: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  overrides?: {
    skipCanary?: boolean;
    customCanaryPct?: number;
  };
}

export interface ApprovalResponse {
  approved: boolean;
  nextSteps: string[];
  canaryConfig?: {
    pct: number;
    watchWindowHours: number;
  };
}

export interface SimulationRequest {
  workflowOverrides?: any;
  targetChannels?: string[];
  dryRun?: boolean;
}

export interface SimulationResponse {
  simulationId: string;
  readinessScore: number;
  policyPassPct: number;
  citationCoverage: number;
  duplicationRisk: number;
  costEstimateUSD: number;
  traces: Array<{
    nodeId: string;
    status: 'ok' | 'warning' | 'error';
    durationMs: number;
    message?: string;
  }>;
  decisionCard: DecisionCard;
}

export interface AuditBundleResponse {
  bundleId: string;
  workspaceContract: WorkspaceContract;
  brandTwinSnapshotId?: string;
  simulationReport?: any;
  decisionCard?: DecisionCard;
  workflowManifest?: any;
  assetFingerprints?: Array<{
    assetId: string;
    sha256: string;
  }>;
  policyResults?: any;
  promotionHistory?: any[];
  signature: {
    keyId: string;
    signature: string;
    signedAt: string;
  };
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: any;
}