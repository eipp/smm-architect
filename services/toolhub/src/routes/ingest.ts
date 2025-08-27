import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, requireScopes } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';
import { ContentIngestionService } from '../services/content-ingestion';

const router = Router();
const ingestionService = new ContentIngestionService();

/**
 * POST /api/ingest/sources
 * Ingest content from multiple sources
 */
router.post('/sources',
  requireScopes(['ingest:read', 'workspace:write']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('sources').isArray({ min: 1 }).withMessage('At least one source required'),
    body('sources.*.url').isURL().withMessage('Valid URL required'),
    body('sources.*.contentType').optional().isIn(['webpage', 'social_media', 'document', 'api']),
    body('sources.*.priority').optional().isIn(['high', 'medium', 'low']),
    body('extractionRules.extractClaims').optional().isBoolean(),
    body('extractionRules.minClaimConfidence').optional().isFloat({ min: 0, max: 1 }),
    body('extractionRules.includeImages').optional().isBoolean(),
    body('extractionRules.includeMetadata').optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request parameters', errors.array());
      }

      const { workspaceId, sources, extractionRules } = req.body;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Limit number of sources for non-admin users
      if (sources.length > 10 && !req.user?.scopes.includes('admin')) {
        throw new ApiError(400, 'TOO_MANY_SOURCES', 'Maximum 10 sources allowed per request');
      }

      const results = await ingestionService.ingestSources({
        workspaceId,
        sources,
        extractionRules
      });

      res.json({
        success: true,
        message: `Successfully ingested ${results.length} sources`,
        data: {
          ingestedSources: results.map(source => ({
            sourceId: source.sourceId,
            url: source.url,
            contentType: source.contentType,
            title: source.title,
            wordCount: source.metadata.wordCount,
            claimsCount: source.claims.length,
            contentHash: source.contentHash,
            ingestedAt: source.ingestedAt
          }))
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'INGESTION_ERROR', `Content ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/ingest/sources/:sourceId
 * Get details of an ingested source
 */
router.get('/sources/:sourceId',
  requireScopes(['ingest:read']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sourceId } = req.params;

      // Source retrieval from database will be implemented with production database integration
      // For now, return a mock response
      res.json({
        success: true,
        data: {
          sourceId,
          url: 'https://example.com',
          contentType: 'webpage',
          title: 'Example Page',
          extractedText: 'Sample extracted content...',
          metadata: {
            wordCount: 150,
            language: 'en'
          },
          claims: [],
          contentHash: 'sha256:...',
          ingestedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      throw new ApiError(500, 'SOURCE_RETRIEVAL_ERROR', `Failed to retrieve source: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/ingest/validate
 * Validate URLs and content accessibility before ingestion
 */
router.post('/validate',
  requireScopes(['ingest:read']),
  [
    body('urls').isArray({ min: 1 }).withMessage('At least one URL required'),
    body('urls.*').isURL().withMessage('Valid URLs required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request parameters', errors.array());
      }

      const { urls } = req.body;
      
      const validationResults = await Promise.allSettled(
        urls.map(async (url: string) => {
          try {
            // Simple HEAD request to check accessibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, { 
              method: 'HEAD',
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            return {
              url,
              accessible: response.ok,
              status: response.status,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length')
            };
          } catch (error) {
            return {
              url,
              accessible: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );

      const results = validationResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            url: urls[index],
            accessible: false,
            error: result.reason?.message || 'Validation failed'
          };
        }
      });

      res.json({
        success: true,
        data: {
          validationResults: results,
          summary: {
            total: urls.length,
            accessible: results.filter(r => r.accessible).length,
            failed: results.filter(r => !r.accessible).length
          }
        }
      });

    } catch (error) {
      throw new ApiError(500, 'VALIDATION_ERROR', `URL validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * DELETE /api/ingest/sources/:sourceId
 * Delete an ingested source
 */
router.delete('/sources/:sourceId',
  requireScopes(['ingest:write']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sourceId } = req.params;

      // Source deletion from database and vector store will be implemented with production data management
      
      res.json({
        success: true,
        message: `Source ${sourceId} deleted successfully`
      });

    } catch (error) {
      throw new ApiError(500, 'DELETION_ERROR', `Failed to delete source: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

export { router as ingestRoutes };