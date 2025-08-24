import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { WorkspaceProvisioningService, ProvisioningRequest } from './provisioning-service';
import { AuthenticationService } from '../../shared/auth-service';
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
const authService = new AuthenticationService();

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

// Authentication middleware
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const validation = await authService.validateToken(token);
    
    if (!validation.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Add user context to request
    (req as any).user = validation.payload;
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Authentication service error' });
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