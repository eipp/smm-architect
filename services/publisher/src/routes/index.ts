import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AuthenticatedRequest, requireScopes } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';
import { PublisherService } from '../services/PublisherService';
import { MediaUploadService } from '../services/MediaUploadService';

const router = Router();
const publisherService = new PublisherService();
const mediaUploadService = new MediaUploadService();

/**
 * POST /api/publish/immediate
 * Publish content immediately to specified platforms
 */
router.post('/immediate',
  requireScopes(['publish:immediate']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('platforms').isArray({ min: 1 }).withMessage('At least one platform required'),
    body('platforms.*').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Invalid platform'),
    body('content.text').optional().isString().isLength({ max: 3000 }).withMessage('Text too long'),
    body('content.mediaUrls').optional().isArray().withMessage('Media URLs must be an array'),
    body('content.articleUrl').optional().isURL().withMessage('Invalid article URL'),
    body('content.tags').optional().isArray().withMessage('Tags must be an array'),
    body('content.mentions').optional().isArray().withMessage('Mentions must be an array'),
    body('options.visibility').optional().isIn(['public', 'private', 'connections', 'company']).withMessage('Invalid visibility'),
    body('options.enableComments').optional().isBoolean().withMessage('Enable comments must be boolean'),
    body('options.enableSharing').optional().isBoolean().withMessage('Enable sharing must be boolean'),
    body('options.crossPost').optional().isBoolean().withMessage('Cross post must be boolean')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid publish request', errors.array());
      }

      const publishRequest = req.body;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== publishRequest.workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const result = await publisherService.publishImmediate(publishRequest);

      res.json({
        success: true,
        data: result,
        message: 'Content queued for immediate publishing'
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'PUBLISH_ERROR', `Failed to publish content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/publish/schedule
 * Schedule content for future publishing
 */
router.post('/schedule',
  requireScopes(['publish:schedule']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('platforms').isArray({ min: 1 }).withMessage('At least one platform required'),
    body('platforms.*').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Invalid platform'),
    body('content.text').optional().isString().isLength({ max: 3000 }).withMessage('Text too long'),
    body('scheduling.publishAt').isISO8601().withMessage('Valid publish date required'),
    body('scheduling.timezone').optional().isString().withMessage('Invalid timezone'),
    body('scheduling.recurring.frequency').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid frequency'),
    body('scheduling.recurring.interval').optional().isInt({ min: 1 }).withMessage('Invalid interval'),
    body('scheduling.recurring.endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid schedule request', errors.array());
      }

      const scheduleRequest = req.body;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== scheduleRequest.workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Convert publishAt to Date object
      scheduleRequest.scheduling.publishAt = new Date(scheduleRequest.scheduling.publishAt);
      if (scheduleRequest.scheduling.recurring?.endDate) {
        scheduleRequest.scheduling.recurring.endDate = new Date(scheduleRequest.scheduling.recurring.endDate);
      }

      const result = await publisherService.schedulePublish(scheduleRequest);

      res.json({
        success: true,
        data: result,
        message: 'Content scheduled for publishing'
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'SCHEDULE_ERROR', `Failed to schedule content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/publish/bulk
 * Bulk publish multiple posts with coordination
 */
router.post('/bulk',
  requireScopes(['publish:bulk']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('posts').isArray({ min: 1, max: 50 }).withMessage('1-50 posts required'),
    body('batchOptions.delayBetweenPosts').optional().isInt({ min: 1000 }).withMessage('Delay must be at least 1000ms'),
    body('batchOptions.stopOnError').optional().isBoolean().withMessage('Stop on error must be boolean'),
    body('batchOptions.maxConcurrency').optional().isInt({ min: 1, max: 10 }).withMessage('Max concurrency 1-10')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid bulk publish request', errors.array());
      }

      const bulkRequest = req.body;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== bulkRequest.workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const results = await publisherService.bulkPublish(bulkRequest);

      res.json({
        success: true,
        data: {
          batchId: `batch-${Date.now()}`,
          totalPosts: bulkRequest.posts.length,
          queuedPosts: results.length,
          results
        },
        message: `Bulk publish initiated for ${results.length} posts`
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'BULK_PUBLISH_ERROR', `Failed to bulk publish: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/publish/status/:publishId
 * Get publishing status and results
 */
router.get('/status/:publishId',
  requireScopes(['publish:read']),
  [
    param('publishId').isUUID().withMessage('Valid publish ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid status request', errors.array());
      }

      const { publishId } = req.params;
      
      // This would query the actual status from database/queue
      // For now, return mock status
      const status = {
        id: publishId,
        status: 'completed',
        platforms: [
          {
            platform: 'linkedin',
            postId: 'li-123456',
            url: 'https://linkedin.com/posts/example',
            status: 'success',
            engagement: { likes: 45, comments: 8, shares: 12 }
          },
          {
            platform: 'twitter',
            postId: 'tw-789012',
            url: 'https://twitter.com/user/status/789012',
            status: 'success',
            engagement: { likes: 67, comments: 15, shares: 23 }
          }
        ],
        createdAt: new Date(Date.now() - 60000),
        publishedAt: new Date(Date.now() - 30000)
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'STATUS_ERROR', `Failed to get status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/publish/optimization/:platform
 * Get content optimization recommendations for a platform
 */
router.get('/optimization/:platform',
  requireScopes(['publish:read']),
  [
    param('platform').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Invalid platform'),
    query('workspaceId').isUUID().withMessage('Valid workspace ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid optimization request', errors.array());
      }

      const { platform } = req.params;
      const { workspaceId } = req.query;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const optimization = await publisherService.getContentOptimization(platform, workspaceId as string);

      res.json({
        success: true,
        data: optimization
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'OPTIMIZATION_ERROR', `Failed to get optimization: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/publish/analytics/:postId
 * Get cross-platform analytics for a published post
 */
router.get('/analytics/:postId',
  requireScopes(['publish:read']),
  [
    param('postId').isUUID().withMessage('Valid post ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid analytics request', errors.array());
      }

      const { postId } = req.params;
      
      const analytics = await publisherService.getCrossPlatformAnalytics(postId);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'ANALYTICS_ERROR', `Failed to get analytics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/publish/scheduled
 * Get scheduled posts for a workspace
 */
router.get('/scheduled',
  requireScopes(['publish:read']),
  [
    query('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
    query('platform').optional().isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Invalid platform'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Invalid offset')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid scheduled posts request', errors.array());
      }

      const { workspaceId, status, platform, limit = 20, offset = 0 } = req.query;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // This would query the database for scheduled posts
      // For now, return mock data
      const scheduledPosts = [
        {
          id: 'sched-1',
          workspaceId,
          content: {
            text: 'Scheduled post example',
            tags: ['#example', '#scheduled']
          },
          platforms: ['linkedin', 'twitter'],
          scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
          status: 'pending',
          createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
          createdBy: 'user-123'
        }
      ];

      res.json({
        success: true,
        data: {
          posts: scheduledPosts,
          pagination: {
            total: scheduledPosts.length,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: false
          }
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'SCHEDULED_POSTS_ERROR', `Failed to get scheduled posts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * DELETE /api/publish/scheduled/:postId
 * Cancel a scheduled post
 */
router.delete('/scheduled/:postId',
  requireScopes(['publish:write']),
  [
    param('postId').isUUID().withMessage('Valid post ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid cancel request', errors.array());
      }

      const { postId } = req.params;
      
      // This would cancel the scheduled post in the database and queue
      // For now, return success
      
      res.json({
        success: true,
        message: `Scheduled post ${postId} cancelled successfully`,
        cancelledAt: new Date().toISOString()
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'CANCEL_ERROR', `Failed to cancel scheduled post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/publish/media/upload
 * Upload media files for publishing
 */
router.post('/media/upload',
  requireScopes(['publish:media']),
  mediaUploadService.uploadMiddleware,
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid upload request', errors.array());
      }

      const { workspaceId, description } = req.body;
      const files = req.files as Express.Multer.File[];
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      if (!files || files.length === 0) {
        throw new ApiError(400, 'NO_FILES', 'No files provided for upload');
      }

      const uploadResults = await mediaUploadService.uploadFiles(files, {
        workspaceId,
        uploadedBy: req.user?.userId || 'unknown',
        description
      });

      res.json({
        success: true,
        data: {
          uploads: uploadResults,
          totalFiles: files.length,
          uploadedAt: new Date().toISOString()
        },
        message: `Successfully uploaded ${uploadResults.length} files`
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'UPLOAD_ERROR', `Failed to upload media: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/publish/media/:workspaceId
 * Get uploaded media files for a workspace
 */
router.get('/media/:workspaceId',
  requireScopes(['publish:read']),
  [
    param('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    query('type').optional().isIn(['image', 'video', 'document']).withMessage('Invalid media type'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Invalid offset')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid media request', errors.array());
      }

      const { workspaceId } = req.params;
      const { type, limit = 20, offset = 0 } = req.query;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const mediaFiles = await mediaUploadService.getWorkspaceMedia(workspaceId, {
        type: type as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: {
          media: mediaFiles.files,
          pagination: {
            total: mediaFiles.total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: mediaFiles.hasMore
          }
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'MEDIA_ERROR', `Failed to get media files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

export { router as publisherRoutes };