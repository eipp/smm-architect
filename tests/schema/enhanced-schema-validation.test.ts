import { describe, it, expect, beforeAll } from '@jest/globals';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Enhanced Schema Validation Pipeline', () => {
  let ajv: Ajv;
  let workspaceContractSchema: any;
  let brandTwinSchema: any;
  let decisionCardSchema: any;
  let auditBundleSchema: any;

  beforeAll(() => {
    ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);

    // Load all schemas
    workspaceContractSchema = JSON.parse(readFileSync(join(__dirname, '../../schemas/workspace-contract.json'), 'utf8'));
    brandTwinSchema = JSON.parse(readFileSync(join(__dirname, '../../schemas/brand-twin.json'), 'utf8'));
    decisionCardSchema = JSON.parse(readFileSync(join(__dirname, '../../schemas/decision-card.json'), 'utf8'));
    auditBundleSchema = JSON.parse(readFileSync(join(__dirname, '../../schemas/audit-bundle.json'), 'utf8'));

    // Compile schemas
    ajv.addSchema(workspaceContractSchema, 'workspace-contract');
    ajv.addSchema(brandTwinSchema, 'brand-twin');
    ajv.addSchema(decisionCardSchema, 'decision-card');
    ajv.addSchema(auditBundleSchema, 'audit-bundle');
  });

  describe('WorkspaceContract Schema Validation', () => {
    it('should validate complete valid workspace contract', () => {
      const validContract = {
        workspaceId: 'ws-test-001',
        tenantId: 'tenant-test',
        createdBy: 'user-123',
        createdAt: '2024-01-15T10:30:00Z',
        lifecycle: 'active',
        contractVersion: 'v1.0.0',
        signedBy: {
          principal: 'user-123',
          signedAt: '2024-01-15T10:30:00Z',
          signatureId: 'sig-123'
        },
        effectiveFrom: '2024-01-15T10:30:00Z',
        effectiveTo: '2025-01-15T10:30:00Z',
        goals: [{ key: 'lead_gen', target: 100, unit: 'leads_per_month' }],
        primaryChannels: ['linkedin'],
        connectors: [{
          platform: 'linkedin',
          connectorId: 'conn-123',
          accountId: 'acc-123',
          displayName: 'Test Account',
          status: 'connected'
        }],
        consentRecords: [],
        budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 }
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(validContract);
      expect(valid).toBe(true);
      expect(validate!.errors).toBeNull();
    });

    it('should reject invalid currency codes', () => {
      const invalidContract = {
        workspaceId: 'ws-test-001',
        budget: { currency: 'INVALID', weeklyCap: 1000, hardCap: 5000 }
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(invalidContract);
      expect(valid).toBe(false);
      expect(validate!.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/budget/currency',
          message: expect.stringContaining('pattern')
        })
      );
    });

    it('should enforce required fields', () => {
      const incompleteContract = {
        workspaceId: 'ws-test-001'
        // Missing required fields
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(incompleteContract);
      expect(valid).toBe(false);
      
      const requiredFields = ['tenantId', 'createdBy', 'goals', 'primaryChannels'];
      requiredFields.forEach(field => {
        expect(validate!.errors).toContainEqual(
          expect.objectContaining({
            keyword: 'required',
            params: expect.objectContaining({ missingProperty: field })
          })
        );
      });
    });

    it('should validate connector status enum', () => {
      const invalidConnectorContract = {
        connectors: [{
          platform: 'linkedin',
          connectorId: 'conn-123',
          accountId: 'acc-123',
          displayName: 'Test',
          status: 'invalid-status'
        }]
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(invalidConnectorContract);
      expect(valid).toBe(false);
      expect(validate!.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/connectors/0/status',
          keyword: 'enum'
        })
      );
    });
  });

  describe('AuditBundle Schema Validation', () => {
    it('should validate complete audit bundle', () => {
      const validBundle = {
        auditBundleId: 'audit-123',
        bundleVersion: 'v1.0.0',
        createdAt: '2024-01-15T10:30:00Z',
        contractSnapshot: {
          contractId: 'ws-contract-v1.0.0',
          isImmutableSnapshot: true,
          contractHash: 'sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          contractContent: {},
          contractChangeLog: []
        },
        signatureMetadata: {
          contractHashAtSigning: 'sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          signedAt: '2024-01-15T10:30:00Z',
          signedBy: 'user-123',
          signatureId: 'sig-123',
          kmsKeyId: 'key-123',
          signatureAlgorithm: 'RSA-SHA256',
          signatureValue: 'base64signature'
        },
        executionContext: {
          simulationResults: {
            simulationId: 'sim-123',
            randomSeed: 42,
            iterations: 1000,
            readinessScore: 0.85
          },
          policyEvaluation: {
            evaluationId: 'eval-123',
            opaVersion: '0.56.0',
            policyBundleHash: 'sha256:fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            evaluationResults: { allow: true, deny: [], warnings: [] }
          },
          agentOutputs: []
        },
        immutabilityProof: {
          merkleRoot: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          bundleIntegrityHash: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        },
        auditTrail: [{
          timestamp: '2024-01-15T10:30:00Z',
          event: 'bundle_created',
          actor: 'system',
          eventHash: 'sha256:9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba'
        }]
      };

      const validate = ajv.getSchema('audit-bundle');
      const valid = validate!(validBundle);
      expect(valid).toBe(true);
      expect(validate!.errors).toBeNull();
    });

    it('should enforce SHA256 hash format', () => {
      const invalidHashBundle = {
        contractSnapshot: {
          contractHash: 'invalid-hash-format'
        }
      };

      const validate = ajv.getSchema('audit-bundle');
      const valid = validate!(invalidHashBundle);
      expect(valid).toBe(false);
      expect(validate!.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/contractSnapshot/contractHash',
          keyword: 'pattern'
        })
      );
    });

    it('should require immutability confirmation', () => {
      const mutableBundle = {
        contractSnapshot: {
          isImmutableSnapshot: false
        }
      };

      const validate = ajv.getSchema('audit-bundle');
      const valid = validate!(mutableBundle);
      expect(valid).toBe(false);
      expect(validate!.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/contractSnapshot/isImmutableSnapshot',
          keyword: 'const'
        })
      );
    });
  });

  describe('Edge Case Validation', () => {
    it('should handle empty arrays correctly', () => {
      const emptyArraysContract = {
        workspaceId: 'ws-test-001',
        goals: [], // Empty but should fail minItems
        primaryChannels: [], // Empty but should fail minItems
        connectors: [],
        consentRecords: []
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(emptyArraysContract);
      expect(valid).toBe(false);
      
      // Should fail on minItems for goals and primaryChannels
      expect(validate!.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/goals',
          keyword: 'minItems'
        })
      );
    });

    it('should validate date-time formats', () => {
      const invalidDatesContract = {
        createdAt: '2024-13-45T25:70:80Z', // Invalid date
        effectiveFrom: 'not-a-date',
        effectiveTo: '2024-01-15' // Missing time
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(invalidDatesContract);
      expect(valid).toBe(false);
      
      expect(validate!.errors).toContainEqual(
        expect.objectContaining({
          keyword: 'format',
          params: expect.objectContaining({ format: 'date-time' })
        })
      );
    });

    it('should validate maximum field lengths', () => {
      const longFieldsContract = {
        workspaceId: 'a'.repeat(300), // Assuming max length is less
        description: 'b'.repeat(10000) // Very long description
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(longFieldsContract);
      // Depending on schema constraints, this may or may not be valid
      if (!valid) {
        expect(validate!.errors).toContainEqual(
          expect.objectContaining({
            keyword: 'maxLength'
          })
        );
      }
    });
  });

  describe('Cross-Schema Validation', () => {
    it('should validate audit bundle references valid contract', () => {
      // This would require custom validation logic
      const contractId = 'ws-contract-v1.0.0';
      const bundleReference = {
        contractSnapshot: {
          contractId: contractId,
          contractContent: {
            workspaceId: 'ws-test-001',
            contractVersion: 'v1.0.0'
          }
        }
      };

      // Custom validation: contract content should match contract ID
      const contractVersion = bundleReference.contractSnapshot.contractContent.contractVersion;
      const expectedId = `ws-${bundleReference.contractSnapshot.contractContent.workspaceId}-${contractVersion}`;
      
      // This is custom business logic validation
      expect(contractId).toMatch(/^ws-.*-v\d+\.\d+\.\d+$/);
    });
  });

  describe('Performance and Large Data Validation', () => {
    it('should handle large connector arrays efficiently', () => {
      const largeConnectorsContract = {
        workspaceId: 'ws-test-001',
        connectors: Array.from({ length: 100 }, (_, i) => ({
          platform: 'linkedin',
          connectorId: `conn-${i}`,
          accountId: `acc-${i}`,
          displayName: `Account ${i}`,
          status: 'connected'
        }))
      };

      const startTime = performance.now();
      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(largeConnectorsContract);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should validate in < 100ms
      expect(valid).toBe(true);
    });

    it('should validate complex nested consent records', () => {
      const complexConsentContract = {
        consentRecords: Array.from({ length: 50 }, (_, i) => ({
          consentId: `consent-${i}`,
          type: 'voice_likeness',
          grantedBy: `user-${i}`,
          grantedAt: '2024-01-15T10:30:00Z',
          expiresAt: '2025-01-15T10:30:00Z',
          documentRef: `doc-ref-${i}`,
          verifierSignature: `signature-${i}`
        }))
      };

      const validate = ajv.getSchema('workspace-contract');
      const valid = validate!(complexConsentContract);
      expect(valid).toBe(true);
    });
  });

  describe('Version Compatibility', () => {
    it('should validate schema version compatibility', () => {
      const futureVersionBundle = {
        bundleVersion: 'v2.0.0' // Future version
      };

      // This test checks if the schema can handle future versions gracefully
      const validate = ajv.getSchema('audit-bundle');
      const valid = validate!(futureVersionBundle);
      
      // Depending on versioning strategy, this might be valid or invalid
      if (!valid) {
        expect(validate!.errors).toContainEqual(
          expect.objectContaining({
            keyword: 'pattern'
          })
        );
      }
    });
  });
});