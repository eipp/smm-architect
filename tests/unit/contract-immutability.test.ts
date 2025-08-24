import { describe, it, expect, beforeEach } from '@jest/globals';
import { createHash } from 'crypto';
import { AuditBundleService } from '../src/services/audit-bundle-service';
import { WorkspaceService } from '../src/services/workspace-service';
import { 
  WorkspaceContract, 
  AuditBundle, 
  ContractMutationError,
  ImmutabilityViolationError 
} from '../src/types';

describe('Contract Immutability & Migration Tests', () => {
  let auditBundleService: AuditBundleService;
  let workspaceService: WorkspaceService;
  let sampleContract: WorkspaceContract;
  let signedAuditBundle: AuditBundle;

  beforeEach(async () => {
    auditBundleService = new AuditBundleService();
    workspaceService = new WorkspaceService();
    
    // Create a sample contract for testing
    sampleContract = {
      workspaceId: 'ws-test-001',
      tenantId: 'tenant-icblabs',
      createdBy: 'user-123',
      createdAt: '2024-01-15T10:00:00Z',
      lifecycle: 'active',
      contractVersion: 'v1.2.3',
      signedBy: {
        principal: 'user-123',
        signedAt: '2024-01-15T10:30:00Z',
        signatureId: 'sig-abc123'
      },
      effectiveFrom: '2024-01-15T10:30:00Z',
      effectiveTo: '2025-01-15T10:30:00Z',
      goals: [
        {
          key: 'lead_gen',
          target: 100,
          unit: 'leads_per_month'
        }
      ],
      primaryChannels: ['linkedin'],
      connectors: [
        {
          platform: 'linkedin',
          connectorId: 'conn-123',
          accountId: 'li-account-456',
          displayName: 'ICB Labs LinkedIn',
          status: 'connected'
        }
      ],
      consentRecords: [],
      budget: {
        currency: 'USD',
        weeklyCap: 1000,
        hardCap: 5000
      }
    };

    // Create and sign an audit bundle
    signedAuditBundle = await auditBundleService.createAuditBundle(
      sampleContract,
      {
        simulationResults: {
          simulationId: 'sim-123',
          randomSeed: 42,
          iterations: 1000,
          readinessScore: 0.847
        },
        policyEvaluation: {
          evaluationId: 'policy-eval-123',
          opaVersion: '0.56.0',
          policyBundleHash: 'sha256:def456...',
          evaluationResults: {
            allow: true,
            deny: [],
            warnings: []
          }
        },
        agentOutputs: []
      }
    );
  });

  describe('Contract Immutability Enforcement', () => {
    it('should prevent mutation of signed contract', async () => {
      // Attempt to modify the budget after signing
      const modifiedContract = {
        ...sampleContract,
        budget: {
          ...sampleContract.budget,
          weeklyCap: 2000 // Changed from 1000
        }
      };

      // Should throw error when trying to update a signed contract
      await expect(
        workspaceService.updateContract(sampleContract.workspaceId, modifiedContract)
      ).rejects.toThrow(ContractMutationError);
    });

    it('should prevent modification of contract fields after signing', async () => {
      const attempts = [
        // Attempt to change goals
        {
          ...sampleContract,
          goals: [
            { key: 'brand_awareness', target: 50, unit: 'impressions_per_day' }
          ]
        },
        // Attempt to change connectors
        {
          ...sampleContract,
          connectors: [
            ...sampleContract.connectors,
            {
              platform: 'x',
              connectorId: 'conn-x-789',
              accountId: 'x-account-999',
              displayName: 'ICB Labs X',
              status: 'connected'
            }
          ]
        },
        // Attempt to change consent records
        {
          ...sampleContract,
          consentRecords: [
            {
              consentId: 'consent-123',
              type: 'voice_likeness',
              grantedBy: 'user-456',
              grantedAt: '2024-01-15T11:00:00Z',
              expiresAt: '2025-01-15T11:00:00Z'
            }
          ]
        }
      ];

      for (const modifiedContract of attempts) {
        await expect(
          workspaceService.updateContract(sampleContract.workspaceId, modifiedContract)
        ).rejects.toThrow(ContractMutationError);
      }
    });

    it('should detect contract hash mismatch in audit bundle', async () => {
      // Modify the contract content in the audit bundle
      const tamperedBundle = {
        ...signedAuditBundle,
        contractSnapshot: {
          ...signedAuditBundle.contractSnapshot,
          contractContent: {
            ...signedAuditBundle.contractSnapshot.contractContent,
            budget: { currency: 'USD', weeklyCap: 9999, hardCap: 50000 }
          }
        }
      };

      // Verification should fail due to hash mismatch
      await expect(
        auditBundleService.verifyBundleIntegrity(tamperedBundle)
      ).rejects.toThrow(ImmutabilityViolationError);
    });
  });

  describe('Contract Versioning & Migration', () => {
    it('should create new immutable snapshot for contract changes', async () => {
      // Create a new version of the contract
      const newContractVersion = await workspaceService.createNewContractVersion(
        sampleContract.workspaceId,
        {
          budget: {
            currency: 'USD',
            weeklyCap: 1500, // Increased budget
            hardCap: 6000
          }
        },
        'user-123',
        'Budget increase for Q2 campaign'
      );

      // Verify new version properties
      expect(newContractVersion.contractVersion).toBe('v1.2.4');
      expect(newContractVersion.lifecycle).toBe('draft');
      expect(newContractVersion.budget.weeklyCap).toBe(1500);

      // Original contract should remain unchanged
      const originalContract = await workspaceService.getContract(sampleContract.workspaceId);
      expect(originalContract.contractVersion).toBe('v1.2.3');
      expect(originalContract.budget.weeklyCap).toBe(1000);
    });

    it('should maintain complete change log in audit bundle', async () => {
      // Create multiple contract versions
      await workspaceService.createNewContractVersion(
        sampleContract.workspaceId,
        { budget: { currency: 'USD', weeklyCap: 1200, hardCap: 5000 } },
        'user-123',
        'Minor budget adjustment'
      );

      await workspaceService.createNewContractVersion(
        sampleContract.workspaceId,
        { 
          primaryChannels: ['linkedin', 'x'],
          connectors: [
            ...sampleContract.connectors,
            {
              platform: 'x',
              connectorId: 'conn-x-456',
              accountId: 'x-account-789',
              displayName: 'ICB Labs X',
              status: 'connected'
            }
          ]
        },
        'user-456',
        'Added X platform support'
      );

      const latestContract = await workspaceService.getLatestContract(sampleContract.workspaceId);
      const newBundle = await auditBundleService.createAuditBundle(latestContract, {
        simulationResults: {
          simulationId: 'sim-456',
          randomSeed: 42,
          iterations: 1000,
          readinessScore: 0.892
        },
        policyEvaluation: {
          evaluationId: 'policy-eval-456',
          opaVersion: '0.56.0',
          policyBundleHash: 'sha256:ghi789...',
          evaluationResults: { allow: true, deny: [], warnings: [] }
        },
        agentOutputs: []
      });

      // Verify complete change log
      const changeLog = newBundle.contractSnapshot.contractChangeLog;
      expect(changeLog).toHaveLength(3); // v1.2.3, v1.2.4, v1.2.5
      
      expect(changeLog[0]).toMatchObject({
        version: 'v1.2.3',
        changedBy: 'user-123',
        changes: ['Initial contract creation']
      });

      expect(changeLog[1]).toMatchObject({
        version: 'v1.2.4',
        changedBy: 'user-123',
        changes: ['budget.weeklyCap updated']
      });

      expect(changeLog[2]).toMatchObject({
        version: 'v1.2.5',
        changedBy: 'user-456',
        changes: ['primaryChannels updated', 'connector added']
      });
    });

    it('should verify contract hash chain integrity', async () => {
      const contractV1 = sampleContract;
      const contractV2 = await workspaceService.createNewContractVersion(
        sampleContract.workspaceId,
        { budget: { currency: 'USD', weeklyCap: 1500, hardCap: 6000 } },
        'user-123',
        'Budget increase'
      );

      // Create audit bundles for both versions
      const bundleV1 = signedAuditBundle;
      const bundleV2 = await auditBundleService.createAuditBundle(contractV2, {
        simulationResults: {
          simulationId: 'sim-789',
          randomSeed: 42,
          iterations: 1000,
          readinessScore: 0.823
        },
        policyEvaluation: {
          evaluationId: 'policy-eval-789',
          opaVersion: '0.56.0',
          policyBundleHash: 'sha256:jkl012...',
          evaluationResults: { allow: true, deny: [], warnings: [] }
        },
        agentOutputs: []
      });

      // Verify hash chain
      const hashChainValid = await auditBundleService.verifyContractHashChain([
        bundleV1,
        bundleV2
      ]);

      expect(hashChainValid).toBe(true);

      // Test with broken chain
      const tamperedBundleV2 = {
        ...bundleV2,
        contractSnapshot: {
          ...bundleV2.contractSnapshot,
          previousContractRef: 'wrong-contract-ref'
        }
      };

      await expect(
        auditBundleService.verifyContractHashChain([bundleV1, tamperedBundleV2])
      ).rejects.toThrow(ImmutabilityViolationError);
    });
  });

  describe('Immutability Proof Verification', () => {
    it('should verify merkle tree integrity', async () => {
      const isValid = await auditBundleService.verifyMerkleProof(signedAuditBundle);
      expect(isValid).toBe(true);

      // Test with tampered data
      const tamperedBundle = {
        ...signedAuditBundle,
        executionContext: {
          ...signedAuditBundle.executionContext,
          simulationResults: {
            ...signedAuditBundle.executionContext.simulationResults,
            readinessScore: 0.999 // Tampered score
          }
        }
      };

      const isTamperedValid = await auditBundleService.verifyMerkleProof(tamperedBundle);
      expect(isTamperedValid).toBe(false);
    });

    it('should verify bundle integrity hash', () => {
      const calculatedHash = auditBundleService.calculateBundleHash(signedAuditBundle);
      expect(calculatedHash).toBe(signedAuditBundle.immutabilityProof.bundleIntegrityHash);
    });

    it('should verify cryptographic signature', async () => {
      const isSignatureValid = await auditBundleService.verifySignature(
        signedAuditBundle.signatureMetadata,
        signedAuditBundle.contractSnapshot.contractHash
      );
      expect(isSignatureValid).toBe(true);
    });
  });

  describe('CI/CD Integration Tests', () => {
    it('should fail CI when attempting to deploy with modified signed contract', async () => {
      // Simulate CI environment check
      const deploymentArtifacts = {
        contract: {
          ...sampleContract,
          budget: { currency: 'USD', weeklyCap: 999999, hardCap: 999999 } // Malicious change
        },
        auditBundle: signedAuditBundle
      };

      // CI validation should catch the mismatch
      await expect(
        auditBundleService.validateDeploymentArtifacts(deploymentArtifacts)
      ).rejects.toThrow(ContractMutationError);
    });

    it('should pass CI with valid contract and matching audit bundle', async () => {
      const deploymentArtifacts = {
        contract: sampleContract,
        auditBundle: signedAuditBundle
      };

      const validationResult = await auditBundleService.validateDeploymentArtifacts(
        deploymentArtifacts
      );
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
  });

  describe('Audit Trail Verification', () => {
    it('should maintain chronological audit trail', () => {
      const auditTrail = signedAuditBundle.auditTrail;
      
      // Verify chronological order
      for (let i = 1; i < auditTrail.length; i++) {
        const currentTimestamp = new Date(auditTrail[i].timestamp);
        const previousTimestamp = new Date(auditTrail[i - 1].timestamp);
        expect(currentTimestamp.getTime()).toBeGreaterThanOrEqual(
          previousTimestamp.getTime()
        );
      }

      // Verify required events are present
      const events = auditTrail.map(entry => entry.event);
      expect(events).toContain('bundle_created');
      expect(events).toContain('contract_signed');
      expect(events).toContain('bundle_sealed');
    });

    it('should generate unique event hashes', () => {
      const auditTrail = signedAuditBundle.auditTrail;
      const eventHashes = auditTrail.map(entry => entry.eventHash);
      const uniqueHashes = new Set(eventHashes);
      
      expect(uniqueHashes.size).toBe(eventHashes.length);
    });
  });
});