export interface PublishRequest {
  workspaceId: string;
  platforms: string[];
  content: {
    text?: string;
    mediaUrls?: string[];
    articleUrl?: string;
    tags?: string[];
    mentions?: string[];
  };
  scheduling: {
    publishAt?: Date;
    timezone?: string;
    recurring?: RecurringSchedule;
  };
  options: {
    visibility?: 'public' | 'private' | 'connections' | 'company';
    enableComments?: boolean;
    enableSharing?: boolean;
    crossPost?: boolean;
  };
  approval?: {
    required: boolean;
    approvers: string[];
    deadline?: Date;
  };
}

export interface RecurringSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[]; // 0-6, Sunday to Saturday
  dayOfMonth?: number; // 1-31
}

export interface PublishResult {
  id: string;
  workspaceId: string;
  status: 'scheduled' | 'published' | 'failed' | 'pending_approval';
  platforms: PlatformResult[];
  createdAt: Date;
  publishedAt?: Date;
  scheduledAt?: Date;
  error?: string;
}

export interface PlatformResult {
  platform: string;
  postId?: string;
  url?: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

export interface MediaUpload {
  id: string;
  workspaceId: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
  uploadedAt: Date;
  uploadedBy: string;
}

export interface ScheduledPost {
  id: string;
  workspaceId: string;
  content: PublishRequest['content'];
  platforms: string[];
  scheduledAt: Date;
  timezone: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  recurring?: RecurringSchedule;
  createdAt: Date;
  createdBy: string;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export interface PublishJob {
  id: string;
  type: 'immediate' | 'scheduled' | 'recurring';
  data: PublishRequest;
  priority: number;
  delay?: number;
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface Platform {
  id: string;
  name: string;
  enabled: boolean;
  apiEndpoint: string;
  rateLimit: {
    requests: number;
    window: number; // in milliseconds
  };
  mediaSupport: {
    images: boolean;
    videos: boolean;
    documents: boolean;
    maxFileSize: number;
    supportedFormats: string[];
  };
  features: {
    scheduling: boolean;
    threads: boolean;
    polls: boolean;
    stories: boolean;
    liveStreaming: boolean;
  };
}

export interface OAuthConnection {
  id: string;
  workspaceId: string;
  platform: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope: string[];
  profile: {
    id: string;
    name: string;
    username?: string;
    profileUrl?: string;
    avatarUrl?: string;
  };
  status: 'active' | 'expired' | 'revoked' | 'error';
  connectedAt: Date;
  lastUsed?: Date;
}

export interface ApprovalWorkflow {
  id: string;
  workspaceId: string;
  postId: string;
  requiredApprovers: string[];
  approvals: Approval[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  deadline?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface Approval {
  approverId: string;
  status: 'approved' | 'rejected' | 'pending';
  comment?: string;
  timestamp: Date;
}

export interface PublishingMetrics {
  workspaceId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  platformBreakdown: {
    [platform: string]: {
      posts: number;
      success: number;
      failures: number;
      engagement: {
        likes: number;
        comments: number;
        shares: number;
        views: number;
      };
    };
  };
  topPerformingPosts: {
    postId: string;
    platform: string;
    engagement: number;
    url: string;
  }[];
}

export interface ContentOptimization {
  platform: string;
  recommendations: {
    optimalTiming: {
      dayOfWeek: number;
      hour: number;
      confidence: number;
    };
    hashtagSuggestions: string[];
    contentLength: {
      min: number;
      max: number;
      optimal: number;
    };
    mediaRecommendations: {
      type: 'image' | 'video' | 'carousel';
      aspectRatio?: string;
      duration?: number;
    };
  };
}

export interface BulkPublishRequest {
  workspaceId: string;
  posts: Omit<PublishRequest, 'workspaceId'>[];
  batchOptions: {
    delayBetweenPosts?: number; // in milliseconds
    stopOnError?: boolean;
    maxConcurrency?: number;
  };
}

export interface CrossPlatformAnalytics {
  postId: string;
  platforms: {
    platform: string;
    url: string;
    engagement: {
      likes: number;
      comments: number;
      shares: number;
      views: number;
      clickThroughs: number;
    };
    performance: {
      reach: number;
      impressions: number;
      engagementRate: number;
    };
  }[];
  totalEngagement: number;
  bestPerformingPlatform: string;
  insights: {
    audienceOverlap: number;
    crossPlatformSynergy: number;
    recommendedStrategy: string;
  };
}