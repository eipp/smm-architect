export interface AuditBundle {
  bundleId: string;
  workspaceId: string;
  version: string;
  createdAt: string;
  creator: string;
  
  // Metadata
  bundleType: 'workspace_creation' | 'policy_change' | 'campaign_execution' | 'emergency_action' | 'compliance_review';
  title: string;
  description: string;
  tags: string[];
  
  // Chain of custody
  chainOfCustody: ChainOfCustodyEntry[];
  
  // Evidence collection
  evidence: EvidenceItem[];
  
  // Policy compliance
  policyCompliance: PolicyComplianceRecord;
  
  // Cryptographic verification
  signatures: BundleSignature[];
  checksums: {
    sha256: string;
    blake3: string;
  };
  
  // Metadata
  metadata: {
    bundleSize: number;
    evidenceCount: number;
    signatureCount: number;
    compressionRatio?: number;
    storageProvider: string;
    retentionPolicy: string;
  };
}

export interface ChainOfCustodyEntry {
  timestamp: string;
  actor: string;
  action: 'created' | 'modified' | 'signed' | 'verified' | 'archived' | 'accessed';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface EvidenceItem {
  evidenceId: string;
  type: 'document' | 'log_entry' | 'api_response' | 'screenshot' | 'config_snapshot' | 'user_action';
  source: string;
  timestamp: string;
  checksum: string;
  size: number;
  mimeType?: string;
  metadata: Record<string, any>;
  content: string; // Base64 encoded or reference
}

export interface PolicyComplianceRecord {
  evaluatedAt: string;
  policyVersion: string;
  complianceScore: number;
  violations: PolicyViolation[];
  recommendations: string[];
  signedOff: boolean;
  signedOffBy?: string;
  signedOffAt?: string;
}

export interface PolicyViolation {
  severity: 'low' | 'medium' | 'high' | 'critical';
  rule: string;
  description: string;
  remediation: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'waived';
}

export interface BundleSignature {
  keyId: string;
  algorithm: string;
  signature: string;
  signedAt: string;
  signedBy: string;
  purpose: 'integrity' | 'authenticity' | 'non_repudiation' | 'authorization';
}

export interface StorageProvider {
  store(bundleId: string, data: Buffer): Promise<string>;
  retrieve(bundleId: string): Promise<Buffer>;
  delete(bundleId: string): Promise<void>;
  exists(bundleId: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

export interface KMSProvider {
  sign(data: Buffer, keyId: string): Promise<string>;
  verify(data: Buffer, signature: string, keyId: string): Promise<boolean>;
  getPublicKey(keyId: string): Promise<string>;
  createKey(alias: string): Promise<string>;
}

export interface BundleAssemblyRequest {
  workspaceId: string;
  bundleType: AuditBundle['bundleType'];
  title: string;
  description: string;
  evidence: Omit<EvidenceItem, 'evidenceId' | 'checksum' | 'size'>[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface BundleAssemblyResponse {
  bundleId: string;
  status: 'assembled' | 'signed' | 'stored' | 'error';
  storageLocation: string;
  signatures: BundleSignature[];
  createdAt: string;
  expiresAt: string;
}

export interface BundleVerificationRequest {
  bundleId: string;
  verifySignatures?: boolean;
  verifyIntegrity?: boolean;
  verifyCompliance?: boolean;
}

export interface BundleVerificationResponse {
  bundleId: string;
  isValid: boolean;
  verificationResults: {
    signatures: SignatureVerificationResult[];
    integrity: IntegrityVerificationResult;
    compliance: ComplianceVerificationResult;
  };
  verifiedAt: string;
  verifiedBy: string;
}

export interface SignatureVerificationResult {
  keyId: string;
  isValid: boolean;
  algorithm: string;
  signedAt: string;
  signedBy: string;
  error?: string;
}

export interface IntegrityVerificationResult {
  isValid: boolean;
  expectedChecksum: string;
  actualChecksum: string;
  algorithm: string;
  error?: string;
}

export interface ComplianceVerificationResult {
  isCompliant: boolean;
  score: number;
  violations: PolicyViolation[];
  lastEvaluated: string;
  error?: string;
}

export interface AuditBundleConfig {
  kms: {
    provider: 'aws' | 'gcp' | 'vault' | 'local';
    config: any;
  };
  storage: {
    provider: 's3' | 'gcs' | 'local';
    config: any;
  };
  retention: {
    defaultRetentionDays: number;
    archiveAfterDays: number;
    deleteAfterDays: number;
  };
  signing: {
    defaultKeyId: string;
    requireMultipleSignatures: boolean;
    allowedSigners: string[];
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli';
    level: number;
  };
  encryption: {
    enabled: boolean;
    algorithm: 'aes-256-gcm';
    keyRotationDays: number;
  };
}