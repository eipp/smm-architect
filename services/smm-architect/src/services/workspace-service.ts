import { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

import {
  WorkspaceContract,
  ApprovalRequest,
  ApprovalResponse
} from "../types";

const log = {
  info: (message: string, data?: any) => console.log("[INFO]", message, data),
  error: (message: string, data?: any) => console.error("[ERROR]", message, data),
  debug: (message: string, data?: any) => console.log("[DEBUG]", message, data),
  warn: (message: string, data?: any) => console.warn("[WARN]", message, data)
};

export class WorkspaceService {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_SIZE || 10)
    });
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createWorkspace(
    contract: Omit<WorkspaceContract, "workspaceId" | "createdAt" | "lifecycle">
  ): Promise<WorkspaceContract> {
    const workspaceId = `ws-${contract.tenantId}-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const workspace: WorkspaceContract = {
      ...contract,
      workspaceId,
      createdAt: now,
      lifecycle: "draft"
    };

    await this.withTransaction(async client => {
      await client.query(
        `INSERT INTO workspaces (
          workspace_id, tenant_id, created_by, created_at, lifecycle,
          contract_version, goals, primary_channels, budget, approval_policy,
          risk_profile, data_retention, ttl_hours, policy_bundle_ref,
          policy_bundle_checksum, contract_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )`,
        [
          workspace.workspaceId,
          workspace.tenantId,
          workspace.createdBy,
          workspace.createdAt,
          workspace.lifecycle,
          workspace.contractVersion,
          JSON.stringify(workspace.goals),
          JSON.stringify(workspace.primaryChannels),
          JSON.stringify(workspace.budget),
          JSON.stringify(workspace.approvalPolicy),
          workspace.riskProfile,
          JSON.stringify(workspace.dataRetention),
          workspace.ttlHours,
          workspace.policyBundleRef,
          workspace.policyBundleChecksum,
          JSON.stringify(workspace)
        ]
      );
    });

    log.info("Workspace stored in database", { workspaceId });

    return workspace;
  }

  private async getWorkspaceWithClient(
    client: PoolClient,
    workspaceId: string
  ): Promise<WorkspaceContract | null> {
    const result = await client.query(
      "SELECT contract_data FROM workspaces WHERE workspace_id = $1",
      [workspaceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return JSON.parse(result.rows[0].contract_data);
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceContract | null> {
    const result = await this.pool.query(
      "SELECT contract_data FROM workspaces WHERE workspace_id = $1",
      [workspaceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return JSON.parse(result.rows[0].contract_data);
  }

  async updateWorkspace(
    workspaceId: string,
    updates: Partial<WorkspaceContract>
  ): Promise<boolean> {
    return this.withTransaction(async client => {
      const existing = await this.getWorkspaceWithClient(client, workspaceId);
      if (!existing) {
        throw new Error("Workspace not found");
      }

      const updated = { ...existing, ...updates };

      await client.query(
        `UPDATE workspaces
        SET
          contract_data = $1,
          updated_at = $2
        WHERE workspace_id = $3`,
        [JSON.stringify(updated), new Date().toISOString(), workspaceId]
      );

      return true;
    });
  }

  async listWorkspaces(tenantId?: string): Promise<WorkspaceContract[]> {
    const result = tenantId
      ? await this.pool.query(
          "SELECT contract_data FROM workspaces WHERE tenant_id = $1",
          [tenantId]
        )
      : await this.pool.query("SELECT contract_data FROM workspaces", []);

    return result.rows.map((row: any) => JSON.parse(row.contract_data));
  }

  async decommissionWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await this.updateWorkspace(workspaceId, {
      lifecycle: "decommissioned",
      emergencyFlags: {
        pauseAll: true,
        pausedAt: new Date().toISOString(),
        reason: "Workspace decommissioned"
      }
    });

    log.info("Workspace decommissioned", { workspaceId });
    return true;
  }

  async getWorkspaceHealth(workspaceId: string): Promise<any> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const connectorHealth = (workspace.connectors || []).map(connector => ({
      platform: connector.platform,
      status:
        connector.status === "connected"
          ? "healthy"
          : connector.status === "degraded"
            ? "degraded"
            : "failed",
      lastCheck: connector.lastConnectedAt || new Date().toISOString()
    }));

    const lastSimulation = workspace.lastRun
      ? {
          runId: workspace.lastRun.runId,
          readinessScore: 0.85,
          completedAt:
            workspace.lastRun.finishedAt || workspace.lastRun.startedAt
        }
      : undefined;

    return {
      connectors: connectorHealth,
      lastSimulation
    };
  }

  async getWorkspaceMetrics(workspaceId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT
        COUNT(*) as total_runs,
        AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(cost_usd) as average_cost,
        MAX(created_at) as last_activity
      FROM workspace_runs
      WHERE workspace_id = $1`,
      [workspaceId]
    );

    if (result.rows.length === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        averageCost: 0,
        lastActivity: new Date().toISOString()
      };
    }

    const metrics = result.rows[0];
    return {
      totalRuns: metrics.total_runs || 0,
      successRate: metrics.success_rate || 0,
      averageCost: metrics.average_cost || 0,
      lastActivity: metrics.last_activity || new Date().toISOString()
    };
  }

  async processApproval(
    workspaceId: string,
    approval: ApprovalRequest
  ): Promise<ApprovalResponse> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const approved = approval.action === "approve";

    if (approved) {
      const canaryPct =
        approval.overrides?.customCanaryPct ||
        workspace.approvalPolicy.canaryInitialPct;

      await this.updateWorkspace(workspaceId, {
        currentCanary: {
          pct: canaryPct,
          startedAt: new Date().toISOString(),
          status: "monitoring"
        }
      });

      return {
        approved: true,
        nextSteps: [
          `Canary deployment started at ${canaryPct * 100}%`,
          `Monitoring for ${workspace.approvalPolicy.canaryWatchWindowHours} hours`,
          "Full deployment will proceed if metrics are healthy"
        ],
        canaryConfig: {
          pct: canaryPct,
          watchWindowHours: workspace.approvalPolicy.canaryWatchWindowHours
        }
      };
    }

    await this.updateWorkspace(workspaceId, {
      emergencyFlags: {
        pauseAll: true,
        pausedAt: new Date().toISOString(),
        reason: approval.comments || "Campaign rejected"
      }
    });

    return {
      approved: false,
      nextSteps: [
        "Campaign has been paused",
        "Review feedback and make requested changes",
        "Resubmit for approval when ready"
      ]
    };
  }
}

