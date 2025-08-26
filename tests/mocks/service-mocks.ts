import { jest } from '@jest/globals';

// Mock Prisma Client
export const mockPrismaClient = {
  workspace: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
    findMany: jest.fn(),
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
  $disconnect: jest.fn(),
} as any;

// Mock Vault Client
export const mockVaultClient = {
  read: jest.fn(),
  write: jest.fn(),
  delete: jest.fn(),
} as any;

// Mock KMS Service
export const mockKMSService = {
  sign: jest.fn(),
  verify: jest.fn(),
  initialize: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
} as any;

// Mock Pinecone Client
export const mockPineconeClient = {
  initialize: jest.fn(),
  cascadeDelete: jest.fn(),
  verifyDeletion: jest.fn(),
  queryVectorsByUser: jest.fn(),
  storeVector: jest.fn(),
  healthCheck: jest.fn(),
} as any;

// Mock S3 Client
export const mockS3Client = {
  cascadeDelete: jest.fn(),
  verifyDeletion: jest.fn(),
  listObjectsByUser: jest.fn(),
  uploadObject: jest.fn(),
  healthCheck: jest.fn(),
} as any;

// Mock Redis Client
export const mockRedisClient = {
  keys: jest.fn(),
  del: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  expire: jest.fn(),
  disconnect: jest.fn(),
} as any;

// Helper function to reset all mocks
export function resetAllMocks() {
  jest.clearAllMocks();
  
  // Reset Prisma mocks to return empty results by default
  mockPrismaClient.workspace.findMany.mockResolvedValue([]);
  mockPrismaClient.workspace.count.mockResolvedValue(0);
  mockPrismaClient.consentRecord.findMany.mockResolvedValue([]);
  
  // Reset other service mocks to return success by default
  mockKMSService.sign.mockResolvedValue('mock-signature-base64');
  mockKMSService.initialize.mockResolvedValue(undefined);
  
  mockPineconeClient.initialize.mockResolvedValue(undefined);
  mockPineconeClient.cascadeDelete.mockResolvedValue({
    deleted: 0,
    duration: 100,
    verificationHash: 'mock-hash'
  });
  
  mockS3Client.cascadeDelete.mockResolvedValue({
    deleted: 0,
    duration: 100,
    verificationHash: 'mock-hash'
  });
  
  mockRedisClient.keys.mockResolvedValue([]);
  mockRedisClient.del.mockResolvedValue(0);
}
