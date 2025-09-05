import { describe, it, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { listWorkspaces } from '../src/main';

describe('Authentication middleware', () => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  const validToken = jwt.sign({ sub: 'user1', tenantId: 'tenant1' }, secret);

  it('rejects requests without authorization header', async () => {
    await expect(listWorkspaces({ tenantId: 'tenant1' })).rejects.toEqual({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header'
    });
  });

  it('rejects requests with tenant mismatch', async () => {
    await expect(
      listWorkspaces({ tenantId: 'other-tenant', headers: { authorization: `Bearer ${validToken}` } })
    ).rejects.toEqual({ code: 'FORBIDDEN', message: 'Tenant mismatch' });
  });

  it('allows requests with valid token and tenant', async () => {
    const response = await listWorkspaces({
      tenantId: 'tenant1',
      headers: { authorization: `Bearer ${validToken}` }
    });
    expect(response).toEqual({ workspaces: [] });
  });
});
