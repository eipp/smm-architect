Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.15.0
 * Query Engine version: 85179d7826409ee107a6ba334b5e305ae3fba9fb
 */
Prisma.prismaVersion = {
  client: "6.15.0",
  engine: "85179d7826409ee107a6ba334b5e305ae3fba9fb"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.WorkspaceScalarFieldEnum = {
  workspaceId: 'workspaceId',
  tenantId: 'tenantId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lifecycle: 'lifecycle',
  contractVersion: 'contractVersion',
  goals: 'goals',
  primaryChannels: 'primaryChannels',
  budget: 'budget',
  approvalPolicy: 'approvalPolicy',
  riskProfile: 'riskProfile',
  dataRetention: 'dataRetention',
  ttlHours: 'ttlHours',
  policyBundleRef: 'policyBundleRef',
  policyBundleChecksum: 'policyBundleChecksum',
  contractData: 'contractData'
};

exports.Prisma.WorkspaceRunScalarFieldEnum = {
  runId: 'runId',
  workspaceId: 'workspaceId',
  status: 'status',
  startedAt: 'startedAt',
  finishedAt: 'finishedAt',
  costUsd: 'costUsd',
  readinessScore: 'readinessScore',
  results: 'results',
  createdAt: 'createdAt'
};

exports.Prisma.AuditBundleScalarFieldEnum = {
  bundleId: 'bundleId',
  workspaceId: 'workspaceId',
  bundleData: 'bundleData',
  signatureKeyId: 'signatureKeyId',
  signature: 'signature',
  signedAt: 'signedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ConnectorScalarFieldEnum = {
  connectorId: 'connectorId',
  workspaceId: 'workspaceId',
  platform: 'platform',
  accountId: 'accountId',
  displayName: 'displayName',
  status: 'status',
  scopes: 'scopes',
  lastConnectedAt: 'lastConnectedAt',
  ownerContact: 'ownerContact',
  credentialsRef: 'credentialsRef',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConsentRecordScalarFieldEnum = {
  consentId: 'consentId',
  workspaceId: 'workspaceId',
  consentType: 'consentType',
  grantedBy: 'grantedBy',
  grantedAt: 'grantedAt',
  expiresAt: 'expiresAt',
  documentRef: 'documentRef',
  verifierSignature: 'verifierSignature',
  createdAt: 'createdAt'
};

exports.Prisma.BrandTwinScalarFieldEnum = {
  brandId: 'brandId',
  workspaceId: 'workspaceId',
  snapshotAt: 'snapshotAt',
  brandData: 'brandData',
  qualityScore: 'qualityScore',
  createdAt: 'createdAt'
};

exports.Prisma.DecisionCardScalarFieldEnum = {
  actionId: 'actionId',
  workspaceId: 'workspaceId',
  title: 'title',
  oneLine: 'oneLine',
  readinessScore: 'readinessScore',
  expiresAt: 'expiresAt',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  cardData: 'cardData',
  createdAt: 'createdAt'
};

exports.Prisma.SimulationResultScalarFieldEnum = {
  simulationId: 'simulationId',
  workspaceId: 'workspaceId',
  readinessScore: 'readinessScore',
  policyPassPct: 'policyPassPct',
  citationCoverage: 'citationCoverage',
  duplicationRisk: 'duplicationRisk',
  costEstimateUsd: 'costEstimateUsd',
  traces: 'traces',
  simulationData: 'simulationData',
  createdAt: 'createdAt'
};

exports.Prisma.AssetFingerprintScalarFieldEnum = {
  assetId: 'assetId',
  workspaceId: 'workspaceId',
  assetType: 'assetType',
  fingerprint: 'fingerprint',
  license: 'license',
  url: 'url',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Workspace: 'Workspace',
  WorkspaceRun: 'WorkspaceRun',
  AuditBundle: 'AuditBundle',
  Connector: 'Connector',
  ConsentRecord: 'ConsentRecord',
  BrandTwin: 'BrandTwin',
  DecisionCard: 'DecisionCard',
  SimulationResult: 'SimulationResult',
  AssetFingerprint: 'AssetFingerprint'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
