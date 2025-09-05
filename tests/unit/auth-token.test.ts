import { SimpleAuthService } from '../../services/smm-architect/src/auth-api';

const TEST_SECRET = 'test_secret_key_with_sufficient_length_1234567890';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('SimpleAuthService JWT handling', () => {
  let service: SimpleAuthService;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    service = new SimpleAuthService();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('generates tokens with expiry claims', async () => {
    const token = await service.generateToken({ userId: 'user1', tenantId: 'tenant1' }, '1h');
    const decoded = await service.verifyToken(token) as any;
    expect(decoded.userId).toBe('user1');
    expect(decoded.tenantId).toBe('tenant1');
    expect(decoded.exp).toBeDefined();
  });

  it('rejects expired tokens', async () => {
    const token = await service.generateToken({ userId: 'user1', tenantId: 'tenant1' }, '1s');
    await delay(1100);
    await expect(service.verifyToken(token)).rejects.toThrow('Token expired');
  });

  it('rejects tokens with invalid signature', async () => {
    const token = await service.generateToken({ userId: 'user1', tenantId: 'tenant1' }, '1h');
    process.env.JWT_SECRET = TEST_SECRET + '_other';
    const otherService = new SimpleAuthService();
    await expect(otherService.verifyToken(token)).rejects.toThrow('Invalid token');
  });
});
