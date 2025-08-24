/**
 * Types for Audit Service - Bundle Assembly and Signature Verification
 */

export interface AuditBundle {
  bundleId: string;
  workspaceId: string;
  tenantId: string;
  createdAt: string;
  version: string;
  workspaceContract: WorkspaceContractSnapshot;
  brandTwinSnapshotId?: string;
  simulationReport?: SimulationReport;
  decisionCard?: DecisionCard;
  workflowManifest?: WorkflowManifest;
  assetFingerprints?: AssetFingerprint[];
  policyResults?: PolicyResults;
  promotionHistory?: PromotionRecord[];
  complianceChecks?: ComplianceCheck[];
  metadata: BundleMetadata;
}

export interface SignedAuditBundle extends AuditBundle {
  signature: CryptographicSignature;
  integrityHash: string;
  chainOfCustody: CustodyRecord[];
}

export interface WorkspaceContractSnapshot {
  workspaceId: string;
  contractVersion: string;
  lifecycle: string;
  snapshotAt: string;
  contractData: any; // Full contract JSON
  checksumSHA256: string;
  previousContractRef?: string; // SHA-256 hash of previous contract for immutable chaining
  policyBundleChecksum: string; // SHA-256 hash of OPA policy bundle
  kmsKeyRef?: string; // KMS key reference for signing
  isImmutable: boolean; // Confirms this is an immutable snapshot
}

export interface SimulationReport {
  simulationId: string;
  readinessScore: number;
  policyPassPct: number;
  citationCoverage: number;
  duplicationRisk: number;
  costEstimateUSD: number;
  technicalReadiness: number;
  iterations: number;
  randomSeed: number;
  confidence: {
    lower: number;
    upper: number;
    level: number;
  };
  executedAt: string;
  durationMs: number;
}

export interface DecisionCard {
  actionId: string;
  title: string;
  readiness_score: number;
  primary_action: {
    label: string;
    action: string;
    payload?: any;
  };
  costBreakdown: {
    total: number;
    currency: string;
  };
  createdAt: string;
  expiresAt: string;
}

export interface WorkflowManifest {
  workflowId: string;
  version: string;
  workflowType: 'n8n' | 'custom';
  steps: WorkflowStep[];
  dependencies: WorkflowDependency[];
  estimatedDuration: number;
  actualDuration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executedAt?: string;
  completedAt?: string;
}

export interface WorkflowStep {
  stepId: string;
  name: string;
  type: string;
  agent?: string;
  service?: string;
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: any;
  errorMessage?: string;
}

export interface WorkflowDependency {
  stepId: string;
  dependsOn: string[];
  type: 'sequential' | 'parallel';
}

export interface AssetFingerprint {
  assetId: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'template';
  originalFilename?: string;
  sha256: string;
  md5: string;
  fileSize: number;
  mimeType: string;
  dimensions?: string;
  duration?: number;
  createdAt: string;
  source: 'generated' | 'uploaded' | 'template';
  license: string;
  copyrightInfo?: string;
}

export interface PolicyResults {
  policyVersion: string;
  evaluatedAt: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  skippedRules: number;
  overallResult: 'pass' | 'fail' | 'warning';
  details: PolicyRuleResult[];
  warnings: string[];
  errors: string[];
}

export interface PolicyRuleResult {
  ruleId: string;
  ruleName: string;
  category: string;
  result: 'pass' | 'fail' | 'skip' | 'warning';
  message?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediationHint?: string;
}

export interface PromotionRecord {
  promotionId: string;
  workspaceId: string;
  campaignId?: string;
  type: 'manual' | 'automatic' | 'canary' | 'rollback';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  promotedAt?: string;
  completedAt?: string;
  canaryConfig?: {
    initialPct: number;
    currentPct: number;
    watchWindowHours: number;
    status: 'monitoring' | 'passed' | 'failed' | 'rolled_back';
  };
  metrics?: {
    reach: number;
    engagement: number;
    cost: number;
    conversions: number;
  };
}

export interface ComplianceCheck {
  checkId: string;
  type: 'gdpr' | 'ccpa' | 'coppa' | 'sox' | 'custom';
  status: 'compliant' | 'non_compliant' | 'pending' | 'na';
  checkedAt: string;
  checkedBy: string; // Service or user
  details: string;
  evidence?: string[]; // References to supporting documents
  expiresAt?: string;
  nextReviewAt?: string;
}

export interface BundleMetadata {
  bundleVersion: string;
  assembledBy: string; // Service or user
  assembledAt: string;
  retentionExpiresAt: string;
  encryptionAlgorithm?: string;
  compressionUsed?: boolean;
  totalSizeBytes: number;
  componentCount: number;
  integrityAlgorithm: string;
  auditTrail: AuditTrailEntry[];
}

export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  actor: string; // Service or user
  details: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CryptographicSignature {
  algorithm: string; // e.g., "RS256", "ES256"
  keyId: string; // KMS key reference
  signature: string; // Base64 encoded signature
  signedAt: string;
  signedBy: string; // Principal
  certificateChain?: string[]; // For certificate-based signing
  timestampToken?: string; // RFC 3161 timestamp
}

export interface CustodyRecord {
  custodian: string;
  transferredFrom?: string;
  transferredAt: string;
  transferMethod: string;
  integrityVerified: boolean;
  signature: string;
}

export interface BundleVerificationResult {
  bundleId: string;
  valid: boolean;
  verifiedAt: string;
  verifiedBy: string;
  checks: VerificationCheck[];
  overallStatus: 'valid' | 'invalid' | 'warning';
  trustLevel: 'high' | 'medium' | 'low';
  warnings: string[];
  errors: string[];
}

export interface VerificationCheck {
  checkType: 'signature' | 'integrity' | 'timestamp' | 'certificate' | 'policy' | 'retention';
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export interface AuditQueryRequest {
  workspaceId?: string;
  tenantId?: string;
  bundleId?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'bundleId' | 'workspaceId';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditQueryResponse {
  bundles: SignedAuditBundle[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AuditServiceConfig {
  kmsProvider: 'aws' | 'gcp' | 'vault' | 'local';
  storageProvider: 's3' | 'gcs' | 'local';
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  timestampingEnabled: boolean;
  certificateValidation: boolean;
}

export interface KMSProvider {
  sign(data: Buffer, keyId: string): Promise<string>;
  verify(data: Buffer, signature: string, keyId: string): Promise<boolean>;
  getPublicKey(keyId: string): Promise<string>;
  createKey(alias: string): Promise<string>;
}

export interface StorageProvider {
  store(bundleId: string, data: Buffer): Promise<string>;
  retrieve(bundleId: string): Promise<Buffer>;
  delete(bundleId: string): Promise<void>;
  exists(bundleId: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

export interface RetentionPolicy {
  defaultRetentionDays: number;
  legalHoldEnabled: boolean;
  autoArchiveEnabled: boolean;
  archiveAfterDays: number;
  deleteAfterDays: number;
  notificationBeforeDays: number;
}