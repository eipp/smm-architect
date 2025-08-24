// Database client and configuration
export {
  createPrismaClient,
  getPrismaClient,
  closePrismaClient,
  checkDatabaseHealth,
  withRetryTransaction,
  initializeDatabase
} from './client';

// Repository classes and interfaces
export {
  WorkspaceRepository,
  SimulationRepository,
  AgentRepository,
  CreateWorkspaceData,
  CreateSimulationReportData,
  CreateAgentRunData
} from './repositories';

// Migration management
export { default as PrismaMigrationManager } from './migrate';

// Prisma client types (re-export from generated client)
export type {
  PrismaClient,
  Workspace,
  WorkspaceRun,
  SimulationReport,
  AgentRun,
  AuditBundle,
  Connector,
  ConsentRecord,
  BrandTwin,
  DecisionCard,
  SimulationResult,
  AssetFingerprint,
  User,
  UserSession,
  AuditLog,
  IngestionJob,
  VectorDocument
} from './generated/client';

// Default export
export { getPrismaClient as default } from './client';