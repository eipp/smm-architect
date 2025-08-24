import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import axios from 'axios';
import { AuthenticatedRequest, requireScopes } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';

const router = Router();
const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:8083';

/**
 * POST /api/render/template
 * Render content using templates and brand data
 */
router.post('/template',
  requireScopes(['render:execute']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('templateId').isString().isLength({ min: 1 }).withMessage('Template ID required'),
    body('templateData').isObject().withMessage('Template data object required'),
    body('renderOptions.format').optional().isIn(['png', 'jpg', 'svg', 'pdf', 'html']).withMessage('Invalid format'),
    body('renderOptions.width').optional().isInt({ min: 100, max: 4000 }).withMessage('Width must be 100-4000px'),
    body('renderOptions.height').optional().isInt({ min: 100, max: 4000 }).withMessage('Height must be 100-4000px'),
    body('renderOptions.quality').optional().isFloat({ min: 0.1, max: 1.0 }).withMessage('Quality must be 0.1-1.0'),
    body('assetPreferences.brandColors').optional().isArray(),
    body('assetPreferences.fonts').optional().isArray(),
    body('assetPreferences.logoVariant').optional().isString()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid render parameters', errors.array());
      }

      const { workspaceId, templateId, templateData, renderOptions, assetPreferences } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Default render options
      const options = {
        format: 'png',
        width: 1200,
        height: 630,
        quality: 0.9,
        ...renderOptions
      };

      const renderRequest = {
        workspaceId,
        templateId,
        templateData,
        renderOptions: options,
        assetPreferences: assetPreferences || {},
        requestMetadata: {
          requestedBy: req.user?.userId,
          requestedAt: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          clientIp: req.ip
        }
      };

      const startTime = Date.now();
      const response = await axios.post(
        `${RENDER_SERVICE_URL}/api/render/template`,
        renderRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': req.get('X-Request-ID') || `render-${Date.now()}`
          },
          timeout: 120000, // 2 minutes timeout for rendering
          responseType: options.format === 'html' ? 'json' : 'stream'
        }
      );

      const duration = Date.now() - startTime;

      if (options.format === 'html') {
        // Return HTML as JSON response
        res.json({
          success: true,
          data: {
            html: response.data.html,
            assets: response.data.assets || [],
            renderTime: duration,
            renderedAt: new Date().toISOString()
          }
        });
      } else {
        // Stream binary content
        res.set({
          'Content-Type': `image/${options.format}`,
          'Content-Disposition': `inline; filename="render-${Date.now()}.${options.format}"`,
          'X-Render-Time': duration.toString(),
          'X-Rendered-At': new Date().toISOString()
        });
        
        response.data.pipe(res);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Render service error';
        throw new ApiError(status, 'RENDER_SERVICE_ERROR', message, {
          serviceUrl: RENDER_SERVICE_URL,
          templateId: req.body.templateId
        });
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'RENDER_PROXY_ERROR', `Render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/render/templates
 * Get available templates for a workspace
 */
router.get('/templates',
  requireScopes(['render:read']),
  [
    query('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    query('category').optional().isString(),
    query('platform').optional().isIn(['linkedin', 'x', 'instagram', 'facebook', 'youtube', 'tiktok'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid query parameters', errors.array());
      }

      const { workspaceId, category, platform } = req.query;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const response = await axios.get(
        `${RENDER_SERVICE_URL}/api/render/templates`,
        {
          params: { workspaceId, category, platform },
          timeout: 30000
        }
      );

      res.json({
        success: true,
        data: {
          templates: response.data.templates || [],
          categories: response.data.categories || [],
          platforms: response.data.platforms || [],
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Failed to retrieve templates';
        throw new ApiError(status, 'TEMPLATE_RETRIEVAL_ERROR', message);
      }
      
      throw new ApiError(500, 'RENDER_PROXY_ERROR', `Failed to get templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/render/preview
 * Generate a preview of content without full rendering
 */
router.post('/preview',
  requireScopes(['render:read']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('templateId').isString().isLength({ min: 1 }).withMessage('Template ID required'),
    body('templateData').isObject().withMessage('Template data object required'),
    body('previewOptions.thumbnailSize').optional().isIn(['small', 'medium', 'large']),
    body('previewOptions.includeAssets').optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid preview parameters', errors.array());
      }

      const { workspaceId, templateId, templateData, previewOptions } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const previewRequest = {
        workspaceId,
        templateId,
        templateData,
        previewOptions: {
          thumbnailSize: 'medium',
          includeAssets: false,
          ...previewOptions
        }
      };

      const response = await axios.post(
        `${RENDER_SERVICE_URL}/api/render/preview`,
        previewRequest,
        {
          timeout: 60000
        }
      );

      res.json({
        success: true,
        data: {
          previewUrl: response.data.previewUrl,
          thumbnailUrl: response.data.thumbnailUrl,
          assets: response.data.assets || [],
          dimensions: response.data.dimensions,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Preview generation failed';
        throw new ApiError(status, 'PREVIEW_ERROR', message);
      }
      
      throw new ApiError(500, 'RENDER_PROXY_ERROR', `Preview failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/render/assets/:workspaceId
 * Get available brand assets for rendering
 */
router.get('/assets/:workspaceId',
  requireScopes(['render:read']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { type, category } = req.query;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const response = await axios.get(
        `${RENDER_SERVICE_URL}/api/render/assets/${workspaceId}`,
        {
          params: { type, category },
          timeout: 30000
        }
      );

      res.json({
        success: true,
        data: {
          workspaceId,
          assets: response.data.assets || [],
          categories: response.data.categories || [],
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Failed to retrieve assets';
        throw new ApiError(status, 'ASSET_RETRIEVAL_ERROR', message);
      }
      
      throw new ApiError(500, 'RENDER_PROXY_ERROR', `Failed to get assets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/render/batch
 * Render multiple templates in batch
 */
router.post('/batch',
  requireScopes(['render:execute']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('renderJobs').isArray({ min: 1, max: 10 }).withMessage('1-10 render jobs required'),
    body('renderJobs.*.templateId').isString().withMessage('Template ID required for each job'),
    body('renderJobs.*.templateData').isObject().withMessage('Template data required for each job'),
    body('batchOptions.format').optional().isIn(['png', 'jpg', 'svg', 'pdf']),
    body('batchOptions.parallel').optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid batch render parameters', errors.array());
      }

      const { workspaceId, renderJobs, batchOptions } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const batchRequest = {
        workspaceId,
        renderJobs,
        batchOptions: {
          format: 'png',
          parallel: true,
          ...batchOptions
        },
        requestMetadata: {
          requestedBy: req.user?.userId,
          requestedAt: new Date().toISOString()
        }
      };

      const response = await axios.post(
        `${RENDER_SERVICE_URL}/api/render/batch`,
        batchRequest,
        {
          timeout: 300000 // 5 minutes for batch processing
        }
      );

      res.json({
        success: true,
        data: {
          batchId: response.data.batchId,
          results: response.data.results || [],
          summary: response.data.summary || {},
          completedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Batch render failed';
        throw new ApiError(status, 'BATCH_RENDER_ERROR', message);
      }
      
      throw new ApiError(500, 'RENDER_PROXY_ERROR', `Batch render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

export { router as renderRoutes };