import { PrismaClient, Workspace, WorkspaceRun, SimulationReport, AgentRun } from './generated/client';
import { getPrismaClient, withRetryTransaction } from './client';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export interface CreateWorkspaceData {
  workspaceId: string;
  tenantId: string;
  createdBy: string;
  contractVersion: string;
  goals: any;
  primaryChannels: any;
  budget: any;
  approvalPolicy: any;
  riskProfile: string;
  dataRetention: any;
  ttlHours: number;
  policyBundleRef: string;
  policyBundleChecksum: string;
  contractData: any;
}

export interface CreateSimulationReportData {
  simulationId: string;
  workspaceId: string;
  tenantId: string;
  iterations: number;
  randomSeed: number;
  rngLibraryVersion: string;
  nodejsVersion: string;
  readinessScore: number;
  policyPassPct: number;
  citationCoverage: number;
  duplicationRisk: number;
  costEstimateUsd: number;
  technicalReadiness: number;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  workspaceContext: any;
  workflowManifest: any;
  simulationConfig: any;
  createdBy: string;
  correlationId?: string;
}

export interface CreateAgentRunData {
  jobId: string;
  workspaceId: string;
  tenantId: string;
  agentType: string;
  agentVersion: string;
  inputData: any;
  createdBy: string;
  correlationId?: string;
}

export class WorkspaceRepository {
  private client: PrismaClient;

  constructor(client?: PrismaClient) {
    this.client = client || getPrismaClient();
  }

  /**
   * Create a new workspace with transaction safety
   */
  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    return withRetryTransaction(async (tx) => {
      // Check if workspace already exists
      const existing = await tx.workspace.findUnique({
        where: { workspaceId: data.workspaceId }
      });

      if (existing) {
        throw new Error(`Workspace ${data.workspaceId} already exists`);
      }

      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          workspaceId: data.workspaceId,
          tenantId: data.tenantId,
          createdBy: data.createdBy,
          createdAt: new Date(),
          contractVersion: data.contractVersion,
          goals: data.goals,
          primaryChannels: data.primaryChannels,
          budget: data.budget,
          approvalPolicy: data.approvalPolicy,
          riskProfile: data.riskProfile,
          dataRetention: data.dataRetention,
          ttlHours: data.ttlHours,
          policyBundleRef: data.policyBundleRef,
          policyBundleChecksum: data.policyBundleChecksum,
          contractData: data.contractData
        }
      });

      logger.info('Workspace created', {
        workspaceId: workspace.workspaceId,
        tenantId: workspace.tenantId,
        createdBy: workspace.createdBy
      });

      return workspace;
    });
  }

  /**
   * Get workspace by ID with optional relations
   */
  async getWorkspace(
    workspaceId: string, 
    includeRelations: boolean = false
  ): Promise<Workspace | null> {
    return this.client.workspace.findUnique({
      where: { workspaceId },
      include: includeRelations ? {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10
        },
        simulationReports: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        agentRuns: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      } : undefined
    });
  }

  /**
   * List workspaces for a tenant with pagination
   */
  async listWorkspaces(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ workspaces: Workspace[]; total: number }> {
    const [workspaces, total] = await Promise.all([
      this.client.workspace.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      this.client.workspace.count({
        where: { tenantId }
      })
    ]);

    return { workspaces, total };
  }

  /**
   * Update workspace lifecycle
   */
  async updateWorkspaceLifecycle(
    workspaceId: string,
    lifecycle: string,
    updatedBy: string
  ): Promise<Workspace> {
    return this.client.workspace.update({
      where: { workspaceId },
      data: {
        lifecycle,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete workspace and all related data
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await withRetryTransaction(async (tx) => {
      // Prisma will handle cascade deletes based on schema relations
      await tx.workspace.delete({
        where: { workspaceId }
      });

      logger.info('Workspace deleted', { workspaceId });
    });
  }

  /**
   * Clean up expired workspaces based on TTL
   */
  async cleanupExpiredWorkspaces(): Promise<number> {
    const cutoffTime = new Date();
    
    // Find workspaces that have exceeded their TTL
    const expiredWorkspaces = await this.client.workspace.findMany({
      where: {
        createdAt: {
          lt: new Date(cutoffTime.getTime() - (24 * 60 * 60 * 1000)) // Rough calculation, refined below
        }
      },
      select: {
        workspaceId: true,
        createdAt: true,
        ttlHours: true
      }
    });

    const expiredIds = expiredWorkspaces
      .filter(workspace => {
        const expiryTime = new Date(workspace.createdAt.getTime() + (workspace.ttlHours * 60 * 60 * 1000));
        return expiryTime < cutoffTime;
      })
      .map(workspace => workspace.workspaceId);

    if (expiredIds.length === 0) {
      return 0;
    }

    // Delete expired workspaces
    const result = await this.client.workspace.deleteMany({
      where: {
        workspaceId: {
          in: expiredIds
        }
      }
    });

    logger.info('Cleaned up expired workspaces', {
      count: result.count,
      workspaceIds: expiredIds
    });

    return result.count;
  }
}

export class SimulationRepository {
  private client: PrismaClient;

  constructor(client?: PrismaClient) {
    this.client = client || getPrismaClient();
  }

  /**
   * Create simulation report
   */
  async createSimulationReport(data: CreateSimulationReportData): Promise<SimulationReport> {
    return this.client.simulationReport.create({
      data: {
        simulationId: data.simulationId,
        workspaceId: data.workspaceId,
        tenantId: data.tenantId,
        iterations: data.iterations,
        randomSeed: data.randomSeed,
        rngLibraryVersion: data.rngLibraryVersion,
        nodejsVersion: data.nodejsVersion,
        readinessScore: data.readinessScore,
        policyPassPct: data.policyPassPct,
        citationCoverage: data.citationCoverage,
        duplicationRisk: data.duplicationRisk,
        costEstimateUsd: data.costEstimateUsd,
        technicalReadiness: data.technicalReadiness,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        durationMs: data.durationMs,
        workspaceContext: data.workspaceContext,
        workflowManifest: data.workflowManifest,
        simulationConfig: data.simulationConfig,
        createdBy: data.createdBy,
        correlationId: data.correlationId
      }
    });
  }

  /**
   * Get baseline simulation for comparison
   */
  async getBaselineSimulation(
    workspaceId: string,
    randomSeed: number,
    engineVersion: string = '1.0.0'
  ): Promise<SimulationReport | null> {
    return this.client.simulationReport.findFirst({
      where: {
        workspaceId,
        randomSeed,
        engineVersion
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get recent simulation reports for workspace
   */
  async getRecentSimulations(
    workspaceId: string,
    limit: number = 10
  ): Promise<SimulationReport[]> {
    return this.client.simulationReport.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

export class AgentRepository {
  private client: PrismaClient;

  constructor(client?: PrismaClient) {
    this.client = client || getPrismaClient();
  }

  /**
   * Create agent run
   */
  async createAgentRun(data: CreateAgentRunData): Promise<AgentRun> {
    return this.client.agentRun.create({
      data: {
        jobId: data.jobId,
        workspaceId: data.workspaceId,
        tenantId: data.tenantId,
        agentType: data.agentType,
        agentVersion: data.agentVersion,
        status: 'pending',
        inputData: data.inputData,
        createdBy: data.createdBy,
        correlationId: data.correlationId
      }
    });
  }

  /**
   * Update agent run status
   */
  async updateAgentRunStatus(
    jobId: string,
    status: string,
    outputData?: any,
    errorMessage?: string
  ): Promise<AgentRun> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === 'running' && !outputData) {
      updateData.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
      
      // Calculate duration if started
      const existingRun = await this.client.agentRun.findUnique({
        where: { jobId },
        select: { startedAt: true }
      });
      
      if (existingRun?.startedAt) {
        updateData.durationMs = Date.now() - existingRun.startedAt.getTime();
      }
    }

    if (outputData) {
      updateData.outputData = outputData;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return this.client.agentRun.update({
      where: { jobId },
      data: updateData
    });
  }

  /**
   * Get agent run by job ID
   */
  async getAgentRun(jobId: string): Promise<AgentRun | null> {
    return this.client.agentRun.findUnique({
      where: { jobId }
    });
  }

  /**
   * Update model usage for agent run
   */
  async updateModelUsage(
    jobId: string,
    modelUsage: any
  ): Promise<AgentRun> {
    return this.client.agentRun.update({
      where: { jobId },
      data: {
        modelUsage,
        updatedAt: new Date()
      }
    });
  }
}