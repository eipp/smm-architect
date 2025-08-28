import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import './config/sentry'; // Initialize Sentry
import { authMiddleware, ScopeMiddleware } from '../../shared/middleware/auth-middleware';
import { ModelRegistry } from './services/ModelRegistry';
import { ModelRouter } from './services/ModelRouter';
import { ModelEvaluationFramework } from './services/ModelEvaluationFramework';
import { CanaryDeploymentSystem } from './services/CanaryDeploymentSystem';
import { MetricsService } from './monitoring/metrics';
import { createLogger, requestLoggingMiddleware, StructuredLogger } from '../../shared/src/logging/structured-logger';
import { sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';
import { ModelRequest, ModelMetadata, RoutingRule } from './types';
import { errorHandler } from './middleware/error-handler';
import { contentRoutes } from './routes/content';

// Load environment variables
dotenv.config();

const app = express();
const logger = createLogger('ModelRouterAPI', {
  environment: process.env.NODE_ENV,
  version: process.env.npm_package_version,
  enableSentry: process.env.SENTRY_DSN ? true : false,
  logLevel: process.env.LOG_LEVEL || 'info'
});
const port = process.env.PORT || 3003;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize services
const registry = new ModelRegistry(redisUrl);
const router = new ModelRouter(registry);
const evaluationFramework = new ModelEvaluationFramework(registry);
const canarySystem = new CanaryDeploymentSystem(registry, evaluationFramework);
const metricsService = new MetricsService();

// Wire dependencies
router.setCanarySystem(canarySystem);

// Set up circuit breaker event listeners for metrics
router.on('circuitBreakerStateChange', (event) => {
  metricsService.recordCircuitBreakerState(event.modelId, event.newState, event.newState);
});

router.on('requestRouted', (event) => {
  // Additional metrics for successful routing (already handled in endpoint)
});

router.on('requestFailed', (event) => {
  // Additional metrics for failed routing (already handled in endpoint)
});

// Periodic metrics update job (every 30 seconds)
setInterval(() => {
  try {
    const resilienceStatus = router.getResilienceStatus();
    metricsService.updateResilienceMetrics(resilienceStatus);
  } catch (error) {
    logger.error('Failed to update resilience metrics', error as Error);
  }
}, 30000);

// Sentry middleware (must be first)
app.use(sentryRequestHandler);
app.use(sentryTracingHandler);

// Request logging and metrics middleware (moved to top)
app.use(requestLoggingMiddleware(logger));
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Override res.send to capture metrics
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const tenantId = (req as any).tenantId; // Set by auth middleware
    
    // Record metrics
    metricsService.recordRequest(req.method, req.route?.path || req.path, res.statusCode, duration, tenantId);
    
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      metricsService.recordError(req.method, req.route?.path || req.path, errorType, tenantId);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(compression({ level: 6, threshold: 1024 }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Apply authentication to all /api routes
app.use('/api', authMiddleware());

// Apply scope-based middleware for different resource types
app.use('/api/models', ScopeMiddleware.models.method);
app.use('/api/routing', ScopeMiddleware.routing.method);
app.use('/api/canary', ScopeMiddleware.canary.method);
app.use('/api/config', ScopeMiddleware.config.method);

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction): void | express.Response => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'model-router',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req: express.Request, res: express.Response) => {
  try {
    // Update resilience metrics before serving
    const resilienceStatus = router.getResilienceStatus();
    metricsService.updateResilienceMetrics(resilienceStatus);
    
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to get metrics', error as Error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Resilience status endpoint for monitoring
app.get('/api/resilience/status', async (req: express.Request, res: express.Response) => {
  try {
    const status = router.getResilienceStatus();
    res.json({
      timestamp: new Date().toISOString(),
      ...status
    });
  } catch (error) {
    logger.error('Failed to get resilience status', error as Error);
    res.status(500).json({ error: 'Failed to get resilience status' });
  }
});

// Model Management Routes

/**
 * Register a new model
 */
app.post('/api/models',
  [
    body('name').notEmpty().withMessage('Model name is required'),
    body('version').notEmpty().withMessage('Model version is required'),
    body('provider').isIn(['openai', 'anthropic', 'azure', 'custom']).withMessage('Invalid provider'),
    body('modelType').isIn(['chat', 'completion', 'embedding', 'image', 'audio']).withMessage('Invalid model type'),
    body('capabilities').isArray().withMessage('Capabilities must be an array'),
    body('parameters').isObject().withMessage('Parameters must be an object'),
    body('status').isIn(['active', 'inactive', 'deprecated', 'canary', 'testing']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const model = await registry.registerModel(req.body);
      logger.info(`Model registered via API: ${model.name}`, { modelId: model.id });
      res.status(201).json(model);
    } catch (error) {
      logger.error('Failed to register model', error as Error, { body: req.body });
      res.status(500).json({ error: 'Failed to register model' });
    }
  }
);

/**
 * Get model by ID
 */
app.get('/api/models/:modelId',
  [param('modelId').notEmpty().withMessage('Model ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const model = await registry.getModel(req.params.modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }
      res.json(model);
    } catch (error) {
      logger.error('Failed to get model', error as Error, { modelId: req.params.modelId });
      res.status(500).json({ error: 'Failed to get model' });
    }
  }
);

/**
 * Get models by criteria
 */
app.get('/api/models',
  [
    query('provider').optional().isIn(['openai', 'anthropic', 'azure', 'custom']),
    query('modelType').optional().isIn(['chat', 'completion', 'embedding', 'image', 'audio']),
    query('status').optional().isIn(['active', 'inactive', 'deprecated', 'canary', 'testing'])
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const criteria = {
        provider: req.query.provider as string,
        modelType: req.query.modelType as string,
        status: req.query.status as any,
        capabilities: req.query.capabilities ? String(req.query.capabilities).split(',') : undefined
      };

      const models = await registry.getModelsByCriteria(criteria);
      res.json({ models, count: models.length });
    } catch (error) {
      logger.error('Failed to get models', error as Error, { query: req.query });
      res.status(500).json({ error: 'Failed to get models' });
    }
  }
);

/**
 * Update model status
 */
app.patch('/api/models/:modelId/status',
  [
    param('modelId').notEmpty().withMessage('Model ID is required'),
    body('status').isIn(['active', 'inactive', 'deprecated', 'canary', 'testing']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await registry.updateModelStatus(req.params.modelId, req.body.status);
      logger.info(`Model status updated: ${req.params.modelId} -> ${req.body.status}`);
      res.json({ success: true, message: 'Model status updated' });
    } catch (error) {
      logger.error('Failed to update model status', error as Error, { 
        modelId: req.params.modelId, 
        status: req.body.status 
      });
      res.status(500).json({ error: 'Failed to update model status' });
    }
  }
);

/**
 * Get model health
 */
app.get('/api/models/:modelId/health',
  [param('modelId').notEmpty().withMessage('Model ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const health = await registry.getModelHealth(req.params.modelId);
      if (!health) {
        return res.status(404).json({ error: 'Model health data not found' });
      }
      res.json(health);
    } catch (error) {
      logger.error('Failed to get model health', error as Error, { modelId: req.params.modelId });
      res.status(500).json({ error: 'Failed to get model health' });
    }
  }
);

// Model Routing Routes

/**
 * Route a model request
 */
app.post('/api/route',
  [
    body('id').notEmpty().withMessage('Request ID is required'),
    body('agentType').notEmpty().withMessage('Agent type is required'),
    body('workspaceId').notEmpty().withMessage('Workspace ID is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('parameters').isObject().withMessage('Parameters must be an object'),
    body('metadata').isObject().withMessage('Metadata must be an object')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    const routeStartTime = Date.now();
    const tenantId = (req as any).tenantId;
    
    try {
      const request: ModelRequest = {
        ...req.body,
        timestamp: new Date()
      };

      const response = await router.routeRequest(request);
      
      // Record detailed model metrics
      const model = await registry.getModel(response.modelId);
      if (model) {
        metricsService.recordModelRequest(
          response.modelId,
          model.provider,
          request.agentType,
          response.latency,
          tenantId
        );
        
        // Record token usage if available
        if (response.usage) {
          metricsService.recordTokenUsage(
            response.modelId,
            response.usage.promptTokens,
            response.usage.completionTokens,
            response.usage.totalTokens,
            tenantId
          );
          
          // Record cost if available
          if (response.usage.cost) {
            metricsService.recordCost(
              response.modelId,
              model.provider,
              response.usage.cost,
              tenantId
            );
          }
        }
      }
      
      logger.info(`Request routed successfully: ${request.id}`, { 
        modelId: response.modelId,
        status: response.status,
        latency: response.latency,
        totalLatency: Date.now() - routeStartTime
      });
      
      res.json(response);
    } catch (error) {
      logger.error('Failed to route request', error as Error, { requestId: req.body.id });
      metricsService.recordError('POST', '/api/route', 'routing_failure', tenantId);
      res.status(500).json({ error: 'Failed to route request' });
    }
  }
);

/**
 * Get routing rules
 */
app.get('/api/routing/rules', (req: express.Request, res: express.Response) => {
  try {
    const rules = router.getRoutingRules();
    res.json({ rules, count: rules.length });
  } catch (error) {
    logger.error('Failed to get routing rules', error as Error);
    res.status(500).json({ error: 'Failed to get routing rules' });
  }
});

/**
 * Add routing rule
 */
app.post('/api/routing/rules',
  [
    body('name').notEmpty().withMessage('Rule name is required'),
    body('condition').isObject().withMessage('Condition must be an object'),
    body('targetModels').isArray().withMessage('Target models must be an array'),
    body('trafficSplit').isObject().withMessage('Traffic split must be an object'),
    body('priority').isNumeric().withMessage('Priority must be a number')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const rule = await router.addRoutingRule(req.body);
      logger.info(`Routing rule added: ${rule.name}`, { ruleId: rule.id });
      res.status(201).json(rule);
    } catch (error) {
      logger.error('Failed to add routing rule', error as Error, { body: req.body });
      res.status(500).json({ error: 'Failed to add routing rule' });
    }
  }
);

/**
 * Update routing rule
 */
app.patch('/api/routing/rules/:ruleId',
  [param('ruleId').notEmpty().withMessage('Rule ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const rule = await router.updateRoutingRule(req.params.ruleId, req.body);
      logger.info(`Routing rule updated: ${req.params.ruleId}`);
      res.json(rule);
    } catch (error) {
      logger.error('Failed to update routing rule', error as Error, { 
        ruleId: req.params.ruleId,
        body: req.body
      });
      res.status(500).json({ error: 'Failed to update routing rule' });
    }
  }
);

// Agent and Workspace Configuration Routes

/**
 * Set agent model preferences
 */
app.post('/api/agents/:agentType/preferences',
  [
    param('agentType').notEmpty().withMessage('Agent type is required'),
    body('preferredModels').isArray().withMessage('Preferred models must be an array'),
    body('fallbackModels').isArray().withMessage('Fallback models must be an array'),
    body('requiredCapabilities').isArray().withMessage('Required capabilities must be an array'),
    body('performanceRequirements').isObject().withMessage('Performance requirements must be an object')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await registry.setAgentPreferences(req.params.agentType, req.body);
      logger.info(`Agent preferences set: ${req.params.agentType}`);
      res.json({ success: true, message: 'Agent preferences updated' });
    } catch (error) {
      logger.error('Failed to set agent preferences', error as Error, { 
        agentType: req.params.agentType,
        body: req.body
      });
      res.status(500).json({ error: 'Failed to set agent preferences' });
    }
  }
);

/**
 * Get agent model preferences
 */
app.get('/api/agents/:agentType/preferences',
  [param('agentType').notEmpty().withMessage('Agent type is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const preferences = await registry.getAgentPreferences(req.params.agentType);
      if (!preferences) {
        return res.status(404).json({ error: 'Agent preferences not found' });
      }
      res.json(preferences);
    } catch (error) {
      logger.error('Failed to get agent preferences', error as Error, { 
        agentType: req.params.agentType
      });
      res.status(500).json({ error: 'Failed to get agent preferences' });
    }
  }
);

/**
 * Set workspace model configuration
 */
app.post('/api/workspaces/:workspaceId/config',
  [
    param('workspaceId').notEmpty().withMessage('Workspace ID is required'),
    body('modelRestrictions').isArray().withMessage('Model restrictions must be an array'),
    body('budgetLimits').isObject().withMessage('Budget limits must be an object'),
    body('qualityRequirements').isObject().withMessage('Quality requirements must be an object'),
    body('complianceRequirements').isArray().withMessage('Compliance requirements must be an array')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await registry.setWorkspaceConfig(req.params.workspaceId, req.body);
      logger.info(`Workspace config set: ${req.params.workspaceId}`);
      res.json({ success: true, message: 'Workspace configuration updated' });
    } catch (error) {
      logger.error('Failed to set workspace config', error as Error, { 
        workspaceId: req.params.workspaceId,
        body: req.body
      });
      res.status(500).json({ error: 'Failed to set workspace configuration' });
    }
  }
);

/**
 * Get request metrics
 */
app.get('/api/metrics/requests',
  [query('limit').optional().isNumeric().withMessage('Limit must be a number')],
  handleValidationErrors,
  (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const metrics = router.getRequestMetrics(limit);
      res.json({ metrics, count: metrics.length });
    } catch (error) {
      logger.error('Failed to get request metrics', error as Error);
      res.status(500).json({ error: 'Failed to get request metrics' });
    }
  }
);

// Model Endpoint Management Routes

/**
 * Register model endpoint
 */
app.post('/api/models/:modelId/endpoints',
  [
    param('modelId').notEmpty().withMessage('Model ID is required'),
    body('url').isURL().withMessage('Valid URL is required'),
    body('type').isIn(['primary', 'backup', 'canary']).withMessage('Invalid endpoint type'),
    body('weight').optional().isNumeric().withMessage('Weight must be a number'),
    body('healthCheckUrl').optional().isURL().withMessage('Health check URL must be valid')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const endpoint = await registry.registerEndpoint({
        modelId: req.params.modelId,
        ...req.body
      });
      logger.info(`Endpoint registered for model ${req.params.modelId}: ${endpoint.url}`);
      res.status(201).json(endpoint);
    } catch (error) {
      logger.error('Failed to register endpoint', error as Error, { 
        modelId: req.params.modelId,
        body: req.body 
      });
      res.status(500).json({ error: 'Failed to register endpoint' });
    }
  }
);

/**
 * Get model endpoints
 */
app.get('/api/models/:modelId/endpoints',
  [param('modelId').notEmpty().withMessage('Model ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const endpoints = await registry.getModelEndpoints(req.params.modelId);
      res.json({ endpoints, count: endpoints.length });
    } catch (error) {
      logger.error('Failed to get model endpoints', error as Error, { 
        modelId: req.params.modelId 
      });
      res.status(500).json({ error: 'Failed to get model endpoints' });
    }
  }
);

/**
 * Update model health
 */
app.post('/api/models/:modelId/health',
  [
    param('modelId').notEmpty().withMessage('Model ID is required'),
    body('status').isIn(['healthy', 'degraded', 'unhealthy', 'unknown']).withMessage('Invalid health status'),
    body('responseTime').optional().isNumeric().withMessage('Response time must be a number'),
    body('errorRate').optional().isNumeric().withMessage('Error rate must be a number'),
    body('availability').optional().isNumeric().withMessage('Availability must be a number')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await registry.updateModelHealth(req.params.modelId, req.body);
      logger.info(`Health updated for model: ${req.params.modelId}`, { status: req.body.status });
      res.json({ success: true, message: 'Model health updated' });
    } catch (error) {
      logger.error('Failed to update model health', error as Error, { 
        modelId: req.params.modelId,
        body: req.body 
      });
      res.status(500).json({ error: 'Failed to update model health' });
    }
  }
);

// Advanced Routing Routes

/**
 * Get active models for agent
 */
app.get('/api/agents/:agentType/models',
  [param('agentType').notEmpty().withMessage('Agent type is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const models = await registry.getActiveModelsForAgent(req.params.agentType);
      res.json({ models, count: models.length });
    } catch (error) {
      logger.error('Failed to get agent models', error as Error, { 
        agentType: req.params.agentType 
      });
      res.status(500).json({ error: 'Failed to get agent models' });
    }
  }
);

/**
 * Delete routing rule
 */
app.delete('/api/routing/rules/:ruleId',
  [param('ruleId').notEmpty().withMessage('Rule ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await router.deleteRoutingRule(req.params.ruleId);
      logger.info(`Routing rule deleted: ${req.params.ruleId}`);
      res.json({ success: true, message: 'Routing rule deleted' });
    } catch (error) {
      logger.error('Failed to delete routing rule', error as Error, { 
        ruleId: req.params.ruleId 
      });
      res.status(500).json({ error: 'Failed to delete routing rule' });
    }
  }
);

/**
 * Test routing for a request
 */
app.post('/api/routing/test',
  [
    body('agentType').notEmpty().withMessage('Agent type is required'),
    body('workspaceId').notEmpty().withMessage('Workspace ID is required'),
    body('requestType').notEmpty().withMessage('Request type is required'),
    body('prompt').notEmpty().withMessage('Prompt is required')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const testRequest: ModelRequest = {
        id: `test-${Date.now()}`,
        agentType: req.body.agentType,
        workspaceId: req.body.workspaceId,
        userId: 'test-user',
        prompt: req.body.prompt,
        parameters: req.body.parameters || {},
        metadata: {
          requestType: req.body.requestType,
          ...req.body.metadata
        },
        timestamp: new Date()
      };

      const result = await router.testRouting(testRequest);
      res.json(result);
    } catch (error) {
      logger.error('Failed to test routing', error as Error, { body: req.body });
      res.status(500).json({ error: 'Failed to test routing' });
    }
  }
);

// Analytics and Monitoring Routes

/**
 * Get model performance analytics
 */
app.get('/api/analytics/models',
  [
    query('timeRange').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid time range'),
    query('modelId').optional().withMessage('Model ID filter')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const timeRange = req.query.timeRange as string || '24h';
      const modelId = req.query.modelId as string;
      const analytics = await router.getModelAnalytics({ timeRange, modelId });
      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get model analytics', error as Error, { query: req.query });
      res.status(500).json({ error: 'Failed to get model analytics' });
    }
  }
);

/**
 * Get workspace usage analytics
 */
app.get('/api/analytics/workspaces/:workspaceId',
  [
    param('workspaceId').notEmpty().withMessage('Workspace ID is required'),
    query('timeRange').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid time range')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const timeRange = req.query.timeRange as string || '24h';
      const analytics = await router.getWorkspaceAnalytics(req.params.workspaceId, timeRange);
      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get workspace analytics', error as Error, { 
        workspaceId: req.params.workspaceId,
        query: req.query 
      });
      res.status(500).json({ error: 'Failed to get workspace analytics' });
    }
  }
);

/**
 * Get system health overview
 */
app.get('/api/health/overview', async (req: express.Request, res: express.Response) => {
  try {
    const overview = await router.getSystemHealthOverview();
    res.json(overview);
  } catch (error) {
    logger.error('Failed to get system health overview', error as Error);
    res.status(500).json({ error: 'Failed to get system health overview' });
  }
});

// Model Evaluation Routes

/**
 * Load golden dataset
 */
app.post('/api/evaluation/datasets/:category',
  [
    param('category').notEmpty().withMessage('Dataset category is required'),
    body('entries').isArray().withMessage('Entries must be an array'),
    body('entries.*.id').notEmpty().withMessage('Entry ID is required'),
    body('entries.*.prompt').notEmpty().withMessage('Entry prompt is required'),
    body('entries.*.expectedOutput').notEmpty().withMessage('Expected output is required')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await evaluationFramework.loadGoldenDataset(req.params.category, req.body.entries);
      logger.info(`Golden dataset loaded: ${req.params.category} (${req.body.entries.length} entries)`);
      res.json({ success: true, message: 'Golden dataset loaded successfully' });
    } catch (error) {
      logger.error('Failed to load golden dataset', error as Error, { 
        category: req.params.category,
        entryCount: req.body.entries?.length 
      });
      res.status(500).json({ error: 'Failed to load golden dataset' });
    }
  }
);

/**
 * Evaluate model against golden dataset
 */
app.post('/api/evaluation/models/:modelId/evaluate',
  [
    param('modelId').notEmpty().withMessage('Model ID is required'),
    body('datasetCategory').notEmpty().withMessage('Dataset category is required'),
    body('sampleSize').optional().isNumeric().withMessage('Sample size must be a number'),
    body('parallel').optional().isBoolean().withMessage('Parallel must be a boolean')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const evaluation = await evaluationFramework.evaluateModel(
        req.params.modelId,
        req.body.datasetCategory,
        {
          sampleSize: req.body.sampleSize,
          parallel: req.body.parallel,
          includeDetails: req.body.includeDetails
        }
      );
      
      logger.info(`Model evaluation completed: ${req.params.modelId}`, {
        category: req.body.datasetCategory,
        score: evaluation.overallScore,
        passRate: evaluation.passRate
      });
      
      res.json(evaluation);
    } catch (error) {
      logger.error('Model evaluation failed', error as Error, { 
        modelId: req.params.modelId,
        category: req.body.datasetCategory 
      });
      res.status(500).json({ error: 'Model evaluation failed' });
    }
  }
);

/**
 * Run A/B test between two models
 */
app.post('/api/evaluation/ab-test',
  [
    body('modelAId').notEmpty().withMessage('Model A ID is required'),
    body('modelBId').notEmpty().withMessage('Model B ID is required'),
    body('datasetCategory').notEmpty().withMessage('Dataset category is required'),
    body('sampleSize').optional().isNumeric().withMessage('Sample size must be a number'),
    body('confidenceLevel').optional().isNumeric().withMessage('Confidence level must be a number')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const abTest = await evaluationFramework.runABTest(
        req.body.modelAId,
        req.body.modelBId,
        req.body.datasetCategory,
        {
          sampleSize: req.body.sampleSize,
          confidenceLevel: req.body.confidenceLevel,
          minimumEffectSize: req.body.minimumEffectSize
        }
      );
      
      logger.info(`A/B test completed: ${req.body.modelAId} vs ${req.body.modelBId}`, {
        testId: abTest.testId,
        winner: abTest.summary.winnerModel,
        significant: abTest.summary.statisticalSignificance
      });
      
      res.json(abTest);
    } catch (error) {
      logger.error('A/B test failed', error as Error, { 
        modelAId: req.body.modelAId,
        modelBId: req.body.modelBId 
      });
      res.status(500).json({ error: 'A/B test failed' });
    }
  }
);

/**
 * Detect model drift
 */
app.post('/api/evaluation/models/:modelId/drift',
  [
    param('modelId').notEmpty().withMessage('Model ID is required'),
    body('timeFrameHours').optional().isNumeric().withMessage('Time frame must be a number'),
    body('threshold').optional().isNumeric().withMessage('Threshold must be a number')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const driftResult = await evaluationFramework.detectDrift(
        req.params.modelId,
        req.body.timeFrameHours,
        req.body.threshold
      );
      
      if (driftResult.driftDetected) {
        logger.warn(`Model drift detected: ${req.params.modelId}`, {
          driftScore: driftResult.driftScore,
          timeFrame: driftResult.timeFrame
        });
      }
      
      res.json(driftResult);
    } catch (error) {
      logger.error('Drift detection failed', error as Error, { 
        modelId: req.params.modelId 
      });
      res.status(500).json({ error: 'Drift detection failed' });
    }
  }
);

/**
 * Start continuous monitoring
 */
app.post('/api/evaluation/monitoring/start',
  [
    body('intervalMinutes').optional().isNumeric().withMessage('Interval must be a number')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await evaluationFramework.startContinuousMonitoring(req.body.intervalMinutes);
      logger.info('Continuous monitoring started', { interval: req.body.intervalMinutes });
      res.json({ success: true, message: 'Continuous monitoring started' });
    } catch (error) {
      logger.error('Failed to start continuous monitoring', error as Error);
      res.status(500).json({ error: 'Failed to start continuous monitoring' });
    }
  }
);

/**
 * Benchmark model performance
 */
app.post('/api/evaluation/models/:modelId/benchmark',
  [
    param('modelId').notEmpty().withMessage('Model ID is required'),
    body('benchmarkSuite').optional().withMessage('Benchmark suite name')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const benchmark = await evaluationFramework.benchmarkModel(
        req.params.modelId,
        req.body.benchmarkSuite
      );
      
      logger.info(`Model benchmark completed: ${req.params.modelId}`, {
        suite: benchmark.suite,
        ranking: benchmark.ranking
      });
      
      res.json(benchmark);
    } catch (error) {
      logger.error('Model benchmark failed', error as Error, { 
        modelId: req.params.modelId 
      });
      res.status(500).json({ error: 'Model benchmark failed' });
    }
  }
);

/**
 * Generate evaluation report
 */
app.get('/api/evaluation/models/:modelId/report',
  [
    param('modelId').notEmpty().withMessage('Model ID is required'),
    query('timeFrameHours').optional().isNumeric().withMessage('Time frame must be a number')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const timeFrameHours = req.query.timeFrameHours ? 
        parseInt(req.query.timeFrameHours as string) : 168;
      
      const report = await evaluationFramework.generateEvaluationReport(
        req.params.modelId,
        timeFrameHours
      );
      
      res.json(report);
    } catch (error) {
      logger.error('Failed to generate evaluation report', error as Error, { 
        modelId: req.params.modelId 
      });
      res.status(500).json({ error: 'Failed to generate evaluation report' });
    }
  }
);

// Canary Deployment Routes

/**
 * Create canary deployment
 */
app.post('/api/canary/deployments',
  [
    body('name').notEmpty().withMessage('Deployment name is required'),
    body('productionModelId').notEmpty().withMessage('Production model ID is required'),
    body('canaryModelId').notEmpty().withMessage('Canary model ID is required'),
    body('trafficSplit.production').isNumeric().withMessage('Production traffic split must be a number'),
    body('trafficSplit.canary').isNumeric().withMessage('Canary traffic split must be a number'),
    body('rolloutStrategy.type').isIn(['linear', 'exponential', 'step']).withMessage('Invalid rollout strategy type'),
    body('rolloutStrategy.duration').isNumeric().withMessage('Rollout duration must be a number'),
    body('successCriteria.minRequests').isNumeric().withMessage('Min requests must be a number'),
    body('successCriteria.maxErrorRate').isNumeric().withMessage('Max error rate must be a number')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const deployment = await canarySystem.createCanaryDeployment({
        ...req.body,
        createdBy: req.headers['x-user-id'] || 'api-user'
      });
      
      logger.info(`Canary deployment created: ${deployment.id}`, {
        productionModel: deployment.productionModelId,
        canaryModel: deployment.canaryModelId
      });
      
      res.status(201).json(deployment);
    } catch (error) {
      logger.error('Failed to create canary deployment', error as Error, { body: req.body });
      res.status(500).json({ error: 'Failed to create canary deployment' });
    }
  }
);

/**
 * Start canary deployment
 */
app.post('/api/canary/deployments/:deploymentId/start',
  [param('deploymentId').notEmpty().withMessage('Deployment ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await canarySystem.startCanaryDeployment(req.params.deploymentId);
      logger.info(`Canary deployment started: ${req.params.deploymentId}`);
      res.json({ success: true, message: 'Canary deployment started' });
    } catch (error) {
      logger.error('Failed to start canary deployment', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to start canary deployment' });
    }
  }
);

/**
 * Get deployment status
 */
app.get('/api/canary/deployments/:deploymentId',
  [param('deploymentId').notEmpty().withMessage('Deployment ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const status = await canarySystem.getDeploymentStatus(req.params.deploymentId);
      res.json(status);
    } catch (error) {
      logger.error('Failed to get deployment status', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to get deployment status' });
    }
  }
);

/**
 * List deployments
 */
app.get('/api/canary/deployments',
  [
    query('status').optional().isIn(['preparing', 'active', 'paused', 'completed', 'failed', 'rolledback']),
    query('productionModelId').optional(),
    query('canaryModelId').optional()
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const filter = {
        status: req.query.status as any,
        productionModelId: req.query.productionModelId as string,
        canaryModelId: req.query.canaryModelId as string
      };
      
      const deployments = await canarySystem.listDeployments(filter);
      res.json({ deployments, count: deployments.length });
    } catch (error) {
      logger.error('Failed to list deployments', error as Error, { query: req.query });
      res.status(500).json({ error: 'Failed to list deployments' });
    }
  }
);

/**
 * Pause deployment
 */
app.post('/api/canary/deployments/:deploymentId/pause',
  [param('deploymentId').notEmpty().withMessage('Deployment ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await canarySystem.pauseDeployment(req.params.deploymentId);
      logger.info(`Canary deployment paused: ${req.params.deploymentId}`);
      res.json({ success: true, message: 'Canary deployment paused' });
    } catch (error) {
      logger.error('Failed to pause canary deployment', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to pause canary deployment' });
    }
  }
);

/**
 * Resume deployment
 */
app.post('/api/canary/deployments/:deploymentId/resume',
  [param('deploymentId').notEmpty().withMessage('Deployment ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await canarySystem.resumeDeployment(req.params.deploymentId);
      logger.info(`Canary deployment resumed: ${req.params.deploymentId}`);
      res.json({ success: true, message: 'Canary deployment resumed' });
    } catch (error) {
      logger.error('Failed to resume canary deployment', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to resume canary deployment' });
    }
  }
);

/**
 * Rollback deployment
 */
app.post('/api/canary/deployments/:deploymentId/rollback',
  [
    param('deploymentId').notEmpty().withMessage('Deployment ID is required'),
    body('reason').optional().withMessage('Rollback reason')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const reason = req.body.reason || 'Manual rollback requested';
      await canarySystem.rollbackDeployment(req.params.deploymentId, reason);
      logger.info(`Canary deployment rolled back: ${req.params.deploymentId}`, { reason });
      res.json({ success: true, message: 'Canary deployment rolled back' });
    } catch (error) {
      logger.error('Failed to rollback canary deployment', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to rollback canary deployment' });
    }
  }
);

/**
 * Complete deployment (promote canary)
 */
app.post('/api/canary/deployments/:deploymentId/complete',
  [param('deploymentId').notEmpty().withMessage('Deployment ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await canarySystem.completeDeployment(req.params.deploymentId);
      logger.info(`Canary deployment completed: ${req.params.deploymentId}`);
      res.json({ success: true, message: 'Canary deployment completed - model promoted' });
    } catch (error) {
      logger.error('Failed to complete canary deployment', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to complete canary deployment' });
    }
  }
);

/**
 * Get deployment metrics
 */
app.get('/api/canary/deployments/:deploymentId/metrics',
  [
    param('deploymentId').notEmpty().withMessage('Deployment ID is required'),
    query('timeRange').optional().isIn(['1h', '6h', '24h', '7d']).withMessage('Invalid time range')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const metrics = await canarySystem.evaluateCanaryPerformance(req.params.deploymentId);
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get deployment metrics', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to get deployment metrics' });
    }
  }
);

/**
 * Make rollout decision
 */
app.post('/api/canary/deployments/:deploymentId/decision',
  [param('deploymentId').notEmpty().withMessage('Deployment ID is required')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const decision = await canarySystem.makeRolloutDecision(req.params.deploymentId);
      logger.info(`Rollout decision made: ${decision.action}`, {
        deploymentId: req.params.deploymentId,
        reason: decision.reason
      });
      res.json(decision);
    } catch (error) {
      logger.error('Failed to make rollout decision', error as Error, { 
        deploymentId: req.params.deploymentId 
      });
      res.status(500).json({ error: 'Failed to make rollout decision' });
    }
  }
);

/**
 * Execute rollout decision
 */
app.post('/api/canary/deployments/:deploymentId/execute',
  [
    param('deploymentId').notEmpty().withMessage('Deployment ID is required'),
    body('decision').isObject().withMessage('Decision object is required'),
    body('decision.action').isIn(['continue', 'pause', 'rollback', 'complete']).withMessage('Invalid decision action')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      await canarySystem.executeRolloutDecision(req.body.decision);
      logger.info(`Rollout decision executed: ${req.body.decision.action}`, {
        deploymentId: req.params.deploymentId
      });
      res.json({ success: true, message: 'Rollout decision executed' });
    } catch (error) {
      logger.error('Failed to execute rollout decision', error as Error, { 
        deploymentId: req.params.deploymentId,
        decision: req.body.decision
      });
      res.status(500).json({ error: 'Failed to execute rollout decision' });
    }
  }
);

// Batch Operations Routes

/**
 * Batch update model statuses
 */
app.patch('/api/models/batch/status',
  [
    body('updates').isArray().withMessage('Updates must be an array'),
    body('updates.*.modelId').notEmpty().withMessage('Model ID is required for each update'),
    body('updates.*.status').isIn(['active', 'inactive', 'deprecated', 'canary', 'testing']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const results = [];
      for (const update of req.body.updates) {
        try {
          await registry.updateModelStatus(update.modelId, update.status);
          results.push({ modelId: update.modelId, success: true });
        } catch (error) {
          results.push({ 
            modelId: update.modelId, 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      logger.info(`Batch status update completed: ${results.filter(r => r.success).length}/${results.length} successful`);
      res.json({ results, summary: { total: results.length, successful: results.filter(r => r.success).length } });
    } catch (error) {
      logger.error('Failed to batch update model statuses', error as Error, { body: req.body });
      res.status(500).json({ error: 'Failed to batch update model statuses' });
    }
  }
);

/**
 * Export configuration
 */
app.get('/api/config/export', async (req: express.Request, res: express.Response) => {
  try {
    const config = {
      models: await registry.getModelsByCriteria({}),
      routingRules: router.getRoutingRules(),
      agentPreferences: await router.getAllAgentPreferences(),
      workspaceConfigs: await router.getAllWorkspaceConfigs(),
      exportedAt: new Date().toISOString()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="model-router-config-${Date.now()}.json"`);
    res.json(config);
  } catch (error) {
    logger.error('Failed to export configuration', error as Error);
    res.status(500).json({ error: 'Failed to export configuration' });
  }
});

/**
 * Import configuration
 */
app.post('/api/config/import',
  [body('config').isObject().withMessage('Configuration must be an object')],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const importResult = await router.importConfiguration(req.body.config);
      logger.info('Configuration imported successfully', { summary: importResult });
      res.json({ success: true, summary: importResult });
    } catch (error) {
      logger.error('Failed to import configuration', error as Error, { body: req.body });
      res.status(500).json({ error: 'Failed to import configuration' });
    }
  }
);

// Authentication middleware for protected routes
app.use('/api/content', authMiddleware);

// Content generation routes
app.use('/api/content', contentRoutes);

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);

// Error handling middleware
app.use(errorHandler);
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log with structured logger
  StructuredLogger.setContext({
    requestId: req.headers['x-request-id'] as string,
    correlationId: req.headers['x-correlation-id'] as string,
    tenantId: (req as any).tenantId,
    userId: (req as any).userId
  });
  
  logger.error('Unhandled error', error, { 
    method: req.method,
    url: req.url,
    body: req.body
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId: req.headers['x-request-id']
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const server = app.listen(port, () => {
  logger.info(`Model Router Service started on port ${port}`, {
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    port,
    redisUrl
  });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Rejection', new Error(String(reason)), { promise });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    Promise.all([
      registry.disconnect(),
      canarySystem.cleanup()
    ]).then(() => {
      router.destroy(); // Cleanup circuit breakers and health checks
      logger.info('Model Router Service stopped');
      process.exit(0);
    }).catch((error) => {
      logger.error('Error during shutdown', error);
      process.exit(1);
    });
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    Promise.all([
      registry.disconnect(),
      canarySystem.cleanup()
    ]).then(() => {
      router.destroy(); // Cleanup circuit breakers and health checks
      logger.info('Model Router Service stopped');
      process.exit(0);
    }).catch((error) => {
      logger.error('Error during shutdown', error);
      process.exit(1);
    });
  });
});

export { app, registry, router, evaluationFramework, canarySystem };