import axios from 'axios';
// Mock auth middleware before importing the app
jest.mock('../src/middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      userId: 'test-user',
      workspaceId: '123e4567-e89b-12d3-a456-426614174000',
      scopes: ['oauth:read', 'oauth:write']
    };
    next();
  },
  requireScopes: () => (_req: any, _res: any, next: any) => next()
}));

import request from 'supertest';
import app from '../src/server';
import { getOAuthConnection } from '../src/routes/social-posting';
import { createPrismaClient } from '../../shared/database/client';

jest.mock('../../shared/database/client', () => ({
  createPrismaClient: jest.fn(),
  setTenantContext: jest.fn()
}));

jest.mock('axios');

describe('OAuth connections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return workspace OAuth connections from database', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([
      {
        id: 'conn-linkedin-001',
        platform: 'linkedin',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        profileId: '123456789',
        profileName: 'John Doe',
        profileUsername: 'johndoe',
        profileUrl: 'https://linkedin.com/in/johndoe',
        scopes: 'r_liteprofile w_member_social',
        connectedAt: new Date('2024-01-15T10:30:00Z'),
        expiresAt: new Date('2024-02-15T10:30:00Z'),
        status: 'active'
      }
    ]);
    (createPrismaClient as jest.Mock).mockReturnValue({
      oauthConnection: { findMany: mockFindMany }
    });

    const res = await request(app)
      .get('/api/oauth/connections/123e4567-e89b-12d3-a456-426614174000')
      .set('Authorization', 'Bearer test-jwt-token')
      .expect(200);

    expect(mockFindMany).toHaveBeenCalled();
    expect(res.body.data.connections[0]).toMatchObject({
      connectionId: 'conn-linkedin-001',
      platform: 'linkedin',
      profile: {
        id: '123456789',
        name: 'John Doe',
        username: 'johndoe',
        profileUrl: 'https://linkedin.com/in/johndoe'
      },
      scopes: ['r_liteprofile', 'w_member_social'],
      status: 'active'
    });
  });

  it('should refresh expired token when retrieving connection', async () => {
    const mockFindFirst = jest.fn().mockResolvedValue({
      id: 'conn1',
      platform: 'linkedin',
      workspaceId: '123e4567-e89b-12d3-a456-426614174000',
      accessToken: 'old_token',
      refreshToken: 'refresh_token',
      expiresAt: new Date(Date.now() - 1000),
      profileId: '123',
      profileName: 'Jane',
      profileUsername: 'jane',
      profileUrl: 'https://linkedin.com/in/jane',
      scopes: 'r_liteprofile',
      status: 'active'
    });
    const mockUpdate = jest.fn().mockResolvedValue({});
    (createPrismaClient as jest.Mock).mockReturnValue({
      oauthConnection: { findFirst: mockFindFirst, update: mockUpdate }
    });
    (axios.post as jest.Mock).mockResolvedValue({
      data: { access_token: 'new_token', expires_in: 3600 }
    });

    const connection = await getOAuthConnection(
      'conn1',
      '123e4567-e89b-12d3-a456-426614174000'
    );

    expect(axios.post).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
    expect(connection?.accessToken).toBe('new_token');
  });
});
