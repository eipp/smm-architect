import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import './config/sentry'; // Initialize Sentry
import { MonteCarloEngine } from './services/monte-carlo-engine';
import { 
  SimulationRequest, 
  SimulationResponse, 
  WorkspaceContext,
  SimulationConfig,
  WorkflowNode,
  SimulationTrace
} from './types';

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/simulator.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    service: 'simulator'
  });
});

/**
 * Main simulation endpoint
 */
app.post('/simulate', async (req, res) => {
  const startTime = Date.now();
  const simulationId = `sim-${uuidv4()}`;
  
  try {
    logger.info('Starting simulation', { simulationId, request: req.body });

    // Validate request
    const validationError = validateSimulationRequest(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: validationError,
        simulationId
      });
    }

    const request: SimulationRequest = req.body;
    
    // Set up simulation configuration
    const config: SimulationConfig = {
      iterations: request.iterations || 1000,
      randomSeed: request.randomSeed || 42,
      timeoutSeconds: request.timeoutSeconds || 120,
      convergenceThreshold: 0.001,
      confidenceLevel: 0.95,
      enableEarlyTermination: true,
      parallelBatches: 4
    };

    // Create Monte Carlo engine
    const engine = new MonteCarloEngine(config);
    
    // Extract workspace context from request
    let workspace: WorkspaceContext;
    try {
      workspace = await getWorkspaceContext(request.workspaceId);
    } catch (error) {
      if (error instanceof WorkspaceFetchError) {
        logger.error('Workspace fetch failed', {
          simulationId,
          workspaceId: request.workspaceId,
          error: error.message
        });
        const code = error.status === 404 ? 'WORKSPACE_NOT_FOUND' : 'WORKSPACE_FETCH_FAILED';
        return res.status(error.status).json({
          error: code,
          message: error.message,
          simulationId
        });
      }
      throw error;
    }
    
    // Parse workflow
    const workflow = parseWorkflow(request.workflowJson);
    
    // Run simulation with timeout
    const simulationPromise = engine.runSimulation(workspace, workflow, request);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Simulation timeout')), config.timeoutSeconds * 1000);
    });

    const results = await Promise.race([simulationPromise, timeoutPromise]);
    
    // Generate simulation traces
    const traces = generateSimulationTraces(workspace, workflow, request);
    
    // Build response
    const response: SimulationResponse = {
      simulationId,
      readinessScore: results.readinessScore.mean,
      policyPassPct: results.policyPassPct.mean,
      citationCoverage: results.citationCoverage.mean,
      duplicationRisk: results.duplicationRisk.mean,
      costEstimateUSD: results.costEstimate.mean,
      technicalReadiness: results.technicalReadiness.mean,
      traces,
      confidence: {
        lower: results.readinessScore.confidence.lower,
        upper: results.readinessScore.confidence.upper,
        level: results.readinessScore.confidence.level
      },
      metadata: {
        iterations: config.iterations,
        randomSeed: config.randomSeed,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        version: '1.0.0'
      }
    };

    logger.info('Simulation completed', {
      simulationId,
      readinessScore: response.readinessScore,
      durationMs: response.metadata.durationMs
    });

    res.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Simulation failed', {
      simulationId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      error: 'SIMULATION_FAILED',
      message: errorMessage,
      simulationId
    });
  }
});

/**
 * Get simulation status
 */
app.get('/simulate/:simulationId', async (req, res) => {
  const { simulationId } = req.params;
  
  // In a real implementation, this would check a database or cache
  // For now, return a simple status response
  res.json({
    simulationId,
    status: 'completed',
    message: 'Simulation completed successfully'
  });
});

/**
 * Validate simulation request
 */
function validateSimulationRequest(body: any): string | null {
  if (!body.workspaceId) {
    return 'workspaceId is required';
  }
  
  if (!body.workflowJson) {
    return 'workflowJson is required';
  }
  
  if (body.iterations && (body.iterations < 1 || body.iterations > 10000)) {
    return 'iterations must be between 1 and 10000';
  }
  
  if (body.timeoutSeconds && (body.timeoutSeconds < 10 || body.timeoutSeconds > 600)) {
    return 'timeoutSeconds must be between 10 and 600';
  }
  
  return null;
}

/**
 * Error thrown when workspace retrieval fails
 */
class WorkspaceFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Get workspace context from SMM Architect service
 */
async function getWorkspaceContext(workspaceId: string): Promise<WorkspaceContext> {
  const baseUrl = process.env.SMM_ARCHITECT_URL || 'http://localhost:4000';
  try {
    const response = await axios.get<WorkspaceContext>(`${baseUrl}/workspaces/${workspaceId}`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        throw new WorkspaceFetchError('Workspace not found', 404);
      }
      throw new WorkspaceFetchError('Workspace service error', status);
    }
    throw new WorkspaceFetchError('Workspace service unreachable', 502);
  }
}

/**
 * Parse workflow JSON into workflow nodes
 */
function parseWorkflow(workflowJson: any): WorkflowNode[] {
  // Simplified workflow parsing
  // In real implementation, this would parse n8n workflow format
  return [
    {
      id: 'research_brand',
      type: 'agent',
      parameters: { agent: 'research-agent' },
      dependencies: [],
      estimatedDuration: 1200,
      failureRate: 0.02
    },
    {
      id: 'generate_content',
      type: 'agent',
      parameters: { agent: 'creative-agent' },
      dependencies: ['research_brand'],
      estimatedDuration: 2500,
      failureRate: 0.05
    },
    {
      id: 'policy_check',
      type: 'validation',
      parameters: { service: 'policy-engine' },
      dependencies: ['generate_content'],
      estimatedDuration: 150,
      failureRate: 0.01
    },
    {
      id: 'render_assets',
      type: 'render',
      parameters: { service: 'toolhub' },
      dependencies: ['generate_content'],
      estimatedDuration: 800,
      failureRate: 0.03
    },
    {
      id: 'schedule_posts',
      type: 'automation',
      parameters: { service: 'publisher-agent' },
      dependencies: ['policy_check', 'render_assets'],
      estimatedDuration: 300,
      failureRate: 0.02
    }
  ];
}

/**
 * Generate simulation traces
 */
function generateSimulationTraces(
  workspace: WorkspaceContext,
  workflow: WorkflowNode[],
  request: SimulationRequest
): SimulationTrace[] {
  const traces: SimulationTrace[] = [];
  
  // Add workflow node traces
  workflow.forEach(node => {
    const variance = 0.8 + Math.random() * 0.4; // ±20% variance
    const duration = Math.round(node.estimatedDuration * variance);
    const status = Math.random() < node.failureRate ? 'error' : 'ok';
    
    traces.push({
      nodeId: node.id,
      status: status as 'ok' | 'warning' | 'error',
      durationMs: duration,
      message: status === 'error' ? `Node ${node.id} encountered an error` : undefined
    });
  });
  
  // Add channel-specific traces
  (request.targetChannels || workspace.primaryChannels).forEach(channel => {
    traces.push({
      nodeId: `publish_${channel}`,
      status: 'ok',
      durationMs: Math.round(400 + Math.random() * 200),
      metadata: { channel, platform: channel }
    });
  });
  
  return traces;
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Simulator service started on port ${PORT}`);
});

export default app;