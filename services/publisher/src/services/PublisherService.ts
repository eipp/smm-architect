import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull';
import axios from 'axios';
import { Pool } from 'pg';
import { 
  PublishRequest, 
  PublishResult,
  PlatformResult,
  ScheduledPost,
  PublishJob,
  Platform,
  OAuthConnection,
  MediaUpload,
  BulkPublishRequest,
  CrossPlatformAnalytics,
  ContentOptimization
} from '../types';

export class PublisherService {
  private publishQueue: Queue.Queue;
  private platforms: Map<string, Platform> = new Map();
  private db: Pool;

  constructor() {
    // Initialize database connection
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize Bull queue for job processing
    this.publishQueue = new Queue('publish queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.initializePlatforms();
    this.setupQueueProcessors();
  }

  private initializePlatforms() {
    const platformConfigs: Platform[] = [
      {
        id: 'linkedin',
        name: 'LinkedIn',
        enabled: true,
        apiEndpoint: 'https://api.linkedin.com/v2',
        rateLimit: { requests: 100, window: 24 * 60 * 60 * 1000 }, // 100 per day
        mediaSupport: {
          images: true,
          videos: true,
          documents: true,
          maxFileSize: 100 * 1024 * 1024, // 100MB
          supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'pdf'],
        },
        features: {
          scheduling: true,
          threads: false,
          polls: false,
          stories: false,
          liveStreaming: false,
        },
      },
      {
        id: 'twitter',
        name: 'Twitter/X',
        enabled: true,
        apiEndpoint: 'https://api.twitter.com/2',
        rateLimit: { requests: 300, window: 15 * 60 * 1000 }, // 300 per 15 minutes
        mediaSupport: {
          images: true,
          videos: true,
          documents: false,
          maxFileSize: 512 * 1024 * 1024, // 512MB for videos
          supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
        },
        features: {
          scheduling: true,
          threads: true,
          polls: true,
          stories: false,
          liveStreaming: true,
        },
      },
      {
        id: 'facebook',
        name: 'Facebook',
        enabled: true,
        apiEndpoint: 'https://graph.facebook.com/v18.0',
        rateLimit: { requests: 200, window: 60 * 60 * 1000 }, // 200 per hour
        mediaSupport: {
          images: true,
          videos: true,
          documents: false,
          maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
          supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
        },
        features: {
          scheduling: true,
          threads: false,
          polls: true,
          stories: true,
          liveStreaming: true,
        },
      },
      {
        id: 'instagram',
        name: 'Instagram',
        enabled: true,
        apiEndpoint: 'https://graph.facebook.com/v18.0',
        rateLimit: { requests: 200, window: 60 * 60 * 1000 }, // 200 per hour
        mediaSupport: {
          images: true,
          videos: true,
          documents: false,
          maxFileSize: 1 * 1024 * 1024 * 1024, // 1GB
          supportedFormats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
        },
        features: {
          scheduling: true,
          threads: false,
          polls: false,
          stories: true,
          liveStreaming: true,
        },
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        enabled: true,
        apiEndpoint: 'https://open-api.tiktok.com',
        rateLimit: { requests: 100, window: 24 * 60 * 60 * 1000 }, // 100 per day
        mediaSupport: {
          images: false,
          videos: true,
          documents: false,
          maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
          supportedFormats: ['mp4', 'mov', 'avi'],
        },
        features: {
          scheduling: true,
          threads: false,
          polls: false,
          stories: false,
          liveStreaming: true,
        },
      },
    ];

    platformConfigs.forEach(platform => {
      this.platforms.set(platform.id, platform);
    });
  }

  private setupQueueProcessors() {
    this.publishQueue.process('immediate', 5, this.processImmediatePublish.bind(this));
    this.publishQueue.process('scheduled', 3, this.processScheduledPublish.bind(this));
    this.publishQueue.process('recurring', 2, this.processRecurringPublish.bind(this));
  }

  /**
   * Publish content immediately to specified platforms
   */
  async publishImmediate(request: PublishRequest): Promise<PublishResult> {
    const publishId = uuidv4();
    
    // Validate request
    await this.validatePublishRequest(request);
    
    // Create job for immediate processing
    const job = await this.publishQueue.add('immediate', {
      id: publishId,
      type: 'immediate',
      data: request,
      priority: 1,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    } as PublishJob);

    // Return initial result - actual publishing happens asynchronously
    return {
      id: publishId,
      workspaceId: request.workspaceId,
      status: 'scheduled',
      platforms: request.platforms.map(platform => ({
        platform,
        status: 'pending',
      })),
      createdAt: new Date(),
      scheduledAt: new Date(),
    };
  }

  /**
   * Schedule content for future publishing
   */
  async schedulePublish(request: PublishRequest): Promise<PublishResult> {
    const publishId = uuidv4();
    const publishAt = request.scheduling.publishAt || new Date();
    
    // Validate request
    await this.validatePublishRequest(request);
    
    // Calculate delay
    const delay = publishAt.getTime() - Date.now();
    
    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Create scheduled job
    const job = await this.publishQueue.add('scheduled', {
      id: publishId,
      type: 'scheduled',
      data: request,
      priority: 2,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    } as PublishJob, {
      delay,
    });

    // Store scheduled post in database
    await this.storeScheduledPost({
      id: publishId,
      workspaceId: request.workspaceId,
      content: request.content,
      platforms: request.platforms,
      scheduledAt: publishAt,
      timezone: request.scheduling.timezone || 'UTC',
      status: 'pending',
      recurring: request.scheduling.recurring,
      createdAt: new Date(),
      createdBy: 'system', // This should come from authenticated user
      attempts: 0,
    });

    return {
      id: publishId,
      workspaceId: request.workspaceId,
      status: 'scheduled',
      platforms: request.platforms.map(platform => ({
        platform,
        status: 'pending',
      })),
      createdAt: new Date(),
      scheduledAt: publishAt,
    };
  }

  /**
   * Bulk publish multiple posts with coordination
   */
  async bulkPublish(request: BulkPublishRequest): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    const { delayBetweenPosts = 5000, stopOnError = false, maxConcurrency = 3 } = request.batchOptions;
    
    // Process posts in batches
    const batches = this.chunkArray(request.posts, maxConcurrency);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (post, index) => {
        // Add delay between posts
        if (index > 0) {
          await this.delay(delayBetweenPosts);
        }
        
        try {
          const publishRequest: PublishRequest = {
            ...post,
            workspaceId: request.workspaceId,
          };
          
          return await this.publishImmediate(publishRequest);
        } catch (error) {
          if (stopOnError) {
            throw error;
          }
          console.error('Batch publish error:', error);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
      
      // Stop processing if there was an error and stopOnError is true
      if (stopOnError && batchResults.some(r => r.status === 'rejected')) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get the status of a published job
   */
  async getPublishStatus(jobId: string): Promise<{
    jobId: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'not_found';
    progress?: number;
    platforms?: string[];
    results?: any[];
    error?: string;
    completedAt?: string;
  }> {
    try {
      const job = await this.publishQueue.getJob(jobId);
      
      if (!job) {
        return {
          jobId,
          status: 'not_found',
          error: 'Job not found',
        };
      }

      let status: 'waiting' | 'active' | 'completed' | 'failed' | 'not_found' = 'waiting';
      
      if (job.finishedOn) {
        status = job.returnvalue ? 'completed' : 'failed';
      } else if (job.processedOn) {
        status = 'active';
      }

      const result: any = {
        jobId,
        status,
        progress: job.progress || 0,
        platforms: job.data.platforms,
      };

      if (status === 'completed' && job.returnvalue) {
        result.results = job.returnvalue.results;
        result.completedAt = new Date(job.finishedOn!).toISOString();
      } else if (status === 'failed' && job.failedReason) {
        result.error = job.failedReason;
      }

      return result;
    } catch (error) {
      console.error('Failed to get publish status:', error);
      return {
        jobId,
        status: 'not_found',
        error: 'Failed to retrieve job status',
      };
    }
  }

  /**
   * Get optimization recommendations for content
   */
  async getContentOptimization(platform: string, workspaceId?: string): Promise<ContentOptimization> {
    // This would typically analyze historical performance data
    // For now, return platform-specific recommendations
    
    const platformConfig = this.platforms.get(platform);
    if (!platformConfig) {
      throw new Error(`Platform ${platform} not supported`);
    }

    const baseRecommendations = {
      linkedin: {
        optimalTiming: { dayOfWeek: 2, hour: 9, confidence: 0.85 }, // Tuesday 9 AM
        hashtagSuggestions: ['#leadership', '#business', '#innovation', '#professional'],
        contentLength: { min: 150, max: 1300, optimal: 400 },
        mediaRecommendations: { type: 'image' as const, aspectRatio: '16:9' },
      },
      twitter: {
        optimalTiming: { dayOfWeek: 3, hour: 15, confidence: 0.78 }, // Wednesday 3 PM
        hashtagSuggestions: ['#trending', '#tech', '#news', '#social'],
        contentLength: { min: 50, max: 280, optimal: 120 },
        mediaRecommendations: { type: 'image' as const, aspectRatio: '16:9' },
      },
      facebook: {
        optimalTiming: { dayOfWeek: 4, hour: 13, confidence: 0.72 }, // Thursday 1 PM
        hashtagSuggestions: ['#community', '#family', '#lifestyle', '#local'],
        contentLength: { min: 100, max: 2000, optimal: 300 },
        mediaRecommendations: { type: 'video' as const, duration: 60 },
      },
      instagram: {
        optimalTiming: { dayOfWeek: 5, hour: 17, confidence: 0.82 }, // Friday 5 PM
        hashtagSuggestions: ['#instagram', '#photo', '#lifestyle', '#art'],
        contentLength: { min: 50, max: 2200, optimal: 150 },
        mediaRecommendations: { type: 'image' as const, aspectRatio: '1:1' },
      },
      tiktok: {
        optimalTiming: { dayOfWeek: 6, hour: 19, confidence: 0.88 }, // Saturday 7 PM
        hashtagSuggestions: ['#fyp', '#viral', '#trending', '#entertainment'],
        contentLength: { min: 20, max: 150, optimal: 50 },
        mediaRecommendations: { type: 'video' as const, aspectRatio: '9:16', duration: 30 },
      },
    };

    const recommendations = baseRecommendations[platform as keyof typeof baseRecommendations];
    if (!recommendations) {
      throw new Error(`No optimization data available for ${platform}`);
    }

    return {
      platform,
      recommendations,
    };
  }

  /**
   * Get cross-platform analytics for a published post
   */
  async getCrossPlatformAnalytics(postId: string): Promise<CrossPlatformAnalytics> {
    // This would typically query actual analytics from each platform
    // For now, return mock data
    
    const mockAnalytics: CrossPlatformAnalytics = {
      postId,
      platforms: [
        {
          platform: 'linkedin',
          url: 'https://linkedin.com/posts/example',
          engagement: { likes: 45, comments: 8, shares: 12, views: 1200, clickThroughs: 35 },
          performance: { reach: 1800, impressions: 2500, engagementRate: 3.6 },
        },
        {
          platform: 'twitter',
          url: 'https://twitter.com/user/status/123',
          engagement: { likes: 67, comments: 15, shares: 23, views: 3200, clickThroughs: 28 },
          performance: { reach: 4500, impressions: 8900, engagementRate: 2.9 },
        },
      ],
      totalEngagement: 170,
      bestPerformingPlatform: 'twitter',
      insights: {
        audienceOverlap: 0.15,
        crossPlatformSynergy: 0.78,
        recommendedStrategy: 'Focus on visual content for Instagram, professional insights for LinkedIn',
      },
    };

    return mockAnalytics;
  }

  /**
   * Process immediate publish job
   */
  private async processImmediatePublish(job: Queue.Job<PublishJob>): Promise<void> {
    const { id, data } = job.data;
    
    try {
      console.log(`Processing immediate publish job ${id}`);
      
      // Get OAuth connections for each platform
      const connections = await this.getOAuthConnections(data.workspaceId, data.platforms);
      
      // Publish to each platform
      const publishPromises = data.platforms.map(async (platform) => {
        const connection = connections.find(c => c.platform === platform);
        if (!connection) {
          throw new Error(`No OAuth connection found for platform ${platform}`);
        }
        
        return await this.publishToPlatform(platform, connection, data);
      });
      
      const results = await Promise.allSettled(publishPromises);
      
      // Update job status based on results
      const hasFailures = results.some(r => r.status === 'rejected');
      if (hasFailures) {
        console.error(`Some platforms failed for job ${id}`);
        // Don't throw error here - partial success is acceptable
      }
      
      console.log(`Completed immediate publish job ${id}`);
      
    } catch (error) {
      console.error(`Failed to process immediate publish job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process scheduled publish job
   */
  private async processScheduledPublish(job: Queue.Job<PublishJob>): Promise<void> {
    const { id, data } = job.data;
    
    try {
      console.log(`Processing scheduled publish job ${id}`);
      
      // Update scheduled post status
      await this.updateScheduledPostStatus(id, 'processing');
      
      // Get OAuth connections for each platform
      const connections = await this.getOAuthConnections(data.workspaceId, data.platforms);
      
      // Publish to each platform
      const publishPromises = data.platforms.map(async (platform) => {
        const connection = connections.find(c => c.platform === platform);
        if (!connection) {
          throw new Error(`No OAuth connection found for platform ${platform}`);
        }
        
        return await this.publishToPlatform(platform, connection, data);
      });
      
      const results = await Promise.allSettled(publishPromises);
      
      // Update scheduled post status
      const hasFailures = results.some(r => r.status === 'rejected');
      await this.updateScheduledPostStatus(id, hasFailures ? 'failed' : 'completed');
      
      // Handle recurring posts
      if (data.scheduling.recurring) {
        await this.scheduleNextRecurring(id, data);
      }
      
      console.log(`Completed scheduled publish job ${id}`);
      
    } catch (error) {
      console.error(`Failed to process scheduled publish job ${id}:`, error);
      await this.updateScheduledPostStatus(id, 'failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Process recurring publish job
   */
  private async processRecurringPublish(job: Queue.Job<PublishJob>): Promise<void> {
    // Similar to scheduled publish but with recurring logic
    await this.processScheduledPublish(job);
  }

  /**
   * Publish to a specific platform
   */
  private async publishToPlatform(platform: string, connection: OAuthConnection, data: PublishRequest): Promise<any> {
    const toolhubUrl = process.env.TOOLHUB_URL || 'http://localhost:8080';
    
    try {
      const response = await axios.post(`${toolhubUrl}/api/social/${platform}/post`, {
        text: data.content.text,
        workspaceId: data.workspaceId,
        connectionId: connection.id,
        visibility: data.options.visibility,
        tags: data.content.tags,
        mentions: data.content.mentions,
        articleUrl: data.content.articleUrl,
      });
      
      return response.data;
    } catch (error) {
      console.error(`Failed to publish to ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Validate publish request
   */
  private async validatePublishRequest(request: PublishRequest): Promise<void> {
    if (!request.workspaceId) {
      throw new Error('Workspace ID is required');
    }
    
    if (!request.platforms || request.platforms.length === 0) {
      throw new Error('At least one platform must be specified');
    }
    
    if (!request.content.text && !request.content.mediaUrls?.length && !request.content.articleUrl) {
      throw new Error('Content must include text, media, or article URL');
    }
    
    // Validate platforms are supported
    for (const platform of request.platforms) {
      if (!this.platforms.has(platform)) {
        throw new Error(`Platform ${platform} is not supported`);
      }
    }
    
    // Validate OAuth connections exist
    const connections = await this.getOAuthConnections(request.workspaceId, request.platforms);
    const missingPlatforms = request.platforms.filter(
      platform => !connections.find(c => c.platform === platform && c.status === 'active')
    );
    
    if (missingPlatforms.length > 0) {
      throw new Error(`Missing OAuth connections for platforms: ${missingPlatforms.join(', ')}`);
    }
  }

  /**
   * Get OAuth connections for workspace and platforms
   */
  private async getOAuthConnections(workspaceId: string, platforms: string[]): Promise<OAuthConnection[]> {
    const client = await this.db.connect();
    try {
      await client.query('SET app.current_tenant_id = $1', [workspaceId]);
      const result = await client.query(
        `SELECT connector_id, workspace_id, platform, credentials_ref, account_id, display_name, status, last_connected_at
         FROM connectors
         WHERE workspace_id = $1 AND platform = ANY($2::text[]) AND status = 'connected'`,
        [workspaceId, platforms]
      );
      return result.rows.map(row => ({
        id: row.connector_id,
        workspaceId: row.workspace_id,
        platform: row.platform,
        accessToken: row.credentials_ref,
        scope: [],
        profile: {
          id: row.account_id,
          name: row.display_name,
          username: row.display_name,
        },
        status: 'active' as const,
        connectedAt: row.last_connected_at || new Date(),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Store scheduled post in database
   */
  private async storeScheduledPost(post: ScheduledPost): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('SET app.current_tenant_id = $1', [post.workspaceId]);
      await client.query(
        `INSERT INTO scheduled_posts (
          id, workspace_id, content, platforms, scheduled_at, timezone, status, recurring, created_at, created_by, attempts
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          post.id,
          post.workspaceId,
          JSON.stringify(post.content),
          JSON.stringify(post.platforms),
          post.scheduledAt,
          post.timezone,
          post.status,
          post.recurring ? JSON.stringify(post.recurring) : null,
          post.createdAt,
          post.createdBy,
          post.attempts,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Update scheduled post status
   */
  private async updateScheduledPostStatus(postId: string, status: ScheduledPost['status'], error?: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query(
        `UPDATE scheduled_posts SET status = $2, error = $3, last_attempt = NOW() WHERE id = $1`,
        [postId, status, error || null]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get publishing status and platform engagement
   */
  async getPublishStatus(publishId: string): Promise<PublishResult | null> {
    const client = await this.db.connect();
    try {
      const result = await client.query(
        `SELECT id, workspace_id, status, platforms, created_at, published_at, scheduled_at, error
         FROM publish_results WHERE id = $1`,
        [publishId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const platforms: PlatformResult[] = row.platforms || [];

      for (const platform of platforms) {
        try {
          const response = await axios.get(platform.url as string);
          if (response.data?.engagement) {
            platform.engagement = response.data.engagement;
          }
        } catch {
          // Ignore API errors for individual platforms
        }
      }

      return {
        id: row.id,
        workspaceId: row.workspace_id,
        status: row.status,
        platforms,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        scheduledAt: row.scheduled_at,
        error: row.error || undefined,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get scheduled posts from database
   */
  async getScheduledPosts(
    workspaceId: string,
    filter: { status?: string; limit: number; offset: number }
  ): Promise<{ posts: ScheduledPost[]; total: number; hasMore: boolean }> {
    const client = await this.db.connect();
    try {
      await client.query('SET app.current_tenant_id = $1', [workspaceId]);

      const params: any[] = [workspaceId];
      let where = 'workspace_id = $1';
      if (filter.status) {
        params.push(filter.status);
        where += ` AND status = $${params.length}`;
      }

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;

      const rows = await client.query(
        `SELECT * FROM scheduled_posts WHERE ${where} ORDER BY scheduled_at LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        [...params, filter.limit, filter.offset]
      );

      const count = await client.query(
        `SELECT COUNT(*) FROM scheduled_posts WHERE ${where}`,
        params
      );

      const total = parseInt(count.rows[0].count, 10);
      const posts: ScheduledPost[] = rows.rows.map(r => ({
        id: r.id,
        workspaceId: r.workspace_id,
        content: r.content,
        platforms: r.platforms,
        scheduledAt: r.scheduled_at,
        timezone: r.timezone,
        status: r.status,
        recurring: r.recurring || undefined,
        createdAt: r.created_at,
        createdBy: r.created_by,
        attempts: r.attempts,
        lastAttempt: r.last_attempt || undefined,
        error: r.error || undefined,
      }));

      return {
        posts,
        total,
        hasMore: filter.offset + filter.limit < total,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Schedule next recurring post
   */
  private async scheduleNextRecurring(postId: string, data: PublishRequest): Promise<void> {
    if (!data.scheduling.recurring) return;
    
    const recurring = data.scheduling.recurring;
    const nextDate = this.calculateNextRecurringDate(new Date(), recurring);
    
    if (nextDate && (!recurring.endDate || nextDate <= recurring.endDate)) {
      const nextRequest = {
        ...data,
        scheduling: {
          ...data.scheduling,
          publishAt: nextDate,
        },
      };
      
      await this.schedulePublish(nextRequest);
    }
  }

  /**
   * Calculate next recurring date
   */
  private calculateNextRecurringDate(currentDate: Date, recurring: PublishRequest['scheduling']['recurring']): Date | null {
    if (!recurring) return null;
    
    const next = new Date(currentDate);
    
    switch (recurring.frequency) {
      case 'daily':
        next.setDate(next.getDate() + recurring.interval);
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 * recurring.interval));
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + recurring.interval);
        break;
    }
    
    return next;
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}