import { EventEmitter } from 'events';
import axios from 'axios';

export interface PublishingRequest {
  workspaceId: string;
  content: {
    text: string;
    mediaUrls?: string[];
    hashtags?: string[];
  };
  platforms: string[];
  scheduling: {
    publishAt?: Date;
    timezone?: string;
    optimal?: boolean;
  };
  distribution: {
    strategy: 'simultaneous' | 'staggered' | 'optimized';
    delayBetweenPosts?: number;
  };
}

export interface PublishingResult {
  id: string;
  workspaceId: string;
  status: 'scheduled' | 'published' | 'failed' | 'partial';
  platforms: {
    platform: string;
    status: 'success' | 'failed' | 'pending';
    postId?: string;
    url?: string;
    error?: string;
    publishedAt?: Date;
  }[];
  metrics: {
    totalPosts: number;
    successfulPosts: number;
    failedPosts: number;
  };
  optimizations: {
    timingAdjustments: any[];
    contentAdaptations: any[];
  };
  publishedAt: Date;
}

export interface OptimalTiming {
  platform: string;
  dayOfWeek: number;
  hour: number;
  confidence: number;
  reasoning: string;
}

export class PublisherAgent extends EventEmitter {
  private publisherServiceUrl: string;
  private toolhubServiceUrl: string;

  constructor() {
    super();
    this.publisherServiceUrl = process.env.PUBLISHER_SERVICE_URL || 'http://localhost:8081';
    this.toolhubServiceUrl = process.env.TOOLHUB_SERVICE_URL || 'http://localhost:8080';
  }

  async publishContent(request: PublishingRequest): Promise<PublishingResult> {
    try {
      const result: PublishingResult = {
        id: `publish_${Date.now()}`,
        workspaceId: request.workspaceId,
        status: 'scheduled',
        platforms: [],
        metrics: { totalPosts: 0, successfulPosts: 0, failedPosts: 0 },
        optimizations: { timingAdjustments: [], contentAdaptations: [] },
        publishedAt: new Date()
      };

      // Optimize timing if requested
      if (request.scheduling.optimal) {
        const optimizations = await this.optimizePublishingTimes(request.platforms);
        result.optimizations.timingAdjustments = optimizations;
      }

      // Execute publishing strategy
      switch (request.distribution.strategy) {
        case 'simultaneous':
          await this.publishSimultaneous(request, result);
          break;
        case 'staggered':
          await this.publishStaggered(request, result);
          break;
        case 'optimized':
          await this.publishOptimized(request, result);
          break;
      }

      // Calculate final metrics
      result.metrics.totalPosts = result.platforms.length;
      result.metrics.successfulPosts = result.platforms.filter(p => p.status === 'success').length;
      result.metrics.failedPosts = result.platforms.filter(p => p.status === 'failed').length;

      // Determine overall status
      if (result.metrics.successfulPosts === result.metrics.totalPosts) {
        result.status = 'published';
      } else if (result.metrics.successfulPosts > 0) {
        result.status = 'partial';
      } else {
        result.status = 'failed';
      }

      this.emit('publishingCompleted', result);
      return result;

    } catch (error) {
      console.error('Publishing failed:', error);
      throw new Error(`Publishing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async publishSimultaneous(request: PublishingRequest, result: PublishingResult): Promise<void> {
    const publishPromises = request.platforms.map(platform => 
      this.publishToPlatform(platform, request, result)
    );

    await Promise.allSettled(publishPromises);
  }

  private async publishStaggered(request: PublishingRequest, result: PublishingResult): Promise<void> {
    const delay = request.distribution.delayBetweenPosts || 300000; // 5 minutes default

    for (const platform of request.platforms) {
      await this.publishToPlatform(platform, request, result);
      if (platform !== request.platforms[request.platforms.length - 1]) {
        await this.delay(delay);
      }
    }
  }

  private async publishOptimized(request: PublishingRequest, result: PublishingResult): Promise<void> {
    // Get optimal times for each platform
    const optimalTimes = await this.optimizePublishingTimes(request.platforms);
    
    // Sort platforms by optimal time
    const sortedPlatforms = request.platforms.sort((a, b) => {
      const timeA = optimalTimes.find(t => t.platform === a)?.hour || 12;
      const timeB = optimalTimes.find(t => t.platform === b)?.hour || 12;
      return timeA - timeB;
    });

    // Publish in optimal order
    for (const platform of sortedPlatforms) {
      await this.publishToPlatform(platform, request, result);
    }
  }

  private async publishToPlatform(platform: string, request: PublishingRequest, result: PublishingResult): Promise<void> {
    const platformResult: any = {
      platform,
      status: 'pending',
      publishedAt: new Date()
    };

    try {
      // Adapt content for platform
      const adaptedContent = await this.adaptContentForPlatform(request.content, platform);
      
      // Call social posting API
      const response = await axios.post(`${this.toolhubServiceUrl}/api/social/${platform}/post`, {
        text: adaptedContent.text,
        workspaceId: request.workspaceId,
        connectionId: `conn-${platform}-${request.workspaceId}`, // Mock connection ID
        tags: adaptedContent.hashtags,
        scheduledAt: request.scheduling.publishAt?.toISOString()
      });

      if (response.data.success) {
        platformResult.status = 'success';
        platformResult.postId = response.data.data.postId;
        platformResult.url = response.data.data.url;
      } else {
        platformResult.status = 'failed';
        platformResult.error = 'API call failed';
      }

    } catch (error) {
      platformResult.status = 'failed';
      platformResult.error = error instanceof Error ? error.message : String(error);
    }

    result.platforms.push(platformResult);
  }

  private async adaptContentForPlatform(content: any, platform: string): Promise<any> {
    // Platform-specific content adaptations
    const adaptations = {
      twitter: { maxLength: 280, hashtagLimit: 2 },
      linkedin: { maxLength: 3000, hashtagLimit: 5 },
      facebook: { maxLength: 2000, hashtagLimit: 10 },
      instagram: { maxLength: 2200, hashtagLimit: 30 },
      tiktok: { maxLength: 150, hashtagLimit: 5 }
    };

    const platformLimits = adaptations[platform as keyof typeof adaptations];
    if (!platformLimits) return content;

    let adaptedText = content.text;
    
    // Truncate if too long
    if (adaptedText.length > platformLimits.maxLength) {
      adaptedText = adaptedText.substring(0, platformLimits.maxLength - 3) + '...';
    }

    // Limit hashtags
    const hashtags = content.hashtags?.slice(0, platformLimits.hashtagLimit) || [];

    return {
      text: adaptedText,
      hashtags,
      mediaUrls: content.mediaUrls
    };
  }

  async optimizePublishingTimes(platforms: string[]): Promise<OptimalTiming[]> {
    const optimalTimes: OptimalTiming[] = [];

    // Mock optimal timing data - in production would use analytics
    const timingData = {
      linkedin: { day: 2, hour: 9, confidence: 0.85, reasoning: 'Business professionals active' },
      twitter: { day: 3, hour: 15, confidence: 0.78, reasoning: 'High engagement period' },
      facebook: { day: 4, hour: 13, confidence: 0.72, reasoning: 'Lunch break activity' },
      instagram: { day: 5, hour: 17, confidence: 0.82, reasoning: 'After work engagement' },
      tiktok: { day: 6, hour: 19, confidence: 0.88, reasoning: 'Evening entertainment time' }
    };

    platforms.forEach(platform => {
      const timing = timingData[platform as keyof typeof timingData];
      if (timing) {
        optimalTimes.push({
          platform,
          dayOfWeek: timing.day,
          hour: timing.hour,
          confidence: timing.confidence,
          reasoning: timing.reasoning
        });
      }
    });

    return optimalTimes;
  }

  async getPublishingAnalytics(workspaceId: string, timeframe: 'week' | 'month' | 'quarter'): Promise<any> {
    // Mock analytics - in production would query actual data
    return {
      workspaceId,
      timeframe,
      totalPosts: 156,
      successRate: 0.94,
      averageEngagement: 0.034,
      topPerformingPlatform: 'linkedin',
      bestPublishingTimes: {
        linkedin: '9:00 AM Tuesday',
        twitter: '3:00 PM Wednesday',
        facebook: '1:00 PM Thursday'
      },
      recommendations: [
        'Increase posting frequency on LinkedIn',
        'Focus on video content for TikTok',
        'Use more hashtags on Instagram'
      ]
    };
  }

  async scheduleRecurringPost(request: PublishingRequest & { 
    recurring: { 
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      endDate?: Date;
    } 
  }): Promise<string[]> {
    const scheduledIds: string[] = [];
    
    // Generate recurring schedule
    const schedules = this.generateRecurringSchedule(
      request.scheduling.publishAt || new Date(),
      request.recurring
    );

    // Schedule each occurrence
    for (const scheduleDate of schedules) {
      try {
        const recurringRequest = {
          ...request,
          scheduling: {
            ...request.scheduling,
            publishAt: scheduleDate
          }
        };

        const result = await this.publishContent(recurringRequest);
        scheduledIds.push(result.id);
        
      } catch (error) {
        console.error('Failed to schedule recurring post:', error);
      }
    }

    return scheduledIds;
  }

  private generateRecurringSchedule(startDate: Date, recurring: any): Date[] {
    const schedules: Date[] = [];
    let currentDate = new Date(startDate);
    const endDate = recurring.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

    while (currentDate <= endDate && schedules.length < 100) { // Max 100 occurrences
      schedules.push(new Date(currentDate));
      
      switch (recurring.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + recurring.interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (7 * recurring.interval));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + recurring.interval);
          break;
      }
    }

    return schedules;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}