import { PrismaClient } from './generated/client';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const prisma = new PrismaClient();

/**
 * Seed script for SMM Architect database
 * Creates initial production data for testing and development
 */
async function main() {
  try {
    logger.info('Starting database seeding...');

    // Create test tenant and users
    await seedUsers();
    
    // Create sample workspaces
    await seedWorkspaces();
    
    // Create sample simulation reports
    await seedSimulationReports();
    
    // Create sample agent runs
    await seedAgentRuns();

    logger.info('Database seeding completed successfully');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

async function seedUsers() {
  logger.info('Seeding users...');

  const users = [
    {
      id: 'user_test_admin',
      email: 'admin@smmarchitect.com',
      name: 'Test Admin',
      tenantId: 'tenant_test',
      roles: ['admin', 'workspace_manager'],
      isActive: true
    },
    {
      id: 'user_test_marketer',
      email: 'marketer@smmarchitect.com',
      name: 'Test Marketer',
      tenantId: 'tenant_test',
      roles: ['marketer'],
      isActive: true
    },
    {
      id: 'user_test_analyst',
      email: 'analyst@smmarchitect.com',
      name: 'Test Analyst',
      tenantId: 'tenant_test',
      roles: ['analyst'],
      isActive: true
    }
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData
    });
  }

  logger.info(`Seeded ${users.length} users`);
}

async function seedWorkspaces() {
  logger.info('Seeding workspaces...');

  const workspaces = [
    {
      workspaceId: 'ws_icblabs_demo',
      tenantId: 'tenant_test',
      createdBy: 'user_test_admin',
      createdAt: new Date('2024-01-15'),
      lifecycle: 'active',
      contractVersion: '1.2.0',
      goals: {
        primary: 'Brand awareness campaign for ICB Labs',
        kpis: ['reach', 'engagement', 'conversion'],
        timeline: '2024-Q1'
      },
      primaryChannels: {
        channels: ['facebook', 'instagram', 'linkedin'],
        budget_allocation: { facebook: 0.4, instagram: 0.4, linkedin: 0.2 }
      },
      budget: {
        total_usd: 25000,
        monthly_usd: 8333,
        platform_fees: 0.15,
        creative_budget: 0.2
      },
      approvalPolicy: {
        requires_approval: true,
        approval_threshold_usd: 1000,
        auto_approve_below: 500
      },
      riskProfile: 'moderate',
      dataRetention: {
        logs_days: 90,
        reports_days: 365,
        pii_days: 30
      },
      ttlHours: 720, // 30 days
      policyBundleRef: 'policy_v1.2.0',
      policyBundleChecksum: 'sha256:a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
      contractData: {
        terms_version: '1.2.0',
        signed_at: '2024-01-15T10:00:00Z',
        effective_date: '2024-01-15',
        renewal_date: '2024-04-15'
      }
    },
    {
      workspaceId: 'ws_techcorp_q1',
      tenantId: 'tenant_test',
      createdBy: 'user_test_marketer',
      createdAt: new Date('2024-02-01'),
      lifecycle: 'draft',
      contractVersion: '1.2.0',
      goals: {
        primary: 'Product launch campaign for TechCorp',
        kpis: ['leads', 'demos', 'sales'],
        timeline: '2024-Q1'
      },
      primaryChannels: {
        channels: ['google', 'linkedin', 'twitter'],
        budget_allocation: { google: 0.5, linkedin: 0.3, twitter: 0.2 }
      },
      budget: {
        total_usd: 50000,
        monthly_usd: 16667,
        platform_fees: 0.12,
        creative_budget: 0.25
      },
      approvalPolicy: {
        requires_approval: true,
        approval_threshold_usd: 2000,
        auto_approve_below: 1000
      },
      riskProfile: 'conservative',
      dataRetention: {
        logs_days: 60,
        reports_days: 730,
        pii_days: 45
      },
      ttlHours: 1440, // 60 days
      policyBundleRef: 'policy_v1.2.0',
      policyBundleChecksum: 'sha256:a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
      contractData: {
        terms_version: '1.2.0',
        signed_at: '2024-02-01T14:30:00Z',
        effective_date: '2024-02-01',
        renewal_date: '2024-05-01'
      }
    }
  ];

  for (const workspaceData of workspaces) {
    await prisma.workspace.upsert({
      where: { workspaceId: workspaceData.workspaceId },
      update: workspaceData,
      create: workspaceData
    });
  }

  logger.info(`Seeded ${workspaces.length} workspaces`);
}

async function seedSimulationReports() {
  logger.info('Seeding simulation reports...');

  const reports = [
    {
      simulationId: 'sim_icblabs_baseline_42',
      workspaceId: 'ws_icblabs_demo',
      tenantId: 'tenant_test',
      iterations: 10000,
      randomSeed: 42,
      rngAlgorithm: 'seedrandom',
      rngLibraryVersion: '3.0.5',
      nodejsVersion: process.version,
      engineVersion: '1.0.0',
      readinessScore: 0.847,
      policyPassPct: 0.923,
      citationCoverage: 0.834,
      duplicationRisk: 0.127,
      costEstimateUsd: 24750.50,
      technicalReadiness: 0.891,
      confidenceBounds: { lower: 0.839, upper: 0.855, level: 0.95 },
      percentiles: { p5: 0.801, p25: 0.832, p50: 0.847, p75: 0.862, p95: 0.893 },
      convergenceMetadata: { converged: true, requiredIterations: 8234, stabilityThreshold: 0.001 },
      startedAt: new Date('2024-01-16T09:00:00Z'),
      completedAt: new Date('2024-01-16T09:02:15Z'),
      durationMs: 135000,
      workspaceContext: {
        workspace_id: 'ws_icblabs_demo',
        contract_version: '1.2.0',
        snapshot_at: '2024-01-16T09:00:00Z'
      },
      workflowManifest: {
        workflow_version: '1.0.0',
        stages: ['research', 'content', 'review', 'approval', 'execution'],
        policies: ['brand_safety', 'compliance', 'budget_control']
      },
      simulationConfig: {
        monte_carlo_iterations: 10000,
        confidence_level: 0.95,
        variance_models: ['normal', 'beta', 'triangular'],
        random_seed: 42
      },
      traces: {
        stage_durations: { research: 45.2, content: 67.8, review: 23.1, approval: 12.4, execution: 89.3 },
        policy_checks: { brand_safety: 0.934, compliance: 0.987, budget_control: 0.856 }
      },
      createdBy: 'system',
      correlationId: 'corr_icblabs_baseline_20240116'
    },
    {
      simulationId: 'sim_techcorp_draft_123',
      workspaceId: 'ws_techcorp_q1',
      tenantId: 'tenant_test',
      iterations: 5000,
      randomSeed: 123,
      rngAlgorithm: 'seedrandom',
      rngLibraryVersion: '3.0.5',
      nodejsVersion: process.version,
      engineVersion: '1.0.0',
      readinessScore: 0.612,
      policyPassPct: 0.789,
      citationCoverage: 0.645,
      duplicationRisk: 0.234,
      costEstimateUsd: 48900.75,
      technicalReadiness: 0.701,
      confidenceBounds: { lower: 0.598, upper: 0.626, level: 0.95 },
      percentiles: { p5: 0.567, p25: 0.593, p50: 0.612, p75: 0.631, p95: 0.657 },
      convergenceMetadata: { converged: false, requiredIterations: 5000, stabilityThreshold: 0.001 },
      startedAt: new Date('2024-02-02T15:30:00Z'),
      completedAt: new Date('2024-02-02T15:31:45Z'),
      durationMs: 105000,
      workspaceContext: {
        workspace_id: 'ws_techcorp_q1',
        contract_version: '1.2.0',
        snapshot_at: '2024-02-02T15:30:00Z'
      },
      workflowManifest: {
        workflow_version: '1.0.0',
        stages: ['research', 'content', 'review', 'approval', 'execution'],
        policies: ['brand_safety', 'compliance', 'budget_control']
      },
      simulationConfig: {
        monte_carlo_iterations: 5000,
        confidence_level: 0.95,
        variance_models: ['normal', 'beta'],
        random_seed: 123
      },
      traces: {
        stage_durations: { research: 52.7, content: 78.9, review: 31.2, approval: 18.6, execution: 102.1 },
        policy_checks: { brand_safety: 0.812, compliance: 0.923, budget_control: 0.734 }
      },
      createdBy: 'user_test_marketer',
      correlationId: 'corr_techcorp_draft_20240202'
    }
  ];

  for (const reportData of reports) {
    await prisma.simulationReport.upsert({
      where: { simulationId: reportData.simulationId },
      update: reportData,
      create: reportData
    });
  }

  logger.info(`Seeded ${reports.length} simulation reports`);
}

async function seedAgentRuns() {
  logger.info('Seeding agent runs...');

  const agentRuns = [
    {
      jobId: 'job_research_icblabs_001',
      workspaceId: 'ws_icblabs_demo',
      tenantId: 'tenant_test',
      agentType: 'research_agent',
      agentVersion: '1.2.0',
      status: 'completed',
      startedAt: new Date('2024-01-16T08:45:00Z'),
      completedAt: new Date('2024-01-16T08:58:30Z'),
      durationMs: 810000,
      inputData: {
        workspace_id: 'ws_icblabs_demo',
        research_scope: ['competitor_analysis', 'audience_insights', 'trend_analysis'],
        target_platforms: ['facebook', 'instagram', 'linkedin']
      },
      outputData: {
        competitor_count: 15,
        audience_size: 2450000,
        trending_topics: ['AI automation', 'digital transformation', 'cybersecurity'],
        confidence_score: 0.87
      },
      modelUsage: {
        gpt4_tokens: 15420,
        claude_tokens: 8960,
        total_cost_usd: 2.34,
        requests: 12
      },
      executionContext: {
        vault_token_used: true,
        execution_node: 'agent-worker-01',
        memory_peak_mb: 512,
        cpu_time_ms: 45600
      },
      vaultTokenRef: 'token_research_icblabs_001',
      qualityScore: 0.89,
      outputConfidence: 0.87,
      toolsUsed: {
        tools: ['web_scraper', 'social_api', 'trend_analyzer'],
        api_calls: 47,
        success_rate: 0.96
      },
      createdBy: 'system',
      correlationId: 'corr_icblabs_baseline_20240116'
    },
    {
      jobId: 'job_content_techcorp_001',
      workspaceId: 'ws_techcorp_q1',
      tenantId: 'tenant_test',
      agentType: 'content_agent',
      agentVersion: '1.1.5',
      status: 'failed',
      startedAt: new Date('2024-02-02T14:20:00Z'),
      completedAt: new Date('2024-02-02T14:25:45Z'),
      durationMs: 345000,
      inputData: {
        workspace_id: 'ws_techcorp_q1',
        content_type: 'social_posts',
        target_count: 20,
        platforms: ['google', 'linkedin', 'twitter']
      },
      outputData: null,
      errorMessage: 'Rate limit exceeded on content generation API. Max retries reached.',
      modelUsage: {
        gpt4_tokens: 8950,
        claude_tokens: 0,
        total_cost_usd: 1.12,
        requests: 8
      },
      executionContext: {
        vault_token_used: true,
        execution_node: 'agent-worker-02',
        memory_peak_mb: 768,
        cpu_time_ms: 23400
      },
      vaultTokenRef: 'token_content_techcorp_001',
      qualityScore: null,
      outputConfidence: null,
      toolsUsed: {
        tools: ['content_generator', 'brand_validator'],
        api_calls: 8,
        success_rate: 0.0
      },
      createdBy: 'user_test_marketer',
      correlationId: 'corr_techcorp_draft_20240202',
      retryCount: 3
    }
  ];

  for (const runData of agentRuns) {
    await prisma.agentRun.upsert({
      where: { jobId: runData.jobId },
      update: runData,
      create: runData
    });
  }

  logger.info(`Seeded ${agentRuns.length} agent runs`);
}

main()
  .catch((e) => {
    logger.error('Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });