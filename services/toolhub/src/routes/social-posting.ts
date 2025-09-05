import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';
import { AuthenticatedRequest, requireScopes } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';
import { createPrismaClient, setTenantContext } from '../../../shared/database/client';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    
    if (mimeType && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

/**
 * POST /api/social/:platform/post
 * Create a post on the specified social media platform
 */
router.post('/:platform/post',
  requireScopes(['social:post']),
  upload.array('media', 10),
  [
    param('platform').isIn(['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok']).withMessage('Supported platform required'),
    body('text').optional().isString().isLength({ max: 3000 }).withMessage('Text content must be less than 3000 characters'),
    body('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    body('connectionId').isString().withMessage('Connection ID required'),
    body('scheduledAt').optional().isISO8601().withMessage('Scheduled time must be valid ISO8601 date'),
    body('visibility').optional().isIn(['public', 'private', 'connections', 'company']).withMessage('Invalid visibility setting'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('mentions').optional().isArray().withMessage('Mentions must be an array'),
    body('articleUrl').optional().isURL().withMessage('Article URL must be valid')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid post parameters', errors.array());
      }

      const { platform } = req.params;
      const { text, workspaceId, connectionId, scheduledAt, visibility, tags, mentions, articleUrl } = req.body;
      const mediaFiles = req.files as Express.Multer.File[];

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Get OAuth connection and validate
      const connection = await getOAuthConnection(connectionId, workspaceId);
      if (!connection || connection.platform !== platform) {
        throw new ApiError(404, 'CONNECTION_NOT_FOUND', 'OAuth connection not found or platform mismatch');
      }

      // Validate token is not expired
      if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
        throw new ApiError(401, 'TOKEN_EXPIRED', 'OAuth token has expired. Please reconnect your account.');
      }

      let postResult;
      
      switch (platform) {
        case 'linkedin':
          postResult = await postToLinkedIn(connection, { text, mediaFiles, visibility, tags, articleUrl });
          break;
        case 'twitter':
          postResult = await postToTwitter(connection, { text, mediaFiles, tags, mentions });
          break;
        case 'facebook':
          postResult = await postToFacebook(connection, { text, mediaFiles, visibility, tags });
          break;
        case 'instagram':
          postResult = await postToInstagram(connection, { text, mediaFiles, tags });
          break;
        case 'tiktok':
          postResult = await postToTikTok(connection, { text, mediaFiles, tags });
          break;
        default:
          throw new ApiError(400, 'UNSUPPORTED_PLATFORM', `Platform ${platform} is not supported`);
      }

      // Log the post for audit purposes
      await logSocialPost({
        workspaceId,
        platform,
        connectionId,
        postId: postResult.id,
        content: { text, mediaCount: mediaFiles?.length || 0, tags, mentions },
        scheduledAt,
        postedAt: postResult.postedAt,
        status: 'published',
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          postId: postResult.id,
          platform,
          url: postResult.url,
          status: 'published',
          postedAt: postResult.postedAt,
          engagement: postResult.engagement || {},
          scheduledAt: scheduledAt || null
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'POST_CREATION_ERROR', `Failed to create post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * LinkedIn posting implementation
 */
async function postToLinkedIn(connection: any, content: { text?: string, mediaFiles?: Express.Multer.File[], visibility?: string, tags?: string[], articleUrl?: string }) {
  const { text, mediaFiles, visibility = 'public', tags, articleUrl } = content;
  
  if (!text && !mediaFiles?.length && !articleUrl) {
    throw new ApiError(400, 'EMPTY_POST', 'Post must contain text, media, or article URL');
  }

  try {
    // Get user profile ID
    const profileResponse = await axios.get('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const authorUrn = `urn:li:person:${profileResponse.data.id}`;
    
    let postData: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text || ''
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility.toUpperCase()
      }
    };

    // Handle media uploads
    if (mediaFiles && mediaFiles.length > 0) {
      const uploadedMedia = await uploadLinkedInMedia(connection.accessToken, authorUrn, mediaFiles);
      
      if (uploadedMedia.length > 0) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = uploadedMedia.map(media => ({
          status: 'READY',
          description: {
            text: media.description || ''
          },
          media: media.mediaUrn,
          title: {
            text: media.title || ''
          }
        }));
      }
    }

    // Handle article sharing
    if (articleUrl) {
      postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: articleUrl
      }];
    }

    // Create the post
    const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const postId = response.data.id;
    const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

    return {
      id: postId,
      url: postUrl,
      postedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    };

  } catch (error) {
    console.error('LinkedIn posting error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.response?.data?.error_description || 'LinkedIn API error';
      throw new ApiError(400, 'LINKEDIN_API_ERROR', `LinkedIn posting failed: ${message}`);
    }
    throw error;
  }
}

/**
 * Upload media to LinkedIn
 */
async function uploadLinkedInMedia(accessToken: string, authorUrn: string, mediaFiles: Express.Multer.File[]) {
  const uploadedMedia = [];

  for (const file of mediaFiles) {
    try {
      // Register upload
      const registerData = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      };

      const registerResponse = await axios.post('https://api.linkedin.com/v2/assets?action=registerUpload', registerData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Upload the actual file
      await axios.put(uploadUrl, file.buffer, {
        headers: {
          'Content-Type': file.mimetype,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      uploadedMedia.push({
        mediaUrn: asset,
        title: file.originalname,
        description: `Uploaded ${file.originalname}`
      });

    } catch (error) {
      console.error('LinkedIn media upload error:', error);
      throw new ApiError(500, 'MEDIA_UPLOAD_ERROR', `Failed to upload media to LinkedIn: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return uploadedMedia;
}

/**
 * Twitter posting implementation
 */
async function postToTwitter(connection: any, content: { text?: string, mediaFiles?: Express.Multer.File[], tags?: string[], mentions?: string[] }) {
  const { text, mediaFiles, tags, mentions } = content;
  
  if (!text && !mediaFiles?.length) {
    throw new ApiError(400, 'EMPTY_POST', 'Tweet must contain text or media');
  }

  try {
    let tweetText = text || '';
    
    // Add hashtags
    if (tags && tags.length > 0) {
      const hashtags = tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      tweetText += ` ${hashtags}`;
    }

    // Add mentions
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(mention => mention.startsWith('@') ? mention : `@${mention}`).join(' ');
      tweetText = `${mentionText} ${tweetText}`;
    }

    let postData: any = {
      text: tweetText.trim()
    };

    // Handle media uploads
    if (mediaFiles && mediaFiles.length > 0) {
      const mediaIds = await uploadTwitterMedia(connection.accessToken, mediaFiles);
      if (mediaIds.length > 0) {
        postData.media = { media_ids: mediaIds };
      }
    }

    const response = await axios.post('https://api.twitter.com/2/tweets', postData, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const tweetId = response.data.data.id;
    const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

    return {
      id: tweetId,
      url: tweetUrl,
      postedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        retweets: 0,
        replies: 0
      }
    };

  } catch (error) {
    console.error('Twitter posting error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || error.response?.data?.error || 'Twitter API error';
      throw new ApiError(400, 'TWITTER_API_ERROR', `Twitter posting failed: ${message}`);
    }
    throw error;
  }
}

/**
 * Upload media to Twitter
 */
async function uploadTwitterMedia(accessToken: string, mediaFiles: Express.Multer.File[]) {
  const mediaIds = [];

  for (const file of mediaFiles) {
    try {
      const formData = new FormData();
      formData.append('media', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });

      const response = await axios.post('https://upload.twitter.com/1.1/media/upload.json', formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...formData.getHeaders()
        }
      });

      mediaIds.push(response.data.media_id_string);

    } catch (error) {
      console.error('Twitter media upload error:', error);
      throw new ApiError(500, 'MEDIA_UPLOAD_ERROR', `Failed to upload media to Twitter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return mediaIds;
}

/**
 * Facebook posting implementation
 */
async function postToFacebook(connection: any, content: { text?: string, mediaFiles?: Express.Multer.File[], visibility?: string, tags?: string[] }) {
  const { text, mediaFiles, visibility = 'public', tags } = content;
  
  if (!text && !mediaFiles?.length) {
    throw new ApiError(400, 'EMPTY_POST', 'Facebook post must contain text or media');
  }

  try {
    // Get user's pages (for posting to business pages)
    const pagesResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`
      }
    });

    // Use the first available page or user's personal profile
    const pageId = pagesResponse.data.data[0]?.id || 'me';
    const pageAccessToken = pagesResponse.data.data[0]?.access_token || connection.accessToken;

    let postData: any = {
      message: text || '',
      access_token: pageAccessToken
    };

    // Handle media uploads
    if (mediaFiles && mediaFiles.length > 0) {
      if (mediaFiles.length === 1) {
        // Single image/video post
        const file = mediaFiles[0];
        if (!file) {
          throw new ApiError(400, 'INVALID_FILE', 'File is required for media upload');
        }
        const formData = new FormData();
        formData.append('message', text || '');
        formData.append('source', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
        formData.append('access_token', pageAccessToken);

        const endpoint = file.mimetype.startsWith('video/') ? 'videos' : 'photos';
        const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/${endpoint}`, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });

        return {
          id: response.data.id,
          url: `https://facebook.com/${response.data.id}`,
          postedAt: new Date().toISOString(),
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0
          }
        };
      } else {
        // Multiple images - create album
        const photoIds = await uploadFacebookPhotos(pageAccessToken, pageId, mediaFiles);
        postData.attached_media = photoIds.map(id => ({ media_fbid: id }));
      }
    }

    const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/feed`, postData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      id: response.data.id,
      url: `https://facebook.com/${response.data.id}`,
      postedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    };

  } catch (error) {
    console.error('Facebook posting error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || 'Facebook API error';
      throw new ApiError(400, 'FACEBOOK_API_ERROR', `Facebook posting failed: ${message}`);
    }
    throw error;
  }
}

/**
 * Upload photos to Facebook
 */
async function uploadFacebookPhotos(accessToken: string, pageId: string, mediaFiles: Express.Multer.File[]) {
  const photoIds = [];

  for (const file of mediaFiles.filter(f => f.mimetype.startsWith('image/'))) {
    try {
      const formData = new FormData();
      formData.append('source', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      formData.append('published', 'false'); // Upload but don't publish yet
      formData.append('access_token', accessToken);

      const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/photos`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      photoIds.push(response.data.id);

    } catch (error) {
      console.error('Facebook photo upload error:', error);
      throw new ApiError(500, 'MEDIA_UPLOAD_ERROR', `Failed to upload photo to Facebook: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return photoIds;
}

/**
 * Instagram posting implementation
 */
async function postToInstagram(connection: any, content: { text?: string, mediaFiles?: Express.Multer.File[], tags?: string[] }) {
  const { text, mediaFiles, tags } = content;
  
  if (!mediaFiles?.length) {
    throw new ApiError(400, 'EMPTY_POST', 'Instagram post must contain media');
  }

  try {
    // Get Instagram Business Account ID
    const accountResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`
      }
    });

    const pageId = accountResponse.data.data[0]?.id;
    if (!pageId) {
      throw new ApiError(400, 'NO_BUSINESS_ACCOUNT', 'No Facebook Business account found');
    }

    const igAccountResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account`, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`
      }
    });

    const igAccountId = igAccountResponse.data.instagram_business_account?.id;
    if (!igAccountId) {
      throw new ApiError(400, 'NO_IG_BUSINESS_ACCOUNT', 'No Instagram Business account connected');
    }

    // Create media container
    const file = mediaFiles[0]; // Instagram supports single media per post
    if (!file) {
      throw new ApiError(400, 'INVALID_FILE', 'File is required for Instagram posting');
    }
    let caption = text || '';
    
    // Add hashtags
    if (tags && tags.length > 0) {
      const hashtags = tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      caption += ` ${hashtags}`;
    }

    // Upload media and create container
    const mediaUrl = await uploadInstagramMedia(connection.accessToken, file);
    
    const containerData = {
      image_url: mediaUrl,
      caption: caption.trim(),
      access_token: connection.accessToken
    };

    const containerResponse = await axios.post(`https://graph.facebook.com/v18.0/${igAccountId}/media`, containerData);
    const creationId = containerResponse.data.id;

    // Publish the media
    const publishData = {
      creation_id: creationId,
      access_token: connection.accessToken
    };

    const publishResponse = await axios.post(`https://graph.facebook.com/v18.0/${igAccountId}/media_publish`, publishData);

    return {
      id: publishResponse.data.id,
      url: `https://instagram.com/p/${publishResponse.data.id}`,
      postedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        comments: 0
      }
    };

  } catch (error) {
    console.error('Instagram posting error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || 'Instagram API error';
      throw new ApiError(400, 'INSTAGRAM_API_ERROR', `Instagram posting failed: ${message}`);
    }
    throw error;
  }
}

/**
 * Upload media to Instagram (via temporary URL)
 */
async function uploadInstagramMedia(accessToken: string, file: Express.Multer.File) {
  // In production, upload to a CDN/S3 and return public URL
  // For now, we'll simulate this process
  
  // This would typically involve:
  // 1. Upload file to AWS S3 or similar CDN
  // 2. Return public URL for Instagram to fetch
  
  throw new ApiError(501, 'MEDIA_UPLOAD_NOT_IMPLEMENTED', 'Instagram media upload requires CDN integration');
}

/**
 * TikTok posting implementation
 */
async function postToTikTok(connection: any, content: { text?: string, mediaFiles?: Express.Multer.File[], tags?: string[] }) {
  const { text, mediaFiles, tags } = content;
  
  if (!mediaFiles?.length || !mediaFiles[0]?.mimetype.startsWith('video/')) {
    throw new ApiError(400, 'INVALID_MEDIA', 'TikTok post must contain a video file');
  }

  try {
    const video = mediaFiles[0];
    if (!video) {
      throw new ApiError(400, 'INVALID_VIDEO', 'Video file is required for TikTok posting');
    }
    let caption = text || '';
    
    // Add hashtags
    if (tags && tags.length > 0) {
      const hashtags = tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      caption += ` ${hashtags}`;
    }

    // TikTok video upload process
    const uploadData = {
      post_info: {
        title: caption.trim(),
        privacy_level: 'SELF_ONLY', // or 'PUBLIC_TO_EVERYONE'
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: video.size,
        chunk_size: video.size,
        total_chunk_count: 1
      }
    };

    // Initialize upload
    const initResponse = await axios.post('https://open-api.tiktok.com/share/video/upload/', uploadData, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const uploadUrl = initResponse.data.data.upload_url;
    
    // Upload video
    const formData = new FormData();
    formData.append('video', video.buffer, {
      filename: video.originalname,
      contentType: video.mimetype
    });

    const uploadResponse = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    return {
      id: uploadResponse.data.data.video_id,
      url: `https://tiktok.com/@user/video/${uploadResponse.data.data.video_id}`,
      postedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      }
    };

  } catch (error) {
    console.error('TikTok posting error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || 'TikTok API error';
      throw new ApiError(400, 'TIKTOK_API_ERROR', `TikTok posting failed: ${message}`);
    }
    throw error;
  }
}

/**
 * Helper function to get OAuth connection from database and refresh token if expired
 */
export async function getOAuthConnection(connectionId: string, workspaceId: string) {
  const prisma = createPrismaClient();
  await setTenantContext(prisma, workspaceId);

  const connection = await (prisma as any).oauthConnection.findFirst({
    where: { id: connectionId, workspaceId }
  });

  if (!connection) {
    return null;
  }

  if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || ''
      });

      const refreshResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, expires_in } = refreshResponse.data;
      connection.accessToken = access_token;
      connection.expiresAt = new Date(Date.now() + (expires_in || 0) * 1000);

      await (prisma as any).oauthConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: connection.accessToken,
          expiresAt: connection.expiresAt
        }
      });
    } catch (err) {
      console.error('Token refresh failed', err);
    }
  }

  return {
    id: connection.id,
    platform: connection.platform,
    workspaceId: connection.workspaceId,
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    expiresAt: connection.expiresAt?.toISOString?.() || connection.expiresAt,
    profile: {
      id: connection.profileId,
      name: connection.profileName,
      username: connection.profileUsername,
      profileUrl: connection.profileUrl
    }
  };
}

/**
 * Helper function to log social media posts for audit
 */
async function logSocialPost(postData: any) {
  // In production, this would store in audit database
  console.log('Social post logged:', {
    timestamp: new Date().toISOString(),
    ...postData
  });
}

export { router as socialPostingRoutes };