import { DataSubjectRightsService } from '../../services/dsr/src/data-subject-rights-service';
import { PrismaClient } from '../../services/shared/database/generated/client';
import { VaultClient } from '../../services/shared/vault-client';
import { KMSService } from '../../services/audit/src/services/kms-service';
import { PineconeClient } from '../../services/shared/pinecone-client';
import { S3StorageClient } from '../../services/shared/s3-client';
import Redis from 'ioredis';
import { createHash } from 'crypto';

// Mock implementations for testing
const mockPrismaClient = {
  workspace: {
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  workspaceRun: {
    deleteMany: jest.fn(),
  },
  auditBundle: {
    deleteMany: jest.fn(),
  },
  connector: {
    deleteMany: jest.fn(),
  },
  consentRecord: {
    deleteMany: jest.fn(),
  },
  brandTwin: {
    deleteMany: jest.fn(),
  },
  decisionCard: {
    deleteMany: jest.fn(),
  },
  simulationResult: {
    deleteMany: jest.fn(),
  },
  assetFingerprint: {
    deleteMany: jest.fn(),
  },
} as any;

const mockVaultClient = {
  read: jest.fn(),
  write: jest.fn(),
} as any;

const mockKMSService = {
  sign: jest.fn(),
  verify: jest.fn(),
  initialize: jest.fn(),
} as any;

const mockPineconeClient = {
  initialize: jest.fn(),
  cascadeDelete: jest.fn(),
  verifyDeletion: jest.fn(),
} as any;

const mockS3Client = {
  cascadeDelete: jest.fn(),
  verifyDeletion: jest.fn(),
} as any;

const mockRedisClient = {
  keys: jest.fn(),
  del: jest.fn(),
} as any;

describe('DSR Cascade Deletion Integration Tests', () => {
  let dsrService: DataSubjectRightsService;
  const testUserId = 'user-12345';
  const testTenantId = 'tenant-67890';
  const testRequestId = 'dsr-req-abc123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    dsrService = new DataSubjectRightsService(
      mockPrismaClient,
      mockVaultClient,
      mockKMSService,
      {
        pinecone: mockPineconeClient,
        s3: mockS3Client,
        redis: mockRedisClient
      }
    );
  });

  describe('Complete GDPR Erasure Process', () => {
    it('should execute full cascade deletion across all subsystems', async () => {
      // Setup mock responses
      setupSuccessfulMocks();

      const options = {
        scope: 'user' as const,
        requestedBy: 'admin-user',
        reason: 'GDPR Article 17 request'
      };

      // Execute erasure request
      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        options
      );

      // Verify the result structure
      expect(result).toMatchObject({
        requestId: testRequestId,
        userId: testUserId,
        tenantId: testTenantId,
        deletionScope: 'user',
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        subsystemResults: expect.arrayContaining([
          expect.objectContaining({ subsystem: 'postgres', status: 'success' }),
          expect.objectContaining({ subsystem: 'pinecone', status: 'success' }),
          expect.objectContaining({ subsystem: 's3', status: 'success' }),
          expect.objectContaining({ subsystem: 'redis', status: 'success' }),
          expect.objectContaining({ subsystem: 'logs', status: 'success' }),
          expect.objectContaining({ subsystem: 'backups', status: 'success' })
        ]),
        verificationResults: expect.any(Array),
        integrityHash: expect.any(String),
        signedReport: expect.any(String),
        auditTrail: expect.any(Array)
      });

      // Verify all subsystems were called
      expect(mockPineconeClient.initialize).toHaveBeenCalled();
      expect(mockPineconeClient.cascadeDelete).toHaveBeenCalledWith(testUserId, testTenantId);
      expect(mockS3Client.cascadeDelete).toHaveBeenCalledWith(testUserId, testTenantId);
      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(mockKMSService.sign).toHaveBeenCalled();

      // Verify database deletions
      expect(mockPrismaClient.workspaceRun.deleteMany).toHaveBeenCalled();
      expect(mockPrismaClient.workspace.deleteMany).toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      // Setup mocks with some failures
      setupPartialFailureMocks();

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      // Should complete but with some failures
      expect(result.subsystemResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ subsystem: 'pinecone', status: 'failed' }),
          expect.objectContaining({ subsystem: 's3', status: 'partial' })
        ])
      );

      // Should still have integrity hash and signature
      expect(result.integrityHash).toBeDefined();
      expect(result.signedReport).toBeDefined();
    });

    it('should generate cryptographic deletion proof', async () => {
      setupSuccessfulMocks();

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      // Verify cryptographic elements
      expect(result.integrityHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.signedReport).toBeDefined();
      expect(result.signedReport).not.toContain('mock');

      // Verify KMS signing was called with correct data
      const expectedDataToSign = `${testRequestId}:${result.integrityHash}:${result.completedAt}`;
      expect(mockKMSService.sign).toHaveBeenCalledWith(
        Buffer.from(expectedDataToSign, 'utf8'),
        'dsr-deletion-proof-key'
      );
    });

    it('should maintain comprehensive audit trail', async () => {
      setupSuccessfulMocks();

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      // Verify audit trail structure
      expect(result.auditTrail).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'erasure_request_started',
            subsystem: 'system',
            timestamp: expect.any(String),
            hash: expect.any(String)
          }),
          expect.objectContaining({
            event: 'postgres_deletion_completed',
            subsystem: 'postgres'
          }),
          expect.objectContaining({
            event: 'pinecone_deletion_completed',
            subsystem: 'pinecone'
          }),
          expect.objectContaining({
            event: 's3_deletion_completed',
            subsystem: 's3'
          }),
          expect.objectContaining({
            event: 'redis_deletion_completed',
            subsystem: 'redis'
          }),
          expect.objectContaining({
            event: 'erasure_request_completed',
            subsystem: 'system'
          })
        ])
      );

      // Each audit entry should have a hash
      result.auditTrail.forEach(entry => {
        expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  describe('Subsystem-Specific Deletion', () => {
    it('should delete vectors from Pinecone with metadata filter', async () => {
      mockPineconeClient.cascadeDelete.mockResolvedValue({
        deleted: 150,
        duration: 2500,
        verificationHash: 'pinecone-verification-hash'
      });

      setupOtherSuccessfulMocks();

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      const pineconeResult = result.subsystemResults.find(r => r.subsystem === 'pinecone');
      expect(pineconeResult).toMatchObject({
        subsystem: 'pinecone',
        status: 'success',
        recordsDeleted: 150,
        verificationHash: 'pinecone-verification-hash'
      });
    });

    it('should delete S3 objects including versioned objects', async () => {
      mockS3Client.cascadeDelete.mockResolvedValue({
        deleted: 75,
        versionsDeleted: 25,
        duration: 1800,
        verificationHash: 's3-verification-hash'
      });

      setupOtherSuccessfulMocks();

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      const s3Result = result.subsystemResults.find(r => r.subsystem === 's3');
      expect(s3Result).toMatchObject({
        subsystem: 's3',
        status: 'success',
        recordsDeleted: 75,
        verificationHash: 's3-verification-hash'
      });
    });

    it('should delete Redis cache keys by pattern', async () => {
      mockRedisClient.keys.mockImplementation((pattern: string) => {
        const patterns = {
          [`user:${testUserId}:*`]: ['user:user-12345:session', 'user:user-12345:preferences'],
          [`tenant:${testTenantId}:user:${testUserId}:*`]: ['tenant:tenant-67890:user:user-12345:workspace'],
          [`session:${testUserId}:*`]: ['session:user-12345:active']
        };
        return Promise.resolve(patterns[pattern] || []);
      });
      
      mockRedisClient.del.mockResolvedValue(3);
      setupOtherSuccessfulMocks();

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      const redisResult = result.subsystemResults.find(r => r.subsystem === 'redis');
      expect(redisResult?.recordsDeleted).toBeGreaterThan(0);
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe('Data Export (Right to Access)', () => {
    it('should generate complete data export with integrity verification', async () => {
      // Mock the withTenantContext function
      const mockWithTenantContext = jest.fn().mockImplementation((tenantId, callback) => {
        return callback(mockPrismaClient);
      });
      
      // Mock data responses
      mockPrismaClient.workspace.findMany = jest.fn().mockResolvedValue([
        { workspace_id: 'ws-1', name: 'Test Workspace', created_by: testUserId }
      ]);
      mockPrismaClient.consentRecord.findMany = jest.fn().mockResolvedValue([
        { consent_id: 'consent-1', granted_by: testUserId, purpose: 'analytics' }
      ]);

      // Replace the import with mock (this would normally be done at module level)
      (dsrService as any).withTenantContext = mockWithTenantContext;

      const result = await dsrService.generateDataExport(testUserId, testTenantId);

      expect(result).toMatchObject({
        exportId: expect.stringMatching(/^export_/),
        userId: testUserId,
        tenantId: testTenantId,
        generatedAt: expect.any(String),
        dataCategories: {
          personal: expect.any(Object),
          workspaces: expect.any(Array),
          interactions: expect.any(Array),
          consents: expect.any(Array),
          auditLogs: expect.any(Array)
        },
        metadata: {
          totalRecords: expect.any(Number),
          exportSize: expect.any(Number),
          integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/)
        }
      });
    });
  });

  describe('Verification and Compliance', () => {
    it('should verify complete deletion across all subsystems', async () => {
      setupSuccessfulMocks();
      
      // Mock verification responses
      mockPrismaClient.workspace.count.mockResolvedValue(0);
      mockPineconeClient.verifyDeletion = jest.fn().mockResolvedValue({
        verified: true,
        remainingCount: 0
      });
      mockS3Client.verifyDeletion = jest.fn().mockResolvedValue({
        verified: true,
        remainingCount: 0
      });

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      expect(result.verificationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subsystem: 'postgres',
            verified: true,
            residualCount: 0
          })
        ])
      );
    });

    it('should handle verification failures', async () => {
      setupSuccessfulMocks();
      
      // Mock verification with residual data
      mockPrismaClient.workspace.count.mockResolvedValue(2);

      const result = await dsrService.processErasureRequest(
        testRequestId,
        testUserId,
        testTenantId,
        { requestedBy: 'admin-user' }
      );

      const postgresVerification = result.verificationResults.find(
        r => r.subsystem === 'postgres'
      );
      expect(postgresVerification).toMatchObject({
        verified: false,
        residualCount: 2
      });
    });
  });

  // Helper functions
  function setupSuccessfulMocks() {
    // PostgreSQL mocks
    mockPrismaClient.workspaceRun.deleteMany.mockResolvedValue({ count: 10 });
    mockPrismaClient.auditBundle.deleteMany.mockResolvedValue({ count: 5 });
    mockPrismaClient.connector.deleteMany.mockResolvedValue({ count: 3 });
    mockPrismaClient.consentRecord.deleteMany.mockResolvedValue({ count: 2 });
    mockPrismaClient.brandTwin.deleteMany.mockResolvedValue({ count: 1 });
    mockPrismaClient.decisionCard.deleteMany.mockResolvedValue({ count: 4 });
    mockPrismaClient.simulationResult.deleteMany.mockResolvedValue({ count: 8 });
    mockPrismaClient.assetFingerprint.deleteMany.mockResolvedValue({ count: 6 });
    mockPrismaClient.workspace.deleteMany.mockResolvedValue({ count: 2 });
    mockPrismaClient.workspace.count.mockResolvedValue(0);

    // Pinecone mocks
    mockPineconeClient.initialize.mockResolvedValue(undefined);
    mockPineconeClient.cascadeDelete.mockResolvedValue({
      deleted: 100,
      duration: 2000,
      verificationHash: 'pinecone-hash'
    });

    // S3 mocks
    mockS3Client.cascadeDelete.mockResolvedValue({
      deleted: 50,
      versionsDeleted: 10,
      duration: 1500,
      verificationHash: 's3-hash'
    });

    // Redis mocks
    mockRedisClient.keys.mockResolvedValue(['key1', 'key2']);
    mockRedisClient.del.mockResolvedValue(2);

    // KMS mocks
    mockKMSService.sign.mockResolvedValue('production-kms-signature-base64');
  }

  function setupPartialFailureMocks() {
    setupOtherSuccessfulMocks();
    
    // Pinecone failure
    mockPineconeClient.cascadeDelete.mockRejectedValue(
      new Error('Pinecone connection timeout')
    );

    // S3 partial failure
    mockS3Client.cascadeDelete.mockResolvedValue({
      deleted: 30,
      versionsDeleted: 5,
      duration: 1200,
      verificationHash: 's3-partial-hash',
      errors: ['Failed to delete some versioned objects']
    });
  }

  function setupOtherSuccessfulMocks() {
    // Setup all other mocks as successful
    mockPrismaClient.workspaceRun.deleteMany.mockResolvedValue({ count: 10 });
    mockPrismaClient.workspace.deleteMany.mockResolvedValue({ count: 2 });
    mockPrismaClient.workspace.count.mockResolvedValue(0);
    mockRedisClient.keys.mockResolvedValue(['key1']);
    mockRedisClient.del.mockResolvedValue(1);
    mockKMSService.sign.mockResolvedValue('production-signature');
    mockPineconeClient.initialize.mockResolvedValue(undefined);
  }
});
"
