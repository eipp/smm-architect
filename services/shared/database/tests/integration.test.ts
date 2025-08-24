import { PrismaClient } from '../generated/client';
import { 
  WorkspaceRepository, 
  SimulationRepository, 
  AgentRepository,
  CreateWorkspaceData,
  CreateSimulationReportData,
  CreateAgentRunData
} from '../repositories';
import { 
  createPrismaClient, 
  checkDatabaseHealth, 
  withRetryTransaction,
  initializeDatabase 
} from '../client';

describe('Database Layer Integration Tests', () => {
  let prisma: PrismaClient;
  let workspaceRepo: WorkspaceRepository;
  let simulationRepo: SimulationRepository;
  let agentRepo: AgentRepository;

  const testTenantId = 'test_tenant_integration';
  const testWorkspaceId = 'test_workspace_integration';
  const testUserId = 'test_user_integration';

  beforeAll(async () => {
    // Initialize test database
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/smm_architect_test';
    
    prisma = createPrismaClient();
    workspaceRepo = new WorkspaceRepository(prisma);
    simulationRepo = new SimulationRepository(prisma);
    agentRepo = new AgentRepository(prisma);

    // Ensure database is ready
    await initializeDatabase();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanupTestData();
  });

  describe('Database Connectivity', () => {
    test('should connect to database successfully', async () => {
      const health = await checkDatabaseHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.latency).toBeDefined();
      expect(health.latency).toBeGreaterThan(0);
    });

    test('should handle connection errors gracefully', async () => {
      // Test with invalid database URL
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://invalid:5432/nonexistent';
      
      const health = await checkDatabaseHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
      
      // Restore original URL
      process.env.DATABASE_URL = originalUrl;
    });
  });

  describe('Workspace Repository', () => {
    test('should create workspace successfully', async () => {
      const workspaceData: CreateWorkspaceData = {
        workspaceId: testWorkspaceId,
        tenantId: testTenantId,
        createdBy: testUserId,
        contractVersion: '1.0.0',
        goals: { primary: 'Test campaign' },
        primaryChannels: { channels: ['facebook'] },
        budget: { total_usd: 1000 },
        approvalPolicy: { requires_approval: false },
        riskProfile: 'low',
        dataRetention: { logs_days: 30 },
        ttlHours: 168,
        policyBundleRef: 'test_policy',
        policyBundleChecksum: 'sha256:test',
        contractData: { version: '1.0.0' }
      };

      const workspace = await workspaceRepo.createWorkspace(workspaceData);

      expect(workspace.workspaceId).toBe(testWorkspaceId);
      expect(workspace.tenantId).toBe(testTenantId);
      expect(workspace.createdBy).toBe(testUserId);
      expect(workspace.lifecycle).toBe('draft');
    });

    test('should prevent duplicate workspace creation', async () => {
      const workspaceData: CreateWorkspaceData = {
        workspaceId: testWorkspaceId,
        tenantId: testTenantId,
        createdBy: testUserId,
        contractVersion: '1.0.0',
        goals: { primary: 'Test campaign' },
        primaryChannels: { channels: ['facebook'] },
        budget: { total_usd: 1000 },
        approvalPolicy: { requires_approval: false },
        riskProfile: 'low',
        dataRetention: { logs_days: 30 },
        ttlHours: 168,
        policyBundleRef: 'test_policy',
        policyBundleChecksum: 'sha256:test',
        contractData: { version: '1.0.0' }
      };

      // Create first workspace
      await workspaceRepo.createWorkspace(workspaceData);

      // Attempt to create duplicate
      await expect(workspaceRepo.createWorkspace(workspaceData))
        .rejects.toThrow(/already exists/);
    });

    test('should retrieve workspace with relations', async () => {
      // Create workspace first
      await createTestWorkspace();

      const workspace = await workspaceRepo.getWorkspace(testWorkspaceId, true);

      expect(workspace).toBeDefined();
      expect(workspace!.workspaceId).toBe(testWorkspaceId);
      expect(workspace!.runs).toBeDefined();
      expect(workspace!.simulationReports).toBeDefined();
      expect(workspace!.agentRuns).toBeDefined();
    });

    test('should list workspaces for tenant with pagination', async () => {
      // Create multiple workspaces
      await createTestWorkspace();
      await createTestWorkspace(`${testWorkspaceId}_2`);
      await createTestWorkspace(`${testWorkspaceId}_3`);

      const result = await workspaceRepo.listWorkspaces(testTenantId, 2, 0);

      expect(result.workspaces).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.workspaces[0].tenantId).toBe(testTenantId);
    });

    test('should update workspace lifecycle', async () => {
      await createTestWorkspace();

      const updatedWorkspace = await workspaceRepo.updateWorkspaceLifecycle(
        testWorkspaceId,
        'active',
        testUserId
      );

      expect(updatedWorkspace.lifecycle).toBe('active');
      expect(updatedWorkspace.updatedAt).toBeDefined();
    });

    test('should clean up expired workspaces', async () => {
      // Create workspace with short TTL
      const expiredWorkspaceId = `${testWorkspaceId}_expired`;
      await createTestWorkspace(expiredWorkspaceId, 1); // 1 hour TTL

      // Manually update creation time to be in the past
      await prisma.workspace.update({
        where: { workspaceId: expiredWorkspaceId },
        data: {
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        }
      });

      const cleanedCount = await workspaceRepo.cleanupExpiredWorkspaces();

      expect(cleanedCount).toBe(1);

      // Verify workspace was deleted
      const workspace = await workspaceRepo.getWorkspace(expiredWorkspaceId);
      expect(workspace).toBeNull();
    });
  });

  describe('Simulation Repository', () => {
    beforeEach(async () => {
      await createTestWorkspace();
    });

    test('should create simulation report successfully', async () => {
      const reportData: CreateSimulationReportData = {
        simulationId: 'test_sim_001',
        workspaceId: testWorkspaceId,
        tenantId: testTenantId,
        iterations: 1000,
        randomSeed: 42,
        rngLibraryVersion: '3.0.5',
        nodejsVersion: process.version,
        readinessScore: 0.85,
        policyPassPct: 0.92,
        citationCoverage: 0.78,
        duplicationRisk: 0.15,
        costEstimateUsd: 1500.50,
        technicalReadiness: 0.88,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 30000,
        workspaceContext: { workspace_id: testWorkspaceId },
        workflowManifest: { version: '1.0.0' },
        simulationConfig: { iterations: 1000 },
        createdBy: testUserId
      };

      const report = await simulationRepo.createSimulationReport(reportData);

      expect(report.simulationId).toBe('test_sim_001');
      expect(report.workspaceId).toBe(testWorkspaceId);
      expect(report.readinessScore.toNumber()).toBe(0.85);
      expect(report.randomSeed).toBe(42);
    });

    test('should retrieve baseline simulation', async () => {
      // Create baseline simulation
      const reportData: CreateSimulationReportData = {
        simulationId: 'test_baseline_42',
        workspaceId: testWorkspaceId,
        tenantId: testTenantId,
        iterations: 1000,
        randomSeed: 42,
        rngLibraryVersion: '3.0.5',
        nodejsVersion: process.version,
        readinessScore: 0.85,
        policyPassPct: 0.92,
        citationCoverage: 0.78,
        duplicationRisk: 0.15,
        costEstimateUsd: 1500.50,
        technicalReadiness: 0.88,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 30000,
        workspaceContext: { workspace_id: testWorkspaceId },
        workflowManifest: { version: '1.0.0' },
        simulationConfig: { iterations: 1000 },
        createdBy: testUserId
      };

      await simulationRepo.createSimulationReport(reportData);

      const baseline = await simulationRepo.getBaselineSimulation(
        testWorkspaceId,
        42,
        '1.0.0'
      );

      expect(baseline).toBeDefined();
      expect(baseline!.randomSeed).toBe(42);
      expect(baseline!.engineVersion).toBe('1.0.0');
    });

    test('should get recent simulations', async () => {
      // Create multiple simulations
      for (let i = 0; i < 3; i++) {
        const reportData: CreateSimulationReportData = {
          simulationId: `test_sim_${i}`,
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          iterations: 1000,
          randomSeed: i,
          rngLibraryVersion: '3.0.5',
          nodejsVersion: process.version,
          readinessScore: 0.8 + (i * 0.05),
          policyPassPct: 0.9,
          citationCoverage: 0.75,
          duplicationRisk: 0.2,
          costEstimateUsd: 1000 + (i * 100),
          technicalReadiness: 0.85,
          startedAt: new Date(Date.now() - (i * 60000)), // Different times
          completedAt: new Date(Date.now() - (i * 60000) + 30000),
          durationMs: 30000,
          workspaceContext: { workspace_id: testWorkspaceId },
          workflowManifest: { version: '1.0.0' },
          simulationConfig: { iterations: 1000 },
          createdBy: testUserId
        };

        await simulationRepo.createSimulationReport(reportData);
      }

      const recent = await simulationRepo.getRecentSimulations(testWorkspaceId, 2);

      expect(recent).toHaveLength(2);
      expect(recent[0].createdAt.getTime()).toBeGreaterThan(recent[1].createdAt.getTime());
    });
  });

  describe('Agent Repository', () => {
    beforeEach(async () => {
      await createTestWorkspace();
    });

    test('should create agent run successfully', async () => {
      const runData: CreateAgentRunData = {
        jobId: 'test_job_001',
        workspaceId: testWorkspaceId,
        tenantId: testTenantId,
        agentType: 'research_agent',
        agentVersion: '1.0.0',
        inputData: { task: 'research competitors' },
        createdBy: testUserId
      };

      const agentRun = await agentRepo.createAgentRun(runData);

      expect(agentRun.jobId).toBe('test_job_001');
      expect(agentRun.status).toBe('pending');
      expect(agentRun.agentType).toBe('research_agent');
    });

    test('should update agent run status through lifecycle', async () => {
      // Create agent run
      const runData: CreateAgentRunData = {
        jobId: 'test_job_lifecycle',
        workspaceId: testWorkspaceId,
        tenantId: testTenantId,
        agentType: 'content_agent',
        agentVersion: '1.0.0',
        inputData: { task: 'generate content' },
        createdBy: testUserId
      };

      await agentRepo.createAgentRun(runData);

      // Update to running
      let updated = await agentRepo.updateAgentRunStatus('test_job_lifecycle', 'running');
      expect(updated.status).toBe('running');
      expect(updated.startedAt).toBeDefined();

      // Update to completed
      updated = await agentRepo.updateAgentRunStatus(
        'test_job_lifecycle', 
        'completed',
        { result: 'success' }
      );
      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
      expect(updated.durationMs).toBeDefined();
      expect(updated.outputData).toEqual({ result: 'success' });
    });

    test('should update model usage', async () => {
      // Create and complete agent run
      const runData: CreateAgentRunData = {
        jobId: 'test_job_usage',
        workspaceId: testWorkspaceId,
        tenantId: testTenantId,
        agentType: 'analysis_agent',
        agentVersion: '1.0.0',
        inputData: { task: 'analyze data' },
        createdBy: testUserId
      };

      await agentRepo.createAgentRun(runData);

      const modelUsage = {
        gpt4_tokens: 1500,
        claude_tokens: 800,
        total_cost_usd: 0.75,
        requests: 3
      };

      const updated = await agentRepo.updateModelUsage('test_job_usage', modelUsage);

      expect(updated.modelUsage).toEqual(modelUsage);
    });
  });

  describe('Transaction Safety', () => {
    test('should handle transaction rollback on error', async () => {
      await expect(
        withRetryTransaction(async (tx) => {
          // Create workspace
          await tx.workspace.create({
            data: {
              workspaceId: 'test_transaction',
              tenantId: testTenantId,
              createdBy: testUserId,
              createdAt: new Date(),
              contractVersion: '1.0.0',
              goals: {},
              primaryChannels: {},
              budget: {},
              approvalPolicy: {},
              riskProfile: 'low',
              dataRetention: {},
              ttlHours: 168,
              policyBundleRef: 'test',
              policyBundleChecksum: 'test',
              contractData: {}
            }
          });

          // Intentionally cause error
          throw new Error('Transaction test error');
        })
      ).rejects.toThrow('Transaction test error');

      // Verify workspace was not created
      const workspace = await workspaceRepo.getWorkspace('test_transaction');
      expect(workspace).toBeNull();
    });

    test('should retry failed transactions', async () => {
      let attempts = 0;

      const result = await withRetryTransaction(async (tx) => {
        attempts++;
        
        if (attempts < 2) {
          throw new Error('Simulated temporary error');
        }

        return await tx.workspace.create({
          data: {
            workspaceId: 'test_retry',
            tenantId: testTenantId,
            createdBy: testUserId,
            createdAt: new Date(),
            contractVersion: '1.0.0',
            goals: {},
            primaryChannels: {},
            budget: {},
            approvalPolicy: {},
            riskProfile: 'low',
            dataRetention: {},
            ttlHours: 168,
            policyBundleRef: 'test',
            policyBundleChecksum: 'test',
            contractData: {}
          }
        });
      }, 3);

      expect(attempts).toBe(2);
      expect(result.workspaceId).toBe('test_retry');
    });
  });

  // Helper functions
  async function createTestWorkspace(workspaceId = testWorkspaceId, ttlHours = 168) {
    const workspaceData: CreateWorkspaceData = {
      workspaceId,
      tenantId: testTenantId,
      createdBy: testUserId,
      contractVersion: '1.0.0',
      goals: { primary: 'Test campaign' },
      primaryChannels: { channels: ['facebook'] },
      budget: { total_usd: 1000 },
      approvalPolicy: { requires_approval: false },
      riskProfile: 'low',
      dataRetention: { logs_days: 30 },
      ttlHours,
      policyBundleRef: 'test_policy',
      policyBundleChecksum: 'sha256:test',
      contractData: { version: '1.0.0' }
    };

    return await workspaceRepo.createWorkspace(workspaceData);
  }

  async function cleanupTestData() {
    // Delete in reverse dependency order
    await prisma.agentRun.deleteMany({
      where: { tenantId: testTenantId }
    });

    await prisma.simulationReport.deleteMany({
      where: { tenantId: testTenantId }
    });

    await prisma.workspace.deleteMany({
      where: { tenantId: testTenantId }
    });
  }
});