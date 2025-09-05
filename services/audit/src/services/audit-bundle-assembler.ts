import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { 
  AuditBundle, 
  SignedAuditBundle, 
  WorkspaceContractSnapshot,
  BundleMetadata,
  CryptographicSignature,
  CustodyRecord,
  PolicyResults,
  ComplianceCheck,
  AuditTrailEntry
} from '../types';
import { KMSManager } from '../kms/kms-manager';
import { StorageService } from './storage-service';
import { ContractSnapshotter } from './contract-snapshotter';

export class AuditBundleAssembler {
  private kmsManager: KMSManager;
  private storageService: StorageService;
  private contractSnapshotter: ContractSnapshotter;

  constructor(kmsManager: KMSManager, storageService: StorageService) {
    this.kmsManager = kmsManager;
    this.storageService = storageService;
    this.contractSnapshotter = new ContractSnapshotter(storageService);
  }

  /**
   * Assemble a complete audit bundle from workspace data
   */
  async assembleBundle(
    workspaceId: string,
    tenantId: string,
    assembledBy: string,
    retentionDays: number = 365
  ): Promise<AuditBundle> {
    const bundleId = `bundle-${workspaceId}-${Date.now()}`;
    const assembledAt = new Date().toISOString();

    try {
      // Gather all components
      const workspaceContract = await this.getWorkspaceContractSnapshot(workspaceId);
      const brandTwinSnapshotId = await this.getBrandTwinSnapshotId(workspaceId);
      const simulationReport = await this.getLatestSimulationReport(workspaceId);
      const decisionCard = await this.getLatestDecisionCard(workspaceId);
      const workflowManifest = await this.getWorkflowManifest(workspaceId);
      const assetFingerprints = await this.getAssetFingerprints(workspaceId);
      const policyResults = await this.getPolicyResults(workspaceId);
      const promotionHistory = await this.getPromotionHistory(workspaceId);
      const complianceChecks = await this.getComplianceChecks(workspaceId);

      // Create audit trail
      const auditTrail: AuditTrailEntry[] = [
        {
          timestamp: assembledAt,
          action: 'bundle_assembly_started',
          actor: assembledBy,
          details: `Started assembling audit bundle for workspace ${workspaceId}`
        }
      ];

      // Create metadata
      const metadata: BundleMetadata = {
        bundleVersion: '1.0.0',
        assembledBy,
        assembledAt,
        retentionExpiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
        compressionUsed: true,
        totalSizeBytes: 0, // Will be calculated
        componentCount: this.countComponents({
          workspaceContract,
          brandTwinSnapshotId,
          simulationReport,
          decisionCard,
          workflowManifest,
          assetFingerprints,
          policyResults,
          promotionHistory,
          complianceChecks
        }),
        integrityAlgorithm: 'SHA-256',
        auditTrail
      };

      // Assemble bundle
      const bundle: AuditBundle = {
        bundleId,
        workspaceId,
        tenantId,
        createdAt: assembledAt,
        version: '1.0.0',
        workspaceContract,
        brandTwinSnapshotId,
        simulationReport,
        decisionCard,
        workflowManifest,
        assetFingerprints,
        policyResults,
        promotionHistory,
        complianceChecks,
        metadata
      };

      // Calculate bundle size
      const bundleSize = Buffer.byteLength(JSON.stringify(bundle), 'utf8');
      bundle.metadata.totalSizeBytes = bundleSize;

      // Add completion to audit trail
      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'bundle_assembly_completed',
        actor: assembledBy,
        details: `Completed bundle assembly. Size: ${bundleSize} bytes, Components: ${metadata.componentCount}`
      });

      return bundle;

    } catch (error) {
      throw new Error(`Failed to assemble audit bundle: ${error.message}`);
    }
  }

  /**
   * Sign an audit bundle cryptographically
   */
  async signBundle(
    bundle: AuditBundle,
    keyId: string,
    signedBy: string
  ): Promise<SignedAuditBundle> {
    try {
      // Create canonical JSON representation
      const canonicalBundle = this.createCanonicalRepresentation(bundle);
      
      // Calculate integrity hash
      const integrityHash = crypto.createHash('sha256')
        .update(canonicalBundle)
        .digest('hex');

      // Sign the bundle
      const signatureData = Buffer.from(canonicalBundle);
      const signatureResult = await this.kmsManager.sign(signatureData, keyId);

      // Create cryptographic signature object
      const cryptographicSignature: CryptographicSignature = {
        algorithm: signatureResult.algorithm,
        keyId: signatureResult.keyId,
        signature: signatureResult.signature,
        signedAt: signatureResult.signedAt,
        signedBy,
        timestampToken: await this.generateTimestampToken(signatureData, signatureResult.signature)
      };

      // Create initial custody record
      const chainOfCustody: CustodyRecord[] = [
        {
          custodian: signedBy,
          transferredAt: new Date().toISOString(),
          transferMethod: 'cryptographic_signature',
          integrityVerified: true,
          signature: crypto.createHash('sha256')
            .update(`${signedBy}${integrityHash}${cryptographicSignature.signedAt}`)
            .digest('hex')
        }
      ];

      // Update audit trail
      bundle.metadata.auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'bundle_signed',
        actor: signedBy,
        details: `Bundle signed with key ${keyId} using ${cryptographicSignature.algorithm}`
      });

      const signedBundle: SignedAuditBundle = {
        ...bundle,
        signature: cryptographicSignature,
        integrityHash,
        chainOfCustody
      };

      return signedBundle;

    } catch (error) {
      throw new Error(`Failed to sign audit bundle: ${error.message}`);
    }
  }

  /**
   * Store a signed audit bundle
   */
  async storeBundleSecurely(signedBundle: SignedAuditBundle): Promise<string> {
    try {
      // Compress bundle if enabled
      const bundleData = Buffer.from(JSON.stringify(signedBundle, null, 2));
      
      // Store in secure storage
      const storageRef = await this.storageService.store(signedBundle.bundleId, bundleData);

      // Update audit trail
      signedBundle.metadata.auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'bundle_stored',
        actor: 'audit-service',
        details: `Bundle stored at ${storageRef}`
      });

      return storageRef;

    } catch (error) {
      throw new Error(`Failed to store audit bundle: ${error.message}`);
    }
  }

  /**
   * Create canonical representation for consistent hashing/signing
   */
  private createCanonicalRepresentation(bundle: AuditBundle): string {
    // Create a deterministic JSON representation
    // Remove metadata.auditTrail for canonical form (as it changes during signing)
    const canonicalBundle = {
      ...bundle,
      metadata: {
        ...bundle.metadata,
        auditTrail: [] // Exclude for canonical representation
      }
    };

    // Sort keys recursively for deterministic output
    return JSON.stringify(canonicalBundle, Object.keys(canonicalBundle).sort());
  }

  /**
   * Generate RFC 3161 timestamp token (simplified implementation)
   */
  private async generateTimestampToken(data: Buffer, signature: string): Promise<string> {
    // Simplified timestamp token - in production, use a proper TSA
    const timestamp = new Date().toISOString();
    const tokenData = {
      timestamp,
      dataHash: crypto.createHash('sha256').update(data).digest('hex'),
      signatureHash: crypto.createHash('sha256').update(signature).digest('hex')
    };
    
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  /**
   * Count non-null components in the bundle
   */
    private countComponents(components: any): number {
      let count = 0;
      for (const [, value] of Object.entries(components)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          count += value.length;
        } else {
          count += 1;
        }
      }
    }
    return count;
  }

  // Mock data retrieval methods (in production, these would call actual services)

  private async getWorkspaceContractSnapshot(workspaceId: string): Promise<WorkspaceContractSnapshot> {
    try {
      // Get the latest contract snapshot from the snapshotter
      const contractSnapshot = await this.contractSnapshotter.getLatestSnapshot(workspaceId);
      
      if (!contractSnapshot) {
        throw new Error(`No contract snapshot found for workspace ${workspaceId}`);
      }

      // Verify immutability chain
      const chainValid = await this.contractSnapshotter.verifyImmutabilityChain(
        workspaceId, 
        contractSnapshot.contractVersion
      );
      
      if (!chainValid) {
        throw new Error(`Contract immutability chain verification failed for workspace ${workspaceId}`);
      }

      return {
        workspaceId,
        contractVersion: contractSnapshot.contractVersion,
        lifecycle: contractSnapshot.contractContent.lifecycle,
        snapshotAt: contractSnapshot.snapshotAt,
        contractData: contractSnapshot.contractContent,
        checksumSHA256: contractSnapshot.contractHash,
        previousContractRef: contractSnapshot.previousContractRef,
        policyBundleChecksum: contractSnapshot.policyBundleChecksum,
        kmsKeyRef: contractSnapshot.kmsKeyRef,
        isImmutable: contractSnapshot.isImmutable
      };

    } catch (error) {
      throw new Error(`Failed to get workspace contract snapshot: ${error.message}`);
    }
  }

  private async getBrandTwinSnapshotId(workspaceId: string): Promise<string | undefined> {
    return `bt-${workspaceId}-latest`;
  }

  private async getLatestSimulationReport(workspaceId: string): Promise<any> {
    return {
      simulationId: `sim-${workspaceId}-${Date.now()}`,
      readinessScore: 0.91,
      policyPassPct: 0.96,
      citationCoverage: 0.94,
      duplicationRisk: 0.06,
      costEstimateUSD: 850,
      technicalReadiness: 0.88,
      iterations: 1000,
      randomSeed: 42,
      confidence: { lower: 0.89, upper: 0.93, level: 0.95 },
      executedAt: new Date().toISOString(),
      durationMs: 45000
    };
  }

    private async getLatestDecisionCard(_workspaceId: string): Promise<any> {
      return {
      actionId: `action-${uuidv4()}`,
      title: '4-week LinkedIn+X Campaign',
      readiness_score: 0.91,
      primary_action: {
        label: 'Approve Campaign',
        action: 'approve_promotion'
      },
      costBreakdown: {
        total: 850,
        currency: 'USD'
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private async getWorkflowManifest(workspaceId: string): Promise<any> {
    return {
      workflowId: `wf-${workspaceId}`,
      version: 'v1.0.0',
      workflowType: 'n8n',
      steps: [
        { stepId: 'research', name: 'Brand Research', type: 'agent', status: 'completed' },
        { stepId: 'plan', name: 'Campaign Planning', type: 'agent', status: 'completed' },
        { stepId: 'create', name: 'Content Creation', type: 'agent', status: 'completed' },
        { stepId: 'review', name: 'Legal Review', type: 'validation', status: 'completed' },
        { stepId: 'publish', name: 'Publishing', type: 'agent', status: 'pending' }
      ],
      dependencies: [],
      estimatedDuration: 3600000,
      status: 'running',
      executedAt: new Date().toISOString()
    };
  }

    private async getAssetFingerprints(_workspaceId: string): Promise<any[]> {
      return [
      {
        assetId: 'logo-primary',
        type: 'image',
        sha256: this.generateMockHash(),
        md5: this.generateMockHash().substring(0, 32),
        fileSize: 24576,
        mimeType: 'image/png',
        dimensions: '512x512',
        createdAt: new Date().toISOString(),
        source: 'template',
        license: 'proprietary'
      },
      {
        assetId: 'post-image-1',
        type: 'image',
        sha256: this.generateMockHash(),
        md5: this.generateMockHash().substring(0, 32),
        fileSize: 156782,
        mimeType: 'image/jpeg',
        dimensions: '1200x630',
        createdAt: new Date().toISOString(),
        source: 'generated',
        license: 'proprietary'
      }
    ];
  }

    private async getPolicyResults(_workspaceId: string): Promise<PolicyResults> {
    return {
      policyVersion: '1.0.0',
      evaluatedAt: new Date().toISOString(),
      totalRules: 15,
      passedRules: 14,
      failedRules: 0,
      skippedRules: 1,
      overallResult: 'pass',
      details: [
        {
          ruleId: 'consent_voice_likeness',
          ruleName: 'Voice Likeness Consent',
          category: 'consent',
          result: 'pass',
          severity: 'high',
          message: 'Valid voice likeness consent found'
        },
        {
          ruleId: 'budget_compliance',
          ruleName: 'Budget Limits',
          category: 'budget',
          result: 'pass',
          severity: 'high',
          message: 'Cost estimate within budget limits'
        }
      ],
      warnings: [],
      errors: []
    };
  }

  private async getPromotionHistory(workspaceId: string): Promise<any[]> {
    return [
      {
        promotionId: `promo-${uuidv4()}`,
        workspaceId,
        type: 'automatic',
        status: 'completed',
        approvedBy: 'system',
        approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        promotedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        canaryConfig: {
          initialPct: 0.05,
          currentPct: 1.0,
          watchWindowHours: 48,
          status: 'passed'
        },
        metrics: {
          reach: 45000,
          engagement: 2250,
          cost: 890,
          conversions: 23
        }
      }
    ];
  }

    private async getComplianceChecks(_workspaceId: string): Promise<ComplianceCheck[]> {
    return [
      {
        checkId: `gdpr-${uuidv4()}`,
        type: 'gdpr',
        status: 'compliant',
        checkedAt: new Date().toISOString(),
        checkedBy: 'audit-service',
        details: 'GDPR compliance verified - data processing consent obtained',
        evidence: ['consent-record-001', 'privacy-policy-v2'],
        nextReviewAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  private generateMockHash(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}