import nock from 'nock';
import { VaultTokenIssuer } from '../src/vault-token-issuer';

describe('VaultTokenIssuer', () => {
  const vaultUrl = 'http://localhost:8200';
  const vaultToken = 'root-token';
  let issuer: VaultTokenIssuer;

  beforeEach(() => {
    process.env.VAULT_ADDR = vaultUrl;
    process.env.VAULT_TOKEN = vaultToken;
    process.env.AUTH_JWT_SECRET = 'test-secret';
    process.env.AUTH_JWT_ISSUER = 'test-issuer';
    process.env.AUTH_JWT_AUDIENCE = 'test-audience';
    issuer = new VaultTokenIssuer({ endpoint: vaultUrl, token: vaultToken });
  });

  afterEach(() => {
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_TOKEN;
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.AUTH_JWT_ISSUER;
    delete process.env.AUTH_JWT_AUDIENCE;
    nock.cleanAll();
  });

  it('issues an agent token', async () => {
    nock(vaultUrl)
      .post('/v1/auth/token/create')
      .reply(200, {
        auth: {
          client_token: 'agent-token',
          policies: ['default'],
          lease_duration: 7200,
          renewable: false
        }
      });

    const token = await issuer.issueAgentToken('research', 'ws1');
    expect(token).toBe('agent-token');
  });

  it('revokes a token', async () => {
    nock(vaultUrl)
      .post('/v1/auth/token/revoke', { token: 'hvs.agent-token' })
      .reply(200, {});

    await issuer.revokeToken('hvs.agent-token');
    expect(nock.isDone()).toBe(true);
  });

  it('looks up a token', async () => {
    nock(vaultUrl)
      .post('/v1/auth/token/lookup', { token: 'agent-token' })
      .reply(200, {
        data: {
          meta: { agent_type: 'research', workspace_id: 'ws1' },
          policies: ['default'],
          ttl: 3600,
          renewable: false
        }
      });

    const info = await issuer.lookupToken('agent-token');
    expect(info.agentType).toBe('research');
    expect(info.workspaceId).toBe('ws1');
    expect(info.policies).toContain('default');
  });
});
