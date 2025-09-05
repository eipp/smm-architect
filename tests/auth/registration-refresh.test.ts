const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/smm_architect_test';
const TENANT_ID = 'test-tenant';

process.env.DATABASE_URL = TEST_DB_URL;
process.env.JWT_SECRET = 'ThisIsAHighlySecureSecretKeyWithSufficientLength123!';

const authApi = require('../../services/smm-architect/src/auth-api');
const { withTenantContext } = require('../../services/shared/database/client');
const { register, refresh } = authApi;

beforeEach(async () => {
  await withTenantContext(TENANT_ID, async (client: any) => {
    await client.userSession.deleteMany({});
    await client.user.deleteMany({});
  });
});

describe('Registration and token refresh', () => {
  it('registers user with hashed password', async () => {
    await register({
      email: 'test@example.com',
      password: 'StrongPass1',
      name: 'Test User',
      tenantId: TENANT_ID
    });

    const user = await withTenantContext(TENANT_ID, (client: any) =>
      client.user.findUnique({ where: { email: 'test@example.com' } })
    );

    expect(user).toBeDefined();
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe('StrongPass1');
  });

  it('refreshes token and revokes old refresh token', async () => {
    const { id: userId } = await (authApi as any).createUserAccount({
      email: 'refresh@example.com',
      password: 'StrongPass1',
      name: 'Refresh User',
      tenantId: TENANT_ID
    });

    const oldToken = await (authApi as any).generateRefreshToken(userId, TENANT_ID);
    const response = await refresh({ refreshToken: oldToken });

    expect(response.refreshToken).toBeDefined();
    expect(response.refreshToken).not.toBe(oldToken);

    const oldValidation = await (authApi as any).validateRefreshToken(oldToken);
    expect(oldValidation).toBeNull();
  });
});

