import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { WorkspaceProvisioningService, ProvisioningRequest } from './provisioning-service';
import AutonomousDeploymentWorkflow, { TenantConfiguration, WorkspaceTemplate } from './autonomous-deployment-workflow';
import { AgentuityClient } from './agentuity-client';
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

const app = express();
const port = process.env.PORT || 3006;

// Initialize services
const provisioningService = new WorkspaceProvisioningService();
const agentuityClient = new AgentuityClient();
const autonomousWorkflow = new AutonomousDeploymentWorkflow(provisioningService, agentuityClient);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// Strict rate limiting for provisioning operations
const provisioningLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 provisioning operations per hour
  message: 'Too many provisioning requests from this IP'
});

// Simplified authentication middleware for development
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // For development - simplified user context
    // In production, implement proper JWT validation
    (req as any).user = {
      userId: 'dev-user',
      tenantId: req.headers['x-tenant-id'] || 'default-tenant',
      roles: ['admin', 'super-admin']
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error instanceof Error ? error.message : error });
    return res.status(500).json({ error: 'Authentication service error' });
  }
}

// Request validation middleware
function validateProvisioningRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { workspaceId, tenantId, environment, region, resourceTier } = req.body;

  if (!workspaceId || !tenantId || !environment || !region || !resourceTier) {
    return res.status(400).json({
      error: 'Missing required fields: workspaceId, tenantId, environment, region, resourceTier'
    });
  }

  if (!['development', 'staging', 'production'].includes(environment)) {
    return res.status(400).json({
      error: 'Invalid environment. Must be: development, staging, or production'
    });
  }

  if (!['small', 'medium', 'large', 'enterprise'].includes(resourceTier)) {
    return res.status(400).json({
      error: 'Invalid resourceTier. Must be: small, medium, large, or enterprise'
    });
  }

  // Validate workspace ID format
  if (!/^[a-zA-Z0-9-_]+$/.test(workspaceId)) {
    return res.status(400).json({
      error: 'Invalid workspaceId format. Only alphanumeric characters, hyphens, and underscores allowed'
    });
  }

  next();
}

// Error handling middleware
function errorHandler(error: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'workspace-provisioning',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes

/**
 * POST /api/workspaces/provision
 * Provision a new workspace with cloud infrastructure
 */
app.post('/api/workspaces/provision', 
  authenticate, 
  provisioningLimiter, 
  validateProvisioningRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = (req as any).user;
      const request: ProvisioningRequest = req.body;

      // Ensure user has permission for this tenant
      if (user.tenantId !== request.tenantId && !user.roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Insufficient permissions for this tenant' });
      }

      logger.info('Starting workspace provisioning', {
        workspaceId: request.workspaceId,
        tenantId: request.tenantId,
        requestedBy: user.userId
      });

      const result = await provisioningService.provisionWorkspace(request);

      res.status(result.status === 'succeeded' ? 201 : 500).json({
        ...result,
        requestedBy: user.userId
      });

    } catch (error) {
      logger.error('Workspace provisioning failed', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.body.workspaceId
      });

      res.status(500).json({
        error: 'Provisioning failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/status
 * Get status of a provisioned workspace
 */
app.get('/api/workspaces/:workspaceId/status',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const { environment } = req.query;
      const user = (req as any).user;

      if (!environment || typeof environment !== 'string') {
        return res.status(400).json({ error: 'Missing environment query parameter' });
      }

      const status = await provisioningService.getWorkspaceStatus(workspaceId, environment);

      if (!status) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(status);

    } catch (error) {
      logger.error('Failed to get workspace status', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Failed to get workspace status',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * PUT /api/workspaces/:workspaceId
 * Update existing workspace configuration
 */
app.put('/api/workspaces/:workspaceId',
  authenticate,
  provisioningLimiter,
  validateProvisioningRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const user = (req as any).user;
      const request: ProvisioningRequest = { ...req.body, workspaceId };

      if (user.tenantId !== request.tenantId && !user.roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Insufficient permissions for this tenant' });
      }

      logger.info('Starting workspace update', {
        workspaceId,
        tenantId: request.tenantId,
        requestedBy: user.userId
      });

      const result = await provisioningService.updateWorkspace(request);

      res.status(result.status === 'succeeded' ? 200 : 500).json({
        ...result,
        requestedBy: user.userId
      });

    } catch (error) {
      logger.error('Workspace update failed', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Update failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * DELETE /api/workspaces/:workspaceId
 * Destroy workspace infrastructure
 */
app.delete('/api/workspaces/:workspaceId',
  authenticate,
  provisioningLimiter,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const { environment } = req.query;
      const user = (req as any).user;

      if (!environment || typeof environment !== 'string') {
        return res.status(400).json({ error: 'Missing environment query parameter' });
      }

      // Additional safety check for production
      if (environment === 'production' && !user.roles.includes('admin')) {
        return res.status(403).json({ error: 'Admin role required to destroy production workspaces' });
      }

      logger.info('Starting workspace destruction', {
        workspaceId,
        environment,
        requestedBy: user.userId
      });

      const result = await provisioningService.destroyWorkspace(workspaceId, environment);

      res.status(result.status === 'succeeded' ? 200 : 500).json({
        ...result,
        requestedBy: user.userId
      });

    } catch (error) {
      logger.error('Workspace destruction failed', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Destruction failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/tenants/:tenantId/workspaces
 * List all workspaces for a tenant
 */
app.get('/api/tenants/:tenantId/workspaces',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { tenantId } = req.params;
      const user = (req as any).user;

      if (user.tenantId !== tenantId && !user.roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Insufficient permissions for this tenant' });
      }

      const workspaces = await provisioningService.listWorkspaces(tenantId);

      res.json({
        tenantId,
        workspaces,
        count: workspaces.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to list workspaces', {
        error: error instanceof Error ? error.message : error,
        tenantId: req.params.tenantId
      });

      res.status(500).json({
        error: 'Failed to list workspaces',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/preview
 * Preview changes for workspace update
 */
app.post('/api/workspaces/:workspaceId/preview',
  authenticate,
  validateProvisioningRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const user = (req as any).user;
      const request: ProvisioningRequest = { ...req.body, workspaceId };

      if (user.tenantId !== request.tenantId && !user.roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Insufficient permissions for this tenant' });
      }

      const preview = await provisioningService.previewWorkspaceChanges(request);

      res.json({
        workspaceId,
        ...preview,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to preview changes', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Preview failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// =============================================================================
// AUTONOMOUS AGENT MANAGEMENT API ENDPOINTS
// =============================================================================

/**
 * POST /api/tenants/register
 * Register a tenant with autonomous deployment configuration
 */
app.post('/api/tenants/register',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = (req as any).user;
      const tenantConfig: TenantConfiguration = req.body;

      // Only super-admins can register new tenants
      if (!user.roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Super admin role required to register tenants' });
      }

      // Validate required fields
      if (!tenantConfig.tenantId || !tenantConfig.organizationName || !tenantConfig.subscriptionTier) {
        return res.status(400).json({
          error: 'Missing required fields: tenantId, organizationName, subscriptionTier'
        });
      }

      logger.info('Registering tenant for autonomous deployment', {
        tenantId: tenantConfig.tenantId,
        organizationName: tenantConfig.organizationName,
        registeredBy: user.userId
      });

      await autonomousWorkflow.registerTenant(tenantConfig);

      res.status(201).json({
        message: 'Tenant registered successfully',
        tenantId: tenantConfig.tenantId,
        registeredBy: user.userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to register tenant', {
        error: error instanceof Error ? error.message : error,
        tenantId: req.body.tenantId
      });

      res.status(500).json({
        error: 'Tenant registration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/deployment/plans
 * Create autonomous deployment plan
 */
app.post('/api/deployment/plans',
  authenticate,
  provisioningLimiter,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = (req as any).user;
      const { tenantId, workspaces } = req.body;

      if (!tenantId || !workspaces || !Array.isArray(workspaces)) {
        return res.status(400).json({
          error: 'Missing required fields: tenantId, workspaces (array)'
        });
      }

      // Ensure user has permission for this tenant
      if (user.tenantId !== tenantId && !user.roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Insufficient permissions for this tenant' });
      }

      logger.info('Creating autonomous deployment plan', {
        tenantId,
        workspaceCount: workspaces.length,
        requestedBy: user.userId
      });

      const plan = await autonomousWorkflow.createDeploymentPlan(tenantId, workspaces);

      res.status(201).json({
        ...plan,
        requestedBy: user.userId
      });

    } catch (error) {
      logger.error('Failed to create deployment plan', {
        error: error instanceof Error ? error.message : error,
        tenantId: req.body.tenantId
      });

      res.status(500).json({
        error: 'Deployment plan creation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/deployment/plans/:planId/execute
 * Execute autonomous deployment plan
 */
app.post('/api/deployment/plans/:planId/execute',
  authenticate,
  provisioningLimiter,
  async (req: express.Request, res: express.Response) => {
    try {
      const { planId } = req.params;
      const user = (req as any).user;

      logger.info('Executing autonomous deployment plan', {
        planId,
        requestedBy: user.userId
      });

      // For execution, we need to retrieve the plan and validate permissions
      // This is a simplified version - in production you'd store plans in a database
      const execution = await autonomousWorkflow.executeDeploymentPlan({
        planId,
        tenantId: user.tenantId, // Simplified - would normally retrieve from stored plan
        workspaces: [], // Would be retrieved from stored plan
        totalEstimatedCost: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        status: 'planned'
      });

      res.status(202).json({
        message: 'Deployment execution started',
        ...execution,
        requestedBy: user.userId
      });

    } catch (error) {
      logger.error('Failed to execute deployment plan', {
        error: error instanceof Error ? error.message : error,
        planId: req.params.planId
      });

      res.status(500).json({
        error: 'Deployment execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/deployment/plans/:planId/status
 * Get deployment execution status
 */
app.get('/api/deployment/plans/:planId/status',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { planId } = req.params;
      const user = (req as any).user;

      const status = autonomousWorkflow.getDeploymentStatus(planId);

      if (!status) {
        return res.status(404).json({ error: 'Deployment plan not found' });
      }

      res.json({
        ...status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get deployment status', {
        error: error instanceof Error ? error.message : error,
        planId: req.params.planId
      });

      res.status(500).json({
        error: 'Failed to get deployment status',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/campaigns
 * Create autonomous marketing campaign
 */
app.post('/api/workspaces/:workspaceId/campaigns',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const user = (req as any).user;
      const campaignConfig = req.body;

      // Validate required campaign fields
      if (!campaignConfig.objective || !campaignConfig.targetAudience || !campaignConfig.contentParameters) {
        return res.status(400).json({
          error: 'Missing required fields: objective, targetAudience, contentParameters'
        });
      }

      logger.info('Creating autonomous marketing campaign', {
        workspaceId,
        objective: campaignConfig.objective,
        requestedBy: user.userId
      });

      const campaign = await autonomousWorkflow.createMarketingCampaign(workspaceId, campaignConfig);

      res.status(201).json({
        message: 'Autonomous marketing campaign created',
        ...campaign,
        requestedBy: user.userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to create marketing campaign', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Campaign creation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/agents
 * Get workspace agent status and health
 */
app.get('/api/workspaces/:workspaceId/agents',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const user = (req as any).user;

      logger.debug('Getting workspace agent status', { workspaceId, requestedBy: user.userId });

      // Get agent status through the autonomous workflow
      const agentStatus = await autonomousWorkflow.optimizeWorkspaceOperations(workspaceId);

      res.json({
        workspaceId,
        ...agentStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get agent status', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Failed to get agent status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/workflows
 * Execute autonomous workflow
 */
app.post('/api/workspaces/:workspaceId/workflows',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const user = (req as any).user;
      const { workflow, input, priority = 'normal' } = req.body;

      if (!workflow || !input) {
        return res.status(400).json({
          error: 'Missing required fields: workflow, input'
        });
      }

      if (!['research-only', 'content-creation', 'full-campaign', 'compliance-check'].includes(workflow)) {
        return res.status(400).json({
          error: 'Invalid workflow type. Must be: research-only, content-creation, full-campaign, or compliance-check'
        });
      }

      logger.info('Executing autonomous workflow', {
        workspaceId,
        workflow,
        priority,
        requestedBy: user.userId
      });

      // Access the agent lifecycle manager through the provisioning service
      const agentManager = (provisioningService as any).agentLifecycleManager;
      if (!agentManager) {
        throw new Error('Agent lifecycle manager not available');
      }

      const execution = await agentManager.executeWorkflow(workspaceId, workflow, input, priority);

      res.status(202).json({
        message: 'Workflow execution started',
        ...execution,
        requestedBy: user.userId
      });

    } catch (error) {
      logger.error('Failed to execute workflow', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Workflow execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/executions/:executionId
 * Get workflow execution status
 */
app.get('/api/executions/:executionId',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { executionId } = req.params;
      const user = (req as any).user;

      // Access the agent lifecycle manager through the provisioning service
      const agentManager = (provisioningService as any).agentLifecycleManager;
      if (!agentManager) {
        throw new Error('Agent lifecycle manager not available');
      }

      const execution = agentManager.getExecutionStatus(executionId);

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      res.json({
        ...execution,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get execution status', {
        error: error instanceof Error ? error.message : error,
        executionId: req.params.executionId
      });

      res.status(500).json({
        error: 'Failed to get execution status',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/agents/heal
 * Trigger agent healing for a workspace
 */
app.post('/api/workspaces/:workspaceId/agents/heal',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const { workspaceId } = req.params;
      const user = (req as any).user;

      logger.info('Triggering agent healing', {
        workspaceId,
        requestedBy: user.userId
      });

      // Access the agent lifecycle manager through the provisioning service
      const agentManager = (provisioningService as any).agentLifecycleManager;
      if (!agentManager) {
        throw new Error('Agent lifecycle manager not available');
      }

      await agentManager.healWorkspace(workspaceId);

      res.json({
        message: 'Agent healing initiated',
        workspaceId,
        requestedBy: user.userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to heal agents', {
        error: error instanceof Error ? error.message : error,
        workspaceId: req.params.workspaceId
      });

      res.status(500).json({
        error: 'Agent healing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/agents/health
 * Check Agentuity platform health
 */
app.get('/api/agents/health',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const health = await agentuityClient.healthCheck();

      res.json({
        platform: 'agentuity',
        ...health,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to check Agentuity health', {
        error: error instanceof Error ? error.message : error
      });

      res.status(503).json({
        error: 'Agentuity platform unavailable',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Apply error handling middleware
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Workspace Provisioning Service started on port ${port}`, {
      service: 'workspace-provisioning',
      port,
      environment: process.env.NODE_ENV || 'development'
    });
  });
}

export default app;