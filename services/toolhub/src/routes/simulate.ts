import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { AuthenticatedRequest, requireScopes } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';

const router = Router();
const SIMULATOR_SERVICE_URL = process.env.SIMULATOR_SERVICE_URL || 'http://localhost:8082';

/**
 * POST /api/simulate/run
 * Run Monte Carlo simulation for campaign readiness
 */
router.post('/run',
  requireScopes(['simulate:execute']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('simulationConfig.iterations').optional().isInt({ min: 100, max: 10000 }).withMessage('Iterations must be between 100-10000'),
    body('simulationConfig.randomSeed').optional().isInt({ min: 1 }).withMessage('Random seed must be positive integer'),
    body('simulationConfig.confidenceLevel').optional().isFloat({ min: 0.8, max: 0.99 }).withMessage('Confidence level must be between 0.8-0.99'),
    body('simulationConfig.parallelBatches').optional().isInt({ min: 1, max: 10 }).withMessage('Parallel batches must be between 1-10'),
    body('workflowNodes').optional().isArray(),
    body('workflowNodes.*.nodeId').optional().isString(),
    body('workflowNodes.*.nodeType').optional().isIn(['agent', 'validation', 'transformation']),
    body('requestMetadata.requestedBy').optional().isString(),
    body('requestMetadata.priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid simulation parameters', errors.array());
      }

      const { workspaceId, simulationConfig, workflowNodes, requestMetadata } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Default simulation configuration
      const config = {
        iterations: 1000,
        randomSeed: Math.floor(Math.random() * 1000000),
        confidenceLevel: 0.95,
        parallelBatches: 4,
        enableEarlyTermination: true,
        convergenceThreshold: 0.01,
        ...simulationConfig
      };

      // Enhanced request payload
      const simulationRequest = {
        workspaceId,
        simulationConfig: config,
        workflowNodes: workflowNodes || [],
        requestMetadata: {
          requestedBy: req.user?.userId,
          requestedAt: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          clientIp: req.ip,
          ...requestMetadata
        }
      };

      // Proxy request to simulator service
      const startTime = Date.now();
      const response = await axios.post(
        `${SIMULATOR_SERVICE_URL}/api/simulate`,
        simulationRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': req.ip,
            'X-Request-ID': req.get('X-Request-ID') || `sim-${Date.now()}`
          },
          timeout: 300000 // 5 minutes timeout
        }
      );

      const duration = Date.now() - startTime;

      // Add proxy metadata to response
      const enhancedResponse = {
        ...response.data,
        metadata: {
          ...response.data.metadata,
          proxyDuration: duration,
          proxiedAt: new Date().toISOString(),
          proxyVersion: '1.0.0'
        }
      };

      res.json(enhancedResponse);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Simulation service error';
        throw new ApiError(status, 'SIMULATION_SERVICE_ERROR', message, {
          serviceUrl: SIMULATOR_SERVICE_URL,
          responseData: error.response?.data
        });
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'SIMULATION_PROXY_ERROR', `Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/simulate/results/:simulationId
 * Get simulation results by ID
 */
router.get('/results/:simulationId',
  requireScopes(['simulate:read']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { simulationId } = req.params;
      
      const response = await axios.get(
        `${SIMULATOR_SERVICE_URL}/api/simulate/results/${simulationId}`,
        {
          headers: {
            'X-Request-ID': req.get('X-Request-ID') || `get-${Date.now()}`
          },
          timeout: 30000
        }
      );

      // Verify user has access to the workspace that owns this simulation
      const simulationData = response.data;
      if (simulationData.workspaceId !== req.user?.workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'SIMULATION_ACCESS_DENIED', 'Access denied to simulation results');
      }

      res.json(response.data);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Failed to retrieve simulation results';
        throw new ApiError(status, 'SIMULATION_RETRIEVAL_ERROR', message);
      }
      
      throw new ApiError(500, 'SIMULATION_PROXY_ERROR', `Failed to get simulation results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/simulate/status/:simulationId
 * Get simulation execution status
 */
router.get('/status/:simulationId',
  requireScopes(['simulate:read']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { simulationId } = req.params;
      
      const response = await axios.get(
        `${SIMULATOR_SERVICE_URL}/api/simulate/status/${simulationId}`,
        {
          timeout: 10000
        }
      );

      res.json({
        simulationId,
        status: response.data.status,
        progress: response.data.progress,
        estimatedCompletion: response.data.estimatedCompletion,
        startedAt: response.data.startedAt,
        checkedAt: new Date().toISOString()
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Failed to get simulation status';
        throw new ApiError(status, 'SIMULATION_STATUS_ERROR', message);
      }
      
      throw new ApiError(500, 'SIMULATION_PROXY_ERROR', `Failed to get simulation status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/simulate/validate
 * Validate simulation parameters before execution
 */
router.post('/validate',
  requireScopes(['simulate:read']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('simulationConfig').isObject().withMessage('Simulation config required'),
    body('workflowNodes').optional().isArray()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid validation parameters', errors.array());
      }

      const { workspaceId, simulationConfig, workflowNodes } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin') ) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const response = await axios.post(
        `${SIMULATOR_SERVICE_URL}/api/simulate/validate`,
        {
          workspaceId,
          simulationConfig,
          workflowNodes: workflowNodes || []
        },
        {
          timeout: 30000
        }
      );

      res.json({
        valid: response.data.valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
        estimatedDuration: response.data.estimatedDuration,
        estimatedCost: response.data.estimatedCost,
        validatedAt: new Date().toISOString()
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Validation service error';
        throw new ApiError(status, 'SIMULATION_VALIDATION_ERROR', message);
      }
      
      throw new ApiError(500, 'SIMULATION_PROXY_ERROR', `Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/simulate/history/:workspaceId
 * Get simulation history for a workspace
 */
router.get('/history/:workspaceId',
  requireScopes(['simulate:read']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { limit = '10', offset = '0' } = req.query;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const response = await axios.get(
        `${SIMULATOR_SERVICE_URL}/api/simulate/history/${workspaceId}`,
        {
          params: { limit, offset },
          timeout: 30000
        }
      );

      res.json({
        workspaceId,
        simulations: response.data.simulations || [],
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: response.data.total || 0
        },
        retrievedAt: new Date().toISOString()
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Failed to retrieve simulation history';
        throw new ApiError(status, 'SIMULATION_HISTORY_ERROR', message);
      }
      
      throw new ApiError(500, 'SIMULATION_PROXY_ERROR', `Failed to get simulation history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * DELETE /api/simulate/results/:simulationId
 * Delete simulation results
 */
router.delete('/results/:simulationId',
  requireScopes(['simulate:write']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { simulationId } = req.params;
      
      // First get simulation to verify ownership
      const simulationResponse = await axios.get(
        `${SIMULATOR_SERVICE_URL}/api/simulate/results/${simulationId}`,
        { timeout: 10000 }
      );

      const simulationData = simulationResponse.data;
      if (simulationData.workspaceId !== req.user?.workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'SIMULATION_ACCESS_DENIED', 'Access denied to simulation');
      }

      await axios.delete(
        `${SIMULATOR_SERVICE_URL}/api/simulate/results/${simulationId}`,
        { timeout: 30000 }
      );

      res.json({
        success: true,
        message: `Simulation ${simulationId} deleted successfully`,
        deletedAt: new Date().toISOString()
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Failed to delete simulation';
        throw new ApiError(status, 'SIMULATION_DELETE_ERROR', message);
      }
      
      throw new ApiError(500, 'SIMULATION_PROXY_ERROR', `Failed to delete simulation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

export { router as simulateRoutes };