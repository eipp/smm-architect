import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AIModelProvider, ContentGenerationRequest, ImageGenerationRequest } from '../services/AIModelProvider';
import { authMiddleware, requireScopes, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';

const router = Router();
const aiProvider = new AIModelProvider();

/**
 * POST /api/content/generate
 * Generate content using AI models
 */
router.post('/generate',
  requireScopes(['content:generate']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('agentType').isIn(['research', 'planner', 'creative', 'legal', 'automation', 'publisher']).withMessage('Valid agent type required'),
    body('contentType').isIn(['post', 'article', 'caption', 'headline', 'description', 'hashtags']).withMessage('Valid content type required'),
    body('platform').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok', 'multi']).withMessage('Valid platform required'),
    body('prompt').isString().isLength({ min: 10, max: 2000 }).withMessage('Prompt must be 10-2000 characters'),
    body('context.brandVoice').optional().isObject().withMessage('Brand voice must be an object'),
    body('context.targetAudience').optional().isString().withMessage('Target audience must be a string'),
    body('context.tone').optional().isIn(['professional', 'casual', 'humorous', 'informative', 'inspiring']).withMessage('Invalid tone'),
    body('context.length').optional().isIn(['short', 'medium', 'long']).withMessage('Invalid length'),
    body('constraints.maxLength').optional().isInt({ min: 1 }).withMessage('Max length must be positive integer'),
    body('constraints.minLength').optional().isInt({ min: 1 }).withMessage('Min length must be positive integer'),
    body('preferences.model').optional().isIn(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']).withMessage('Invalid model'),
    body('preferences.temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be 0-2'),
    body('preferences.maxTokens').optional().isInt({ min: 1, max: 4000 }).withMessage('Max tokens must be 1-4000')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid content generation request', errors.array());
      }

      const request: ContentGenerationRequest = req.body;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== request.workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const result = await aiProvider.generateContent(request);

      res.json({
        success: true,
        data: result,
        message: 'Content generated successfully'
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'CONTENT_GENERATION_ERROR', `Failed to generate content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/content/generate/image
 * Generate images using DALL-E
 */
router.post('/generate/image',
  requireScopes(['content:generate:image']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('prompt').isString().isLength({ min: 10, max: 1000 }).withMessage('Prompt must be 10-1000 characters'),
    body('style').optional().isIn(['realistic', 'artistic', 'minimalist', 'corporate', 'playful']).withMessage('Invalid style'),
    body('aspectRatio').optional().isIn(['1:1', '16:9', '9:16', '4:3']).withMessage('Invalid aspect ratio'),
    body('size').optional().isIn(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).withMessage('Invalid size'),
    body('quality').optional().isIn(['standard', 'hd']).withMessage('Invalid quality'),
    body('quantity').optional().isInt({ min: 1, max: 4 }).withMessage('Quantity must be 1-4')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid image generation request', errors.array());
      }

      const request: ImageGenerationRequest = req.body;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== request.workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const result = await aiProvider.generateImage(request);

      res.json({
        success: true,
        data: result,
        message: 'Images generated successfully'
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'IMAGE_GENERATION_ERROR', `Failed to generate images: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/content/brand-voice/:workspaceId
 * Set brand voice for a workspace
 */
router.post('/brand-voice/:workspaceId',
  requireScopes(['content:brand-voice:write']),
  [
    param('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('personality').isArray().withMessage('Personality must be an array'),
    body('values').isArray().withMessage('Values must be an array'),
    body('communicationStyle').isString().withMessage('Communication style required'),
    body('keyMessages').isArray().withMessage('Key messages must be an array'),
    body('avoidedTopics').optional().isArray().withMessage('Avoided topics must be an array'),
    body('examples').optional().isArray().withMessage('Examples must be an array')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid brand voice request', errors.array());
      }

      const { workspaceId } = req.params;
      const brandVoice = req.body;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      aiProvider.setBrandVoice(workspaceId, brandVoice);

      res.json({
        success: true,
        message: 'Brand voice set successfully',
        data: {
          workspaceId,
          brandVoice,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'BRAND_VOICE_ERROR', `Failed to set brand voice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/content/optimize
 * Optimize existing content for different platforms
 */
router.post('/optimize',
  requireScopes(['content:optimize']),
  [
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('content').isString().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters'),
    body('originalPlatform').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Valid original platform required'),
    body('targetPlatforms').isArray().withMessage('Target platforms must be an array'),
    body('targetPlatforms.*').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Invalid target platform'),
    body('preserveOriginalMeaning').optional().isBoolean().withMessage('Preserve original meaning must be boolean')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid optimization request', errors.array());
      }

      const { workspaceId, content, originalPlatform, targetPlatforms, preserveOriginalMeaning = true } = req.body;
      
      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const optimizedContent = [];

      for (const platform of targetPlatforms) {
        if (platform === originalPlatform) {
          optimizedContent.push({
            platform,
            content,
            isOriginal: true
          });
          continue;
        }

        try {
          const optimizationRequest: ContentGenerationRequest = {
            workspaceId,
            agentType: 'creative',
            contentType: 'post',
            platform,
            prompt: `Optimize this ${originalPlatform} content for ${platform}: "${content}"`,
            context: {
              tone: 'professional'
            },
            constraints: {
              maxLength: platform === 'twitter' ? 280 : undefined
            }
          };

          if (preserveOriginalMeaning) {
            optimizationRequest.prompt += '\n\nIMPORTANT: Preserve the original message and meaning while adapting for the target platform.';
          }

          const result = await aiProvider.generateContent(optimizationRequest);
          
          optimizedContent.push({
            platform,
            content: result.content,
            metadata: result.metadata,
            suggestions: result.suggestions,
            isOriginal: false
          });

        } catch (error) {
          console.error(`Failed to optimize for ${platform}:`, error);
          optimizedContent.push({
            platform,
            error: `Failed to optimize for ${platform}`,
            isOriginal: false
          });
        }
      }

      res.json({
        success: true,
        data: {
          originalContent: content,
          originalPlatform,
          optimizedContent,
          generatedAt: new Date().toISOString()
        },
        message: `Content optimized for ${targetPlatforms.length} platforms`
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'OPTIMIZATION_ERROR', `Failed to optimize content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/content/suggestions/:platform
 * Get content suggestions and best practices for a platform
 */
router.get('/suggestions/:platform',
  requireScopes(['content:read']),
  [
    param('platform').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Valid platform required'),
    query('contentType').optional().isIn(['post', 'article', 'caption', 'headline', 'description']).withMessage('Invalid content type'),
    query('industry').optional().isString().withMessage('Industry must be a string')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid suggestions request', errors.array());
      }

      const { platform } = req.params;
      const { contentType = 'post', industry } = req.query;

      // Generate platform-specific suggestions
      const suggestions = {
        platform,
        contentType,
        bestPractices: await getPlatformBestPractices(platform),
        contentIdeas: await generateContentIdeas(platform, contentType as string, industry as string),
        trending: await getTrendingTopics(platform),
        hashtagSuggestions: await getHashtagSuggestions(platform, industry as string),
        optimalTiming: await getOptimalPostingTimes(platform),
        engagement: await getEngagementTips(platform),
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: suggestions,
        message: `Suggestions generated for ${platform}`
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'SUGGESTIONS_ERROR', `Failed to generate suggestions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * Helper functions for content suggestions
 */
async function getPlatformBestPractices(platform: string): Promise<string[]> {
  const practices = {
    linkedin: [
      'Share industry insights and professional experiences',
      'Use a professional tone and proper grammar',
      'Include relevant hashtags (3-5 maximum)',
      'Ask thought-provoking questions to encourage discussion',
      'Share articles and add your perspective',
      'Use line breaks for better readability'
    ],
    twitter: [
      'Keep tweets concise and engaging',
      'Use 1-2 hashtags maximum',
      'Include visuals when possible',
      'Engage with replies and mentions',
      'Use threads for longer content',
      'Post at optimal times for your audience'
    ],
    facebook: [
      'Write in a conversational tone',
      'Use storytelling to connect with audience',
      'Include calls-to-action',
      'Use Facebook-native video',
      'Encourage comments and shares',
      'Post consistently but not too frequently'
    ],
    instagram: [
      'Focus on high-quality visuals',
      'Use Instagram Stories for behind-the-scenes content',
      'Include 5-10 relevant hashtags',
      'Write engaging captions that tell a story',
      'Use user-generated content',
      'Post consistently and engage with followers'
    ],
    tiktok: [
      'Create authentic, entertaining content',
      'Use trending sounds and effects',
      'Keep videos short and engaging',
      'Post frequently (multiple times per day)',
      'Use relevant hashtags and participate in challenges',
      'Engage with comments and other creators'
    ]
  };

  return practices[platform as keyof typeof practices] || [];
}

async function generateContentIdeas(platform: string, contentType: string, industry?: string): Promise<string[]> {
  const baseIdeas = {
    linkedin: [
      'Industry trends and insights',
      'Professional development tips',
      'Company culture highlights',
      'Thought leadership articles',
      'Career advice and experiences',
      'Industry event summaries'
    ],
    twitter: [
      'Quick tips and hacks',
      'Industry news commentary',
      'Behind-the-scenes content',
      'Live event coverage',
      'Polls and questions',
      'Thread series on topics'
    ],
    facebook: [
      'Community stories',
      'Product announcements',
      'Customer testimonials',
      'Educational content',
      'Event promotions',
      'Company milestones'
    ],
    instagram: [
      'Product showcases',
      'Behind-the-scenes stories',
      'User-generated content',
      'Tutorial videos',
      'Team spotlights',
      'Inspirational quotes'
    ],
    tiktok: [
      'Educational content',
      'Trending challenges',
      'Product demonstrations',
      'Day-in-the-life content',
      'Quick tutorials',
      'Entertainment content'
    ]
  };

  let ideas = baseIdeas[platform as keyof typeof baseIdeas] || [];
  
  // Add industry-specific ideas if provided
  if (industry) {
    ideas = ideas.map(idea => `${idea} (${industry} focus)`);
  }

  return ideas;
}

async function getTrendingTopics(platform: string): Promise<string[]> {
  // In a real implementation, this would fetch from platform APIs
  const mockTrending = {
    linkedin: ['AI in business', 'Remote work strategies', 'Sustainability', 'Digital transformation'],
    twitter: ['Tech news', 'Current events', 'Pop culture', 'Sports'],
    facebook: ['Local events', 'Community news', 'Family content', 'Entertainment'],
    instagram: ['Fashion trends', 'Food content', 'Travel', 'Lifestyle'],
    tiktok: ['Dance challenges', 'Comedy skits', 'Educational content', 'DIY tutorials']
  };

  return mockTrending[platform as keyof typeof mockTrending] || [];
}

async function getHashtagSuggestions(platform: string, industry?: string): Promise<string[]> {
  const generalHashtags = {
    linkedin: ['#professional', '#business', '#innovation', '#leadership', '#growth'],
    twitter: ['#tech', '#news', '#trending', '#social', '#digital'],
    facebook: ['#community', '#family', '#local', '#business', '#events'],
    instagram: ['#lifestyle', '#photo', '#art', '#inspiration', '#daily'],
    tiktok: ['#fyp', '#trending', '#viral', '#entertainment', '#fun']
  };

  let hashtags = generalHashtags[platform as keyof typeof generalHashtags] || [];
  
  if (industry) {
    hashtags.push(`#${industry.toLowerCase()}`, `#${industry.toLowerCase()}industry`);
  }

  return hashtags;
}

async function getOptimalPostingTimes(platform: string): Promise<any> {
  const times = {
    linkedin: {
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
      bestTimes: ['9:00 AM', '12:00 PM', '5:00 PM'],
      timezone: 'Business hours in your audience timezone'
    },
    twitter: {
      bestDays: ['Wednesday', 'Thursday', 'Friday'],
      bestTimes: ['9:00 AM', '1:00 PM', '3:00 PM'],
      timezone: 'Peak activity times vary by audience'
    },
    facebook: {
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
      bestTimes: ['1:00 PM', '3:00 PM', '8:00 PM'],
      timezone: 'Afternoon and evening work best'
    },
    instagram: {
      bestDays: ['Monday', 'Tuesday', 'Friday'],
      bestTimes: ['11:00 AM', '2:00 PM', '5:00 PM'],
      timezone: 'Lunch and after-work hours'
    },
    tiktok: {
      bestDays: ['Tuesday', 'Thursday', 'Sunday'],
      bestTimes: ['6:00 AM', '10:00 AM', '7:00 PM'],
      timezone: 'Early morning and evening'
    }
  };

  return times[platform as keyof typeof times] || {};
}

async function getEngagementTips(platform: string): Promise<string[]> {
  const tips = {
    linkedin: [
      'Ask questions to encourage comments',
      'Share personal professional experiences',
      'Comment on others\' posts in your network',
      'Use LinkedIn native video',
      'Share valuable industry resources'
    ],
    twitter: [
      'Reply to comments quickly',
      'Retweet with added commentary',
      'Use Twitter polls',
      'Join trending conversations',
      'Share timely, relevant content'
    ],
    facebook: [
      'Respond to comments and messages',
      'Use Facebook Live for real-time engagement',
      'Create shareable content',
      'Post in Facebook groups',
      'Use Facebook Events for promotions'
    ],
    instagram: [
      'Use Instagram Stories consistently',
      'Respond to DMs and comments',
      'Use relevant hashtags',
      'Partner with influencers',
      'Share user-generated content'
    ],
    tiktok: [
      'Engage with comments through video responses',
      'Duet and stitch popular content',
      'Use trending sounds and effects',
      'Post consistently',
      'Participate in challenges'
    ]
  };

  return tips[platform as keyof typeof tips] || [];
}

export { router as contentRoutes };