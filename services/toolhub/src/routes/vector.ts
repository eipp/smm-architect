import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { AuthenticatedRequest, requireScopes } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';
import { VectorService } from '../services/vector-service';

const router = Router();
const vectorService = new VectorService();

/**
 * POST /api/vector/upsert
 * Add or update vectors in the vector database
 */
router.post('/upsert',
  requireScopes(['vector:write']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('documents').isArray({ min: 1 }).withMessage('At least one document required'),
    body('documents.*.content').isString().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
    body('documents.*.metadata').isObject().withMessage('Metadata object required'),
    body('documents.*.sourceId').optional().isString()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request parameters', errors.array());
      }

      const { workspaceId, documents } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Limit batch size for non-admin users
      if (documents.length > 50 && !req.user?.scopes.includes('admin')) {
        throw new ApiError(400, 'BATCH_TOO_LARGE', 'Maximum 50 documents allowed per batch');
      }

      const vectorDocuments = await vectorService.processContentBatch(workspaceId, documents);

      res.json({
        success: true,
        message: `Successfully processed ${vectorDocuments.length} documents`,
        data: {
          processedCount: vectorDocuments.length,
          vectorIds: vectorDocuments.map(doc => doc.id),
          skippedCount: documents.length - vectorDocuments.length
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'VECTOR_UPSERT_ERROR', `Vector upsert failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/vector/search
 * Search for similar content using semantic search
 */
router.post('/search',
  requireScopes(['vector:read']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('query').isString().isLength({ min: 3 }).withMessage('Query must be at least 3 characters'),
    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    body('threshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Threshold must be between 0 and 1'),
    body('filters.contentType').optional().isArray(),
    body('filters.sourceUrl').optional().isURL(),
    body('filters.tags').optional().isArray(),
    body('filters.dateRange.start').optional().isISO8601(),
    body('filters.dateRange.end').optional().isISO8601()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request parameters', errors.array());
      }

      const { workspaceId, query, limit, threshold, filters } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const searchResults = await vectorService.searchSimilar({
        workspaceId,
        query,
        limit: limit || 10,
        threshold: threshold || 0.7,
        filters
      });

      res.json({
        success: true,
        data: {
          query,
          results: searchResults,
          resultCount: searchResults.length,
          threshold: threshold || 0.7
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'VECTOR_SEARCH_ERROR', `Vector search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/vector/stats/:workspaceId
 * Get vector database statistics for a workspace
 */
router.get('/stats/:workspaceId',
  requireScopes(['vector:read']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      
      if (!workspaceId) {
        throw new ApiError(400, 'WORKSPACE_ID_REQUIRED', 'Workspace ID is required');
      }

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const stats = await vectorService.getWorkspaceStats(workspaceId);

      res.json({
        success: true,
        data: {
          workspaceId,
          ...stats
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'VECTOR_STATS_ERROR', `Failed to get vector stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * DELETE /api/vector/documents
 * Delete vectors by IDs
 */
router.delete('/documents',
  requireScopes(['vector:write']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('vectorIds').isArray({ min: 1 }).withMessage('At least one vector ID required'),
    body('vectorIds.*').isString().withMessage('Valid vector IDs required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request parameters', errors.array());
      }

      const { workspaceId, vectorIds } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      await vectorService.deleteVectors(vectorIds);

      res.json({
        success: true,
        message: `Successfully deleted ${vectorIds.length} vectors`,
        data: {
          deletedCount: vectorIds.length,
          vectorIds
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'VECTOR_DELETE_ERROR', `Vector deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/vector/embeddings
 * Generate embeddings for text without storing them
 */
router.post('/embeddings',
  requireScopes(['vector:read']),
  [
    body('texts').isArray({ min: 1, max: 20 }).withMessage('1-20 texts required'),
    body('texts.*').isString().isLength({ min: 1 }).withMessage('Valid text required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request parameters', errors.array());
      }

      const { texts } = req.body;

      const embeddings = await Promise.all(
        texts.map(async (text: string) => {
          const embedding = await vectorService.generateEmbedding(text);
          return {
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            embedding,
            dimensions: embedding.length
          };
        })
      );

      res.json({
        success: true,
        data: {
          embeddings,
          count: embeddings.length
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'EMBEDDING_ERROR', `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/vector/search/suggestions
 * Get search query suggestions based on workspace content
 */
router.get('/search/suggestions',
  requireScopes(['vector:read']),
  [
    query('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    query('query').optional().isString().isLength({ min: 2, max: 50 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request parameters', errors.array());
      }

      const { workspaceId, query } = req.query;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Generate suggestions based on common search patterns
      const suggestions = [
        'brand positioning',
        'competitor analysis',
        'target audience insights',
        'content strategy',
        'social media trends',
        'marketing campaigns',
        'brand voice and tone',
        'customer testimonials'
      ];

      // Filter suggestions based on query if provided
      const filteredSuggestions = query 
        ? suggestions.filter(s => s.toLowerCase().includes((query as string).toLowerCase()))
        : suggestions;

      res.json({
        success: true,
        data: {
          query: query || '',
          suggestions: filteredSuggestions.slice(0, 8)
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'SUGGESTIONS_ERROR', `Failed to get suggestions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

export { router as vectorRoutes };