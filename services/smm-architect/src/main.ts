import { api } from "encore.dev/api";
import log from "encore.dev/log";
import {
  SQLDatabase,
  SQLDatabaseConfig
} from "encore.dev/storage/sqldb";
import { captureException } from "@sentry/node";
import "./config/sentry"; // Initialize Sentry

// Database wrapper implementing the minimal interface needed by services
class DatabaseAdapter {
  constructor(private readonly db: SQLDatabase) {}

  async query(sql: string, params?: any[]): Promise<any[]> {
    const rows: any[] = [];
    for await (const row of this.db.rawQuery(sql, ...(params ?? []))) {
      rows.push(row);
    }
    return rows;
  }

  async exec(sql: string, params?: any[]): Promise<void> {
    await this.db.rawExec(sql, ...(params ?? []));
  }
}
import { 
  WorkspaceContract,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  WorkspaceStatusResponse,
  ApprovalRequest,
  ApprovalResponse,
  SimulationRequest,
  SimulationResponse,
  AuditBundleResponse,
  APIError
} from "./types";
import { WorkspaceService } from "./services/workspace-service";
import { SimulationService } from "./services/simulation-service";
import { AuditService } from "./services/audit-service";
import { validateWorkspaceContract } from "./utils/validation";

// Database configuration and connection handling
const dbConfig: SQLDatabaseConfig = {
  migrations: process.env.DB_MIGRATIONS || "./migrations",
};

const databaseName = process.env.DB_NAME || "smm_architect";
const sqlDatabase = new SQLDatabase(databaseName, dbConfig);
const db = new DatabaseAdapter(sqlDatabase);

async function initializeDatabase(): Promise<void> {
  await db.exec("SELECT 1");
  log.info("Database connection established", { database: databaseName });
}

if (process.env.NODE_ENV !== "test") {
  initializeDatabase().catch((error) => {
    log.error("Database initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    captureException(error, { scope: "database_init" });
  });
}

// Service instances
const workspaceService = new WorkspaceService(db);
const simulationService = new SimulationService();
const auditService = new AuditService();

/**
 * Create a new workspace contract
 */
export const createWorkspace = api(
  { method: "POST", path: "/workspaces", auth: true },
  async (req: CreateWorkspaceRequest): Promise<CreateWorkspaceResponse> => {
    try {
      log.info("Creating new workspace", { tenantId: req.contract.tenantId });

      // Validate the contract schema
      const validationResult = await validateWorkspaceContract({
        ...req.contract,
        workspaceId: "", // Will be generated
        createdAt: new Date().toISOString(),
        lifecycle: "draft"
      });

      if (!validationResult.valid) {
        return {
          workspaceId: "",
          status: "validation_failed",
          validationErrors: validationResult.errors
        };
      }

      // Create the workspace
      const workspace = await workspaceService.createWorkspace(req.contract);

      log.info("Workspace created successfully", { 
        workspaceId: workspace.workspaceId,
        tenantId: workspace.tenantId 
      });

      return {
        workspaceId: workspace.workspaceId,
        status: "created"
      };

    } catch (error) {
      log.error("Failed to create workspace", { error: error instanceof Error ? error.message : String(error) });
      captureException(error, { 
        endpoint: "createWorkspace",
        tenantId: req.contract.tenantId 
      });
      throw new Error(`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Get workspace status and metrics
 */
export const getWorkspaceStatus = api(
  { method: "GET", path: "/workspaces/:id/status", auth: true },
  async ({ id }: { id: string }): Promise<WorkspaceStatusResponse> => {
    try {
      log.info("Getting workspace status", { workspaceId: id });

      const workspace = await workspaceService.getWorkspace(id);
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      const health = await workspaceService.getWorkspaceHealth(id);
      const metrics = await workspaceService.getWorkspaceMetrics(id);

      return {
        workspace,
        health,
        metrics
      };

    } catch (error) {
      log.error("Failed to get workspace status", { 
        workspaceId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      captureException(error, { 
        endpoint: "getWorkspaceStatus",
        workspaceId: id 
      });
      throw new Error(`Failed to get workspace status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Approve or reject a campaign promotion
 */
export const approvePromotion = api(
  { method: "POST", path: "/workspaces/:id/approve", auth: true },
  async ({ id, ...req }: { id: string } & ApprovalRequest): Promise<ApprovalResponse> => {
    try {
      log.info("Processing approval request", { 
        workspaceId: id, 
        action: req.action 
      });

      const workspace = await workspaceService.getWorkspace(id);
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      // Check if workspace is in valid state for approval
      if (workspace.lifecycle !== "active" && workspace.lifecycle !== "signed") {
        throw new Error(`Workspace lifecycle ${workspace.lifecycle} does not allow promotions`);
      }

      // Process the approval
      const result = await workspaceService.processApproval(id, req);

      log.info("Approval processed", { 
        workspaceId: id, 
        approved: result.approved 
      });

      return result;

    } catch (error) {
      log.error("Failed to process approval", { 
        workspaceId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      captureException(error, { 
        endpoint: "approvePromotion",
        workspaceId: id,
        action: req.action
      });
      throw new Error(`Failed to process approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Trigger campaign simulation
 */
export const simulateCampaign = api(
  { method: "POST", path: "/workspaces/:id/simulate", auth: true },
  async ({ id, ...req }: { id: string } & SimulationRequest): Promise<SimulationResponse> => {
    try {
      log.info("Starting campaign simulation", { workspaceId: id });

      const workspace = await workspaceService.getWorkspace(id);
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      // Run the simulation
      const simulationResult = await simulationService.simulate(workspace, req);

      log.info("Simulation completed", { 
        workspaceId: id, 
        simulationId: simulationResult.simulationId,
        readinessScore: simulationResult.readinessScore 
      });

      return simulationResult;

    } catch (error) {
      log.error("Failed to run simulation", { 
        workspaceId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      captureException(error, { 
        endpoint: "simulateCampaign",
        workspaceId: id
      });
      throw new Error(`Failed to run simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Retrieve audit bundle for workspace
 */
export const getAuditBundle = api(
  { method: "GET", path: "/workspaces/:id/audit", auth: true },
  async ({ id }: { id: string }): Promise<AuditBundleResponse> => {
    try {
      log.info("Retrieving audit bundle", { workspaceId: id });

      const workspace = await workspaceService.getWorkspace(id);
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      const auditBundle = await auditService.getAuditBundle(id);

      log.info("Audit bundle retrieved", { 
        workspaceId: id, 
        bundleId: auditBundle.bundleId 
      });

      return auditBundle;

    } catch (error) {
      log.error("Failed to retrieve audit bundle", { 
        workspaceId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      captureException(error, { 
        endpoint: "getAuditBundle",
        workspaceId: id
      });
      throw new Error(`Failed to retrieve audit bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Health check endpoint
 */
export const health = api(
  { method: "GET", path: "/health", auth: false },
  async (): Promise<{ status: string; timestamp: string }> => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString()
    };
  }
);

/**
 * Get workspace list for tenant
 */
export const listWorkspaces = api(
  { method: "GET", path: "/workspaces", auth: true },
  async ({ tenantId }: { tenantId?: string }): Promise<{ workspaces: WorkspaceContract[] }> => {
    try {
      log.info("Listing workspaces", { tenantId });

      const workspaces = await workspaceService.listWorkspaces(tenantId);

      return { workspaces };

    } catch (error) {
      log.error("Failed to list workspaces", { 
        tenantId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      captureException(error, { 
        endpoint: "listWorkspaces",
        tenantId: tenantId
      });
      throw new Error(`Failed to list workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Update workspace contract
 */
export const updateWorkspace = api(
  { method: "PUT", path: "/workspaces/:id", auth: true },
  async ({ id, contract }: { id: string; contract: Partial<WorkspaceContract> }): Promise<{ updated: boolean }> => {
    try {
      log.info("Updating workspace", { workspaceId: id });

      const result = await workspaceService.updateWorkspace(id, contract);

      log.info("Workspace updated", { workspaceId: id, updated: result });

      return { updated: result };

    } catch (error) {
      log.error("Failed to update workspace", { 
        workspaceId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      captureException(error, { 
        endpoint: "updateWorkspace",
        workspaceId: id
      });
      throw new Error(`Failed to update workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Delete workspace (decommission)
 */
export const deleteWorkspace = api(
  { method: "DELETE", path: "/workspaces/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ deleted: boolean }> => {
    try {
      log.info("Decommissioning workspace", { workspaceId: id });

      const result = await workspaceService.decommissionWorkspace(id);

      log.info("Workspace decommissioned", { workspaceId: id });

      return { deleted: result };

    } catch (error) {
      log.error("Failed to decommission workspace", { 
        workspaceId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      captureException(error, { 
        endpoint: "deleteWorkspace",
        workspaceId: id
      });
      throw new Error(`Failed to decommission workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);