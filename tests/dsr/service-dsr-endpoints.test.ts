import request from 'supertest';

// Ensure JWT secret for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_very_long_for_jwt_validation_123456';

// Mock native modules that require compilation
jest.mock('sharp', () => () => ({ resize: () => ({ toBuffer: async () => Buffer.from('') }) }), { virtual: true });
jest.mock('../services/shared/sentry-utils', () => ({ initializeSentry: () => ({}) }), { virtual: true });
jest.mock('../../services/audit/src/config/sentry', () => ({}), { virtual: true });
jest.mock('../../services/shared/middleware/auth-middleware', () => ({
  authMiddleware: () => (_req: any, _res: any, next: any) => next(),
  requirePermissions: () => (_req: any, _res: any, next: any) => next()
}), { virtual: true });

// Import token generators
import jwt from 'jsonwebtoken';

// Import service apps
import publisherApp from '../../services/publisher/src/server';
import auditApp from '../../services/audit/src/server';

const jwtSecret = process.env.JWT_SECRET as string;

function signToken(payload: any) {
  return jwt.sign(payload, jwtSecret);
}

describe('DSR endpoint compliance across services', () => {
  const publisherToken = signToken({
    userId: 'tester',
    workspaceId: 'workspace-1',
    scopes: ['admin', 'dsr:access', 'dsr:delete', 'dsr:export']
  });

  const auditToken = signToken({
    userId: 'tester',
    tenantId: 'tenant-1',
    email: 'tester@example.com',
    roles: ['admin'],
    permissions: ['dsr:access', 'dsr:delete', 'dsr:export']
  });

  it('publisher service exposes DSR endpoints', async () => {
    const headers = { Authorization: `Bearer ${publisherToken}` };
    await request(publisherApp).get('/api/publish/dsr/data/test-user').set(headers).expect(200);
    await request(publisherApp).get('/api/publish/dsr/data/test-user/export').set(headers).expect(200);
    await request(publisherApp).delete('/api/publish/dsr/data/test-user').set(headers).expect(200);
  });

  it('audit service exposes DSR endpoints', async () => {
    const headers = { Authorization: `Bearer ${auditToken}` };
    await request(auditApp).get('/api/dsr/data/test-user').set(headers).expect(200);
    await request(auditApp).get('/api/dsr/data/test-user/export').set(headers).expect(200);
    await request(auditApp).delete('/api/dsr/data/test-user').set(headers).expect(200);
  });
});
