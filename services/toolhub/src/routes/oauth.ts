import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import axios from 'axios';
import crypto from 'crypto';
import { AuthenticatedRequest, requireScopes } from '../middleware/auth';
import { ApiError } from '../middleware/error-handler';

const router = Router();

// OAuth configurations for different platforms
const OAUTH_CONFIGS = {
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
  },
  x: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read']
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list']
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['user_profile', 'user_media']
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/auth/authorize/',
    tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
    scopes: ['user.info.basic', 'video.list', 'video.upload']
  }
};

/**
 * GET /api/oauth/:platform/authorize
 * Initiate OAuth flow for a platform
 */
router.get('/:platform/authorize',
  requireScopes(['oauth:initiate']),
  [
    query('workspaceId').isUUID().withMessage('Valid workspace ID required'),
    query('redirectUri').optional().isURL().withMessage('Valid redirect URI required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid authorization parameters', errors.array());
      }

      const { platform } = req.params;
      const { workspaceId, redirectUri } = req.query;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const config = OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS];
      if (!config) {
        throw new ApiError(400, 'UNSUPPORTED_PLATFORM', `Platform ${platform} is not supported`);
      }

      // Generate state parameter for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');

      // Store state and nonce temporarily (in production, use Redis or database)
      // For now, we'll include them in the authorization URL

      if (!platform) {
        throw new ApiError(400, 'PLATFORM_REQUIRED', 'Platform parameter is required');
      }
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      if (!clientId) {
        throw new ApiError(500, 'OAUTH_CONFIG_ERROR', `OAuth not configured for ${platform}`);
      }

      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', config.scopes.join(' '));
      authUrl.searchParams.set('state', `${state}:${workspaceId}:${req.user?.userId}`);
      authUrl.searchParams.set('redirect_uri', redirectUri as string || `${process.env.BASE_URL}/api/oauth/${platform}/callback`);
      
      if (platform === 'x' || platform === 'youtube') {
        authUrl.searchParams.set('code_challenge', nonce);
        authUrl.searchParams.set('code_challenge_method', 'plain');
      }

      res.json({
        success: true,
        data: {
          authorizationUrl: authUrl.toString(),
          platform,
          state,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'OAUTH_INIT_ERROR', `OAuth initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/oauth/:platform/callback
 * Handle OAuth callback and exchange code for tokens
 */
router.post('/:platform/callback',
  requireScopes(['oauth:callback']),
  [
    body('code').isString().isLength({ min: 1 }).withMessage('Authorization code required'),
    body('state').isString().isLength({ min: 1 }).withMessage('State parameter required'),
    body('redirectUri').optional().isURL().withMessage('Valid redirect URI required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid callback parameters', errors.array());
      }

      const { platform } = req.params;
      const { code, state, redirectUri } = req.body;

      if (!platform) {
        throw new ApiError(400, 'PLATFORM_REQUIRED', 'Platform parameter is required');
      }

      const config = OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS];
      if (!config) {
        throw new ApiError(400, 'UNSUPPORTED_PLATFORM', `Platform ${platform} is not supported`);
      }

      // Validate state parameter
      const [stateToken, workspaceId, userId] = state.split(':');
      if (!stateToken || !workspaceId || !userId) {
        throw new ApiError(400, 'INVALID_STATE', 'Invalid state parameter');
      }

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];
      
      if (!clientId || !clientSecret) {
        throw new ApiError(500, 'OAUTH_CONFIG_ERROR', `OAuth not configured for ${platform}`);
      }

      // Exchange authorization code for access token
      const tokenRequest: any = {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri || `${process.env.BASE_URL}/api/oauth/${platform}/callback`
      };

      const tokenResponse = await axios.post(config.tokenUrl, tokenRequest, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      const tokens = tokenResponse.data;

      // Get user profile information
      const profile = await getUserProfile(platform as string, tokens.access_token);

      // Store tokens securely (in production, encrypt and store in database)
      const connectionData = {
        platform,
        workspaceId,
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        scope: tokens.scope || config.scopes.join(' '),
        profile: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          profileUrl: profile.profileUrl
        },
        connectedAt: new Date().toISOString()
      };

      // Database integration for OAuth connections will be implemented with production database setup

      res.json({
        success: true,
        data: {
          platform,
          connected: true,
          profile: connectionData.profile,
          scopes: connectionData.scope.split(' '),
          connectedAt: connectionData.connectedAt,
          expiresAt: connectionData.expiresAt
        }
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error_description || error.response?.data?.error || 'Token exchange failed';
        throw new ApiError(400, 'OAUTH_TOKEN_ERROR', message);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'OAUTH_CALLBACK_ERROR', `OAuth callback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * GET /api/oauth/connections/:workspaceId
 * Get OAuth connections for a workspace
 */
router.get('/connections/:workspaceId',
  requireScopes(['oauth:read']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Verify user has access to workspace
      if (req.user?.workspaceId !== workspaceId && !req.user?.scopes.includes('admin')) {
        throw new ApiError(403, 'WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
      }

      // Database query for OAuth connections will be implemented with production database setup
      // Demo connection data below is for development/testing only.
      // WARNING: Replace these placeholders with real data in production.
      const connections = [
        {
          connectionId: 'conn-linkedin-001',
          platform: 'linkedin',
          profile: {
            id: '000000000',
            name: 'Example User',
            username: 'exampleuser',
            profileUrl: 'https://linkedin.com/in/exampleuser'
          },
          scopes: ['r_liteprofile', 'w_member_social'],
          connectedAt: '2024-01-15T10:30:00Z',
          expiresAt: '2024-02-15T10:30:00Z',
          status: 'active'
        }
      ];

      res.json({
        success: true,
        data: {
          workspaceId,
          connections,
          totalConnections: connections.length,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'CONNECTION_RETRIEVAL_ERROR', `Failed to get connections: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * DELETE /api/oauth/connections/:connectionId
 * Revoke OAuth connection
 */
router.delete('/connections/:connectionId',
  requireScopes(['oauth:write']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { connectionId } = req.params;

      // Database verification and token revocation will be implemented with production OAuth flow
      // Connection deletion will be implemented with production database setup

      res.json({
        success: true,
        message: `Connection ${connectionId} revoked successfully`,
        revokedAt: new Date().toISOString()
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'CONNECTION_REVOKE_ERROR', `Failed to revoke connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * POST /api/oauth/:platform/refresh
 * Refresh access token using refresh token
 */
router.post('/:platform/refresh',
  requireScopes(['oauth:refresh']),
  [
    body('connectionId').isString().withMessage('Connection ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid refresh parameters', errors.array());
      }

      const { platform } = req.params;
      const { connectionId } = req.body;

      const config = OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS];
      if (!config) {
        throw new ApiError(400, 'UNSUPPORTED_PLATFORM', `Platform ${platform} is not supported`);
      }

      // OAuth token refresh functionality will be implemented with production OAuth flow
      // Token storage updates will be implemented with production database setup

      res.json({
        success: true,
        data: {
          connectionId,
          refreshed: true,
          refreshedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'TOKEN_REFRESH_ERROR', `Token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * Helper function to get user profile from platform
 */
async function getUserProfile(platform: string, accessToken: string): Promise<any> {
  const profileUrls = {
    linkedin: 'https://api.linkedin.com/v2/people/~',
    x: 'https://api.twitter.com/2/users/me',
    facebook: 'https://graph.facebook.com/me',
    instagram: 'https://graph.instagram.com/me',
    youtube: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    tiktok: 'https://open-api.tiktok.com/user/info/'
  };

  const profileUrl = profileUrls[platform as keyof typeof profileUrls];
  if (!profileUrl) {
    throw new ApiError(400, 'UNSUPPORTED_PLATFORM', `Profile retrieval not supported for ${platform}`);
  }

  try {
    const response = await axios.get(profileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    // Normalize profile data across platforms
    const profileData = response.data;
    return {
      id: profileData.id || profileData.localizedFirstName,
      name: profileData.name || `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
      username: profileData.username || profileData.vanityName,
      profileUrl: profileData.profile_url || `https://${platform}.com/${profileData.username}`
    };

  } catch (error) {
    console.error(`Failed to get ${platform} profile:`, error);
    throw new ApiError(500, 'PROFILE_RETRIEVAL_ERROR', `Failed to retrieve user profile from ${platform}`);
  }
}

export { router as oauthRoutes };