import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { randomUUID } from 'crypto';
import { AuditBundleService, AuditSignatureService, DecisionCardService } from '../src';
import { WorkspaceContract, DecisionCard, AuditBundle, SignatureData } from '../src/types';

describe('SMM Architect Audit Service Test Suite', () => {
  let auditService: AuditBundleService;
  let signatureService: AuditSignatureService;
  let decisionService: DecisionCardService;
  let testWorkspaceId: string;
  let testUserId: string;
  let testContract: WorkspaceContract;
  let testDecisionCard: DecisionCard;

  beforeAll(async () => {
    // Initialize services
    auditService = new AuditBundleService();
    signatureService = new AuditSignatureService();
    decisionService = new DecisionCardService();
    
    testWorkspaceId = 'ws-test-' + randomUUID().substring(0, 8);
    testUserId = 'user-test-' + randomUUID().substring(0, 8);
    
    console.log('🧪 Starting Audit Service Test Suite...');
  });

  beforeEach(() => {
    // Create test workspace contract
    testContract = {
      contractId: `contract-${randomUUID()}`,
      version: '1.0.0',
      workspaceId: testWorkspaceId,
      createdBy: testUserId,
      createdAt: new Date().toISOString(),
      metadata: {
        name: 'Test Campaign Workspace',
        description: 'Automated testing workspace',
        industry: 'technology',
        region: 'us-east-1'
      },
      brandTwin: {
        voice: {
          tone: 'professional',
          style: 'informative',
          personality: 'thought-leader'
        },
        guidelines: {
          messaging: ['Innovation', 'Quality', 'Trust'],
          visual: {
            colors: ['#0066CC', '#FF6600'],
            fonts: ['Arial', 'Helvetica'],
            logoUsage: 'always-include'
          },
          contentRules: {
            maxLength: 3000,
            requireHashtags: true,
            requireDisclaimer: false
          }
        }
      },
      agents: {
        research: {
          enabled: true,
          config: {
            sources: ['web', 'academic', 'news'],
            depth: 'comprehensive',
            citationRequired: true
          }
        },
        creative: {
          enabled: true,
          config: {
            formats: ['text', 'image', 'video'],
            variants: 3,
            brandAlignment: 0.8
          }
        },
        legal: {
          enabled: true,
          config: {
            checks: ['gdpr', 'ccpa', 'copyright'],
            riskTolerance: 'low'
          }
        }
      },
      platforms: [
        {
          type: 'linkedin',
          enabled: true,
          credentials: 'vault://linkedin/oauth',
          settings: {
            publishTiming: 'optimal',
            audienceTargeting: true
          }
        },
        {
          type: 'twitter',
          enabled: true,
          credentials: 'vault://twitter/oauth',
          settings: {
            threadSupport: true,
            hashtagOptimization: true
          }
        }
      ],
      budget: {
        weeklyCap: 1000,
        hardCap: 5000,
        currency: 'USD',
        costModel: 'token-based'
      },
      consent: {
        voiceLikeness: {
          granted: true,
          grantedBy: testUserId,
          grantedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        contentRights: {
          granted: true,
          grantedBy: testUserId,
          grantedAt: new Date().toISOString(),
          scope: ['social-media', 'marketing']
        }
      },
      compliance: {
        gdpr: {
          enabled: true,
          dataRetention: 730,
          consentRequired: true
        },
        ccpa: {
          enabled: true,
          optOutMechanism: 'email'
        }
      },
      signature: {
        signedBy: testUserId,
        signedAt: new Date().toISOString(),
        algorithm: 'RS256',
        hash: 'sha256:' + randomUUID()
      }
    };

    // Create test decision card
    testDecisionCard = {
      id: `decision-${randomUUID()}`,
      workspaceId: testWorkspaceId,
      contractId: testContract.contractId,
      timestamp: new Date().toISOString(),
      simulationId: `sim-${randomUUID()}`,
      readinessScore: 0.85,
      policyPassPct: 0.95,
      citationCoverage: 0.80,
      duplicationRisk: 0.15,
      costEstimateUSD: 125.50,
      decision: 'approved',
      recommendations: [
        'Consider adding more diverse content sources',
        'Monitor budget consumption closely'
      ],
      warnings: [],
      errors: [],
      policyViolations: [],
      agentExecutions: [
        {
          agentType: 'research',
          executionId: `exec-${randomUUID()}`,
          status: 'completed',
          startTime: new Date(Date.now() - 300000).toISOString(),
          endTime: new Date(Date.now() - 240000).toISOString(),
          output: {
            insights: ['Market trends show increased AI adoption'],
            sources: ['https://example.com/ai-trends'],
            citations: 5
          }
        },
        {
          agentType: 'creative',
          executionId: `exec-${randomUUID()}`,
          status: 'completed',
          startTime: new Date(Date.now() - 240000).toISOString(),
          endTime: new Date(Date.now() - 180000).toISOString(),
          output: {
            content: [
              {
                platform: 'linkedin',
                text: 'Exciting developments in AI technology...',
                metadata: { brandAlignment: 0.9 }
              }
            ]
          }
        },
        {
          agentType: 'legal',
          executionId: `exec-${randomUUID()}`,
          status: 'completed',
          startTime: new Date(Date.now() - 180000).toISOString(),
          endTime: new Date(Date.now() - 120000).toISOString(),
          output: {
            approved: true,
            complianceChecks: {
              gdpr: 'passed',
              ccpa: 'passed',
              copyright: 'passed'
            },
            riskAssessment: 'low'
          }
        }
      ],
      businessMetrics: {
        estimatedReach: 10000,
        engagementProjection: 850,
        conversionPotential: 0.03,
        brandSafetyScore: 0.95
      }
    };
  });

  describe('Decision Card Service', () => {
    it('should create valid decision card with complete metadata', async () => {
      const decisionCard = await decisionService.createDecisionCard({
        workspaceId: testWorkspaceId,
        contractId: testContract.contractId,
        simulationResult: {
          readinessScore: 0.85,
          policyPassPct: 0.95,
          citationCoverage: 0.80,
          duplicationRisk: 0.15,
          costEstimateUSD: 125.50
        },
        agentExecutions: testDecisionCard.agentExecutions,
        recommendations: testDecisionCard.recommendations
      });

      expect(decisionCard).toBeDefined();
      expect(decisionCard.id).toBeDefined();
      expect(decisionCard.workspaceId).toBe(testWorkspaceId);
      expect(decisionCard.contractId).toBe(testContract.contractId);
      expect(decisionCard.readinessScore).toBe(0.85);
      expect(decisionCard.decision).toBe('approved');
      expect(decisionCard.agentExecutions).toHaveLength(3);

      console.log(`✅ Decision card created: ${decisionCard.id}`);
    });

    it('should reject decision card with low readiness score', async () => {
      const decisionCard = await decisionService.createDecisionCard({
        workspaceId: testWorkspaceId,
        contractId: testContract.contractId,
        simulationResult: {
          readinessScore: 0.45, // Below threshold
          policyPassPct: 0.95,
          citationCoverage: 0.60,
          duplicationRisk: 0.30,
          costEstimateUSD: 200.00
        },
        agentExecutions: [],
        recommendations: ['Improve content quality', 'Add more research sources']
      });

      expect(decisionCard.decision).toBe('rejected');
      expect(decisionCard.recommendations).toContain('Improve content quality');
      expect(decisionCard.readinessScore).toBe(0.45);

      console.log('✅ Low-quality decision card correctly rejected');
    });

    it('should handle policy violations correctly', async () => {
      const decisionCard = await decisionService.createDecisionCard({
        workspaceId: testWorkspaceId,
        contractId: testContract.contractId,
        simulationResult: {
          readinessScore: 0.85,
          policyPassPct: 0.75, // Below threshold
          citationCoverage: 0.80,
          duplicationRisk: 0.15,
          costEstimateUSD: 125.50
        },
        agentExecutions: testDecisionCard.agentExecutions,
        recommendations: [],
        policyViolations: [
          {
            policy: 'budget_constraint',
            severity: 'medium',
            message: 'Weekly budget utilization exceeds 80%'
          }
        ]
      });

      expect(decisionCard.decision).toBe('conditional');
      expect(decisionCard.policyViolations).toHaveLength(1);
      expect(decisionCard.policyViolations[0].policy).toBe('budget_constraint');

      console.log('✅ Policy violations handled correctly');
    });

    it('should validate agent execution completeness', async () => {
      // Test with missing required agent executions
      const incompleteExecutions = testDecisionCard.agentExecutions.filter(e => e.agentType !== 'legal');

      const decisionCard = await decisionService.createDecisionCard({
        workspaceId: testWorkspaceId,
        contractId: testContract.contractId,
        simulationResult: {
          readinessScore: 0.85,
          policyPassPct: 0.95,
          citationCoverage: 0.80,
          duplicationRisk: 0.15,
          costEstimateUSD: 125.50
        },
        agentExecutions: incompleteExecutions,
        recommendations: []
      });

      expect(decisionCard.warnings).toContain('Legal agent execution missing');
      expect(decisionCard.decision).toBe('conditional');

      console.log('✅ Agent execution validation working correctly');
    });
  });

  describe('Audit Bundle Generation', () => {
    it('should generate complete audit bundle with all required components', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions,
        includeMetrics: true,
        includePolicyDecisions: true
      });

      expect(auditBundle).toBeDefined();
      expect(auditBundle.id).toBeDefined();
      expect(auditBundle.workspaceId).toBe(testWorkspaceId);
      expect(auditBundle.contractSnapshot).toBeDefined();
      expect(auditBundle.decisionCard).toBeDefined();
      expect(auditBundle.executionTrace).toHaveLength(3);
      expect(auditBundle.businessMetrics).toBeDefined();
      expect(auditBundle.complianceEvidence).toBeDefined();
      expect(auditBundle.cryptographicProof).toBeDefined();

      console.log(`✅ Audit bundle generated: ${auditBundle.id}`);
    });

    it('should create immutable contract snapshot', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions
      });

      const contractSnapshot = auditBundle.contractSnapshot;
      expect(contractSnapshot.contractId).toBe(testContract.contractId);
      expect(contractSnapshot.version).toBe(testContract.version);
      expect(contractSnapshot.isImmutableSnapshot).toBe(true);
      expect(contractSnapshot.snapshotHash).toBeDefined();
      expect(contractSnapshot.snapshotTimestamp).toBeDefined();

      // Verify contract data integrity
      expect(contractSnapshot.contractData.workspaceId).toBe(testContract.workspaceId);
      expect(contractSnapshot.contractData.brandTwin.voice.tone).toBe(testContract.brandTwin.voice.tone);

      console.log('✅ Immutable contract snapshot created correctly');
    });

    it('should include comprehensive execution trace', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions,
        includeDetailedTrace: true
      });

      expect(auditBundle.executionTrace).toHaveLength(3);
      
      const researchExecution = auditBundle.executionTrace.find(e => e.agentType === 'research');
      expect(researchExecution).toBeDefined();
      expect(researchExecution!.status).toBe('completed');
      expect(researchExecution!.output).toBeDefined();

      const creativeExecution = auditBundle.executionTrace.find(e => e.agentType === 'creative');
      expect(creativeExecution).toBeDefined();
      expect(creativeExecution!.output.content).toBeDefined();

      const legalExecution = auditBundle.executionTrace.find(e => e.agentType === 'legal');
      expect(legalExecution).toBeDefined();
      expect(legalExecution!.output.approved).toBe(true);

      console.log('✅ Comprehensive execution trace included');
    });

    it('should calculate accurate business metrics', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions,
        includeMetrics: true
      });

      const metrics = auditBundle.businessMetrics;
      expect(metrics).toBeDefined();
      expect(metrics.totalCost).toBeGreaterThan(0);
      expect(metrics.totalCost).toBeLessThan(testContract.budget.weeklyCap);
      expect(metrics.agentUtilization).toBeGreaterThan(0);
      expect(metrics.agentUtilization).toBeLessThanOrEqual(1);
      expect(metrics.timeToDecision).toBeGreaterThan(0);
      expect(metrics.qualityScore).toBe(testDecisionCard.readinessScore);

      console.log(`✅ Business metrics calculated: cost=${metrics.totalCost}, quality=${metrics.qualityScore}`);
    });

    it('should provide compliance evidence for all requirements', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions,
        includeCompliance: true
      });

      const compliance = auditBundle.complianceEvidence;
      expect(compliance).toBeDefined();
      expect(compliance.gdpr).toBeDefined();
      expect(compliance.gdpr.consentVerified).toBe(true);
      expect(compliance.gdpr.dataMinimization).toBe(true);
      expect(compliance.ccpa).toBeDefined();
      expect(compliance.ccpa.optOutProvided).toBe(true);

      // Verify audit trail completeness
      expect(compliance.auditTrail).toBeDefined();
      expect(compliance.auditTrail.allActionsLogged).toBe(true);
      expect(compliance.auditTrail.integrityVerified).toBe(true);

      console.log('✅ Compliance evidence provided for all requirements');
    });
  });

  describe('Cryptographic Signature Verification', () => {
    it('should generate valid cryptographic signatures', async () => {
      const testData = {
        content: 'Test audit bundle content',
        timestamp: new Date().toISOString(),
        workspaceId: testWorkspaceId
      };

      const signature = await signatureService.signData(testData, {
        algorithm: 'RS256',
        keyId: 'test-key-' + testWorkspaceId
      });

      expect(signature).toBeDefined();
      expect(signature.signature).toBeDefined();
      expect(signature.algorithm).toBe('RS256');
      expect(signature.keyId).toBe('test-key-' + testWorkspaceId);
      expect(signature.timestamp).toBeDefined();

      console.log('✅ Cryptographic signature generated successfully');
    });

    it('should verify signature integrity', async () => {
      const testData = {
        content: 'Test audit bundle content',
        timestamp: new Date().toISOString(),
        workspaceId: testWorkspaceId
      };

      const signature = await signatureService.signData(testData, {
        algorithm: 'RS256',
        keyId: 'test-key-' + testWorkspaceId
      });

      const isValid = await signatureService.verifySignature(testData, signature);
      expect(isValid).toBe(true);

      console.log('✅ Signature verification successful');
    });

    it('should detect signature tampering', async () => {
      const testData = {
        content: 'Test audit bundle content',
        timestamp: new Date().toISOString(),
        workspaceId: testWorkspaceId
      };

      const signature = await signatureService.signData(testData, {
        algorithm: 'RS256',
        keyId: 'test-key-' + testWorkspaceId
      });

      // Tamper with the data
      const tamperedData = {
        ...testData,
        content: 'Tampered content'
      };

      const isValid = await signatureService.verifySignature(tamperedData, signature);
      expect(isValid).toBe(false);

      console.log('✅ Signature tampering detected correctly');
    });

    it('should handle key rotation scenarios', async () => {
      const testData = {
        content: 'Test audit bundle content',
        timestamp: new Date().toISOString(),
        workspaceId: testWorkspaceId
      };

      // Sign with old key
      const oldSignature = await signatureService.signData(testData, {
        algorithm: 'RS256',
        keyId: 'old-key-' + testWorkspaceId
      });

      // Rotate key
      await signatureService.rotateKey('old-key-' + testWorkspaceId, 'new-key-' + testWorkspaceId);

      // Verify old signature still works
      const oldSignatureValid = await signatureService.verifySignature(testData, oldSignature);
      expect(oldSignatureValid).toBe(true);

      // Sign with new key
      const newSignature = await signatureService.signData(testData, {
        algorithm: 'RS256',
        keyId: 'new-key-' + testWorkspaceId
      });

      const newSignatureValid = await signatureService.verifySignature(testData, newSignature);
      expect(newSignatureValid).toBe(true);

      console.log('✅ Key rotation handled correctly');
    });
  });

  describe('Audit Bundle Immutability', () => {
    it('should prevent modification of signed audit bundles', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions
      });

      // Sign the audit bundle
      const signedBundle = await auditService.signAuditBundle(auditBundle);
      expect(signedBundle.cryptographicProof.signature).toBeDefined();

      // Attempt to modify the bundle
      const modifiedBundle = {
        ...signedBundle,
        businessMetrics: {
          ...signedBundle.businessMetrics,
          totalCost: 999999 // Tampered value
        }
      };

      // Verify that tampering is detected
      const isValid = await auditService.verifyAuditBundle(modifiedBundle);
      expect(isValid).toBe(false);

      console.log('✅ Audit bundle tampering detected');
    });

    it('should maintain audit trail integrity across time', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions
      });

      const signedBundle = await auditService.signAuditBundle(auditBundle);

      // Simulate time passage and re-verification
      await new Promise(resolve => setTimeout(resolve, 100));

      const isStillValid = await auditService.verifyAuditBundle(signedBundle);
      expect(isStillValid).toBe(true);

      // Verify hash chain integrity
      expect(signedBundle.cryptographicProof.hashChain).toBeDefined();
      expect(signedBundle.cryptographicProof.hashChain.length).toBeGreaterThan(0);

      console.log('✅ Audit trail integrity maintained over time');
    });

    it('should link decision cards to audit bundles cryptographically', async () => {
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions
      });

      const signedBundle = await auditService.signAuditBundle(auditBundle);

      // Verify decision card hash matches
      const decisionCardHash = await auditService.calculateDecisionCardHash(testDecisionCard);
      expect(signedBundle.cryptographicProof.hashChain).toContain(decisionCardHash);

      // Verify contract hash matches
      const contractHash = await auditService.calculateContractHash(testContract);
      expect(signedBundle.contractSnapshot.snapshotHash).toBe(contractHash);

      console.log('✅ Cryptographic linking verified');
    });
  });

  describe('Performance and Scalability', () => {
    it('should generate audit bundles within SLA timeframes', async () => {
      const startTime = Date.now();

      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: testDecisionCard.agentExecutions
      });

      const signedBundle = await auditService.signAuditBundle(auditBundle);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // SLA: Audit bundle creation ≤ 5s after promotion
      expect(duration).toBeLessThan(5000);
      expect(signedBundle).toBeDefined();
      expect(signedBundle.cryptographicProof.signature).toBeDefined();

      console.log(`✅ Audit bundle generated in ${duration}ms (under 5s SLA)`);
    });

    it('should handle concurrent audit bundle generation', async () => {
      const numConcurrent = 5;
      const promises = [];

      for (let i = 0; i < numConcurrent; i++) {
        const uniqueWorkspaceId = testWorkspaceId + '-concurrent-' + i;
        const uniqueContract = { ...testContract, workspaceId: uniqueWorkspaceId };
        const uniqueDecisionCard = { ...testDecisionCard, workspaceId: uniqueWorkspaceId };

        promises.push(
          auditService.generateAuditBundle({
            workspaceId: uniqueWorkspaceId,
            contract: uniqueContract,
            decisionCard: uniqueDecisionCard,
            executionTrace: uniqueDecisionCard.agentExecutions
          })
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(numConcurrent);

      // Verify all bundles are unique
      const bundleIds = results.map(bundle => bundle.id);
      expect(new Set(bundleIds).size).toBe(numConcurrent);

      console.log(`✅ ${numConcurrent} concurrent audit bundles generated successfully`);
    });

    it('should maintain performance with large execution traces', async () => {
      // Create large execution trace
      const largeExecutionTrace = [];
      for (let i = 0; i < 50; i++) {
        largeExecutionTrace.push({
          agentType: `agent-${i % 6}`,
          executionId: `exec-${randomUUID()}`,
          status: 'completed',
          startTime: new Date(Date.now() - 1000000 + i * 1000).toISOString(),
          endTime: new Date(Date.now() - 900000 + i * 1000).toISOString(),
          output: {
            data: `Large output data for execution ${i}`.repeat(100)
          }
        });
      }

      const startTime = Date.now();
      const auditBundle = await auditService.generateAuditBundle({
        workspaceId: testWorkspaceId,
        contract: testContract,
        decisionCard: testDecisionCard,
        executionTrace: largeExecutionTrace
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should still be under 10s for large traces
      expect(auditBundle.executionTrace).toHaveLength(50);

      console.log(`✅ Large execution trace (50 entries) processed in ${duration}ms`);
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await auditService.cleanup();
    await signatureService.cleanup();
    await decisionService.cleanup();
    
    console.log('✅ Audit Service Test Suite completed - all resources cleaned up');
  });
});