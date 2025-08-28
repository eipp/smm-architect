/**
 * Publisher Types
 * Type definitions for content publishing and engagement tracking
 */

export interface PublishableContent {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  mediaUrls: string[];
  tags: string[];
  metadata: Record<string, any>;
}

export interface Channel {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  isActive: boolean;
  credentials: Record<string, any>;
  settings?: {
    autoPost?: boolean;
    defaultHashtags?: string[];
    contentFilters?: string[];
  };
}

export interface ScheduleResult {
  success: boolean;
  publicationId?: string;
  scheduledTime?: Date;
  channels?: Array<{ platform: string; channelId: string }>;
  message: string;
  error?: string;
}

export interface PublicationResult {
  success: boolean;
  publicationId?: string;
  platform?: string;
  channelId?: string;
  postId?: string;
  postUrl?: string;
  publishedAt: Date;
  error?: string;
  totalChannels?: number;
  successfulChannels?: number;
  failedChannels?: number;
  results?: Record<string, PublicationResult>;
  message?: string;
}

export interface EngagementMetrics {
  publicationId?: string;
  postId?: string;
  platform?: string;
  totalReach: number;
  totalImpressions: number;
  totalEngagements: number;
  totalClicks: number;
  totalShares: number;
  totalComments: number;
  totalLikes: number;
  engagementRate: number;
  platformMetrics?: Record<string, EngagementMetrics>;
  lastUpdated: Date;
  reach?: number;
  impressions?: number;
  engagements?: number;
  clicks?: number;
  shares?: number;
  comments?: number;
  likes?: number;
}

export interface PublishingSchedule {
  id: string;
  workspaceId: string;
  contentId: string;
  channels: Channel[];
  scheduledAt: Date;
  status: 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  createdAt: Date;
  createdBy: string;
}

export interface PlatformLimits {
  postsPerHour: number;
  postsPerDay: number;
  charactersPerPost: number;
  mediaPerPost: number;
  hashtagsPerPost: number;
}

export interface ContentOptimization {
  platform: string;
  recommendations: {
    textLength: { min: number; max: number; optimal: number };
    hashtags: { min: number; max: number; recommended: string[] };
    mediaTypes: string[];
    bestTimes: string[];
    engagement: {
      callToAction: string[];
      emotionalTone: string;
      contentType: string;
    };
  };
  compliance: {
    required: string[];
    optional: string[];
  };
}

