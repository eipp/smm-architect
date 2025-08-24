import { VaultClient } from '../../../shared/vault-client';
import { AuthenticationService } from '../../../shared/auth-service';
import { VaultKMSAdapter } from '../../audit/src/kms/adapters/vault';
import { VaultTokenIssuer } from '../../agents/src/vault-token-issuer';

describe('Vault Integration Tests', () => {
  let vaultClient: VaultClient;
  let authService: AuthenticationService;
  let kmsAdapter: VaultKMSAdapter;
  let tokenIssuer: VaultTokenIssuer;

  const vaultConfig = {
    address: process.env.VAULT_URL || 'http://localhost:8200',
    token: process.env.VAULT_DEV_ROOT_TOKEN_ID || 'dev-only-token'
  };

  beforeAll(async () => {
    // Skip tests if Vault is not available
    if (process.env.SKIP_VAULT_TESTS === 'true') {
      return;
    }

    // Initialize Vault client
    vaultClient = new VaultClient(vaultConfig);
    
    try {
      await vaultClient.initialize();
    } catch (error) {
      console.log('Skipping Vault tests - Vault not available:', error.message);
      return;
    }

    // Initialize authentication service
    authService = new AuthenticationService(vaultConfig, {
      secret: 'test-jwt-secret',
      issuer: 'test-issuer',
      audience: 'test-audience'
    });
    await authService.initialize();

    // Initialize KMS adapter
    kmsAdapter = new VaultKMSAdapter({
      vaultUrl: vaultConfig.address,
      vaultToken: vaultConfig.token,
      transitMount: 'transit',
      keyPrefix: 'test'
    });
    await kmsAdapter.initialize();

    // Initialize token issuer
    tokenIssuer = new VaultTokenIssuer({
      endpoint: vaultConfig.address,
      token: vaultConfig.token
    });
    await tokenIssuer.initialize();
  });

  describe('VaultClient', () => {
    it('should connect to Vault and verify health', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const health = await vaultClient.getHealth();
      
      expect(health.initialized).toBe(true);
      expect(health.sealed).toBe(false);
      expect(health.version).toBeDefined();
    });

    it('should authenticate and lookup self', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const tokenInfo = await vaultClient.lookupSelf();
      
      expect(tokenInfo.id).toBeDefined();
      expect(tokenInfo.policies).toContain('root');
      expect(tokenInfo.ttl).toBeGreaterThan(0);
    });

    it('should manage KV secrets', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const testPath = 'test/integration/secret';
      const testData = {
        key1: 'value1',
        key2: 'value2',
        timestamp: new Date().toISOString()
      };

      // Write secret
      await vaultClient.writeKVSecret(testPath, testData);

      // Read secret
      const retrievedData = await vaultClient.readKVSecret(testPath);
      
      expect(retrievedData).toEqual(testData);

      // Delete secret
      await vaultClient.deleteKVSecret(testPath);

      // Verify deletion
      const deletedData = await vaultClient.readKVSecret(testPath);
      expect(deletedData).toBeNull();
    });

    it('should manage tokens', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      // Create token
      const auth = await vaultClient.createToken({
        policies: ['default'],
        ttl: '1h',
        renewable: false,
        displayName: 'test-token',
        metadata: {
          test: 'true',
          created_by: 'integration-test'
        }
      });

      expect(auth.client_token).toBeDefined();
      expect(auth.policies).toContain('default');

      // Lookup token
      const tokenInfo = await vaultClient.lookupToken(auth.client_token);
      
      expect(tokenInfo.policies).toContain('default');
      expect(tokenInfo.meta.test).toBe('true');
      expect(tokenInfo.meta.created_by).toBe('integration-test');

      // Revoke token
      await vaultClient.revokeToken(auth.client_token);

      // Verify revocation
      await expect(vaultClient.lookupToken(auth.client_token))
        .rejects.toThrow();
    });
  });

  describe('AuthenticationService', () => {
    it('should create and validate JWT tokens', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const tokenOptions = {
        userId: 'test-user-123',
        workspaceId: 'ws-test-001',
        scopes: ['workspace:read', 'workspace:write'],
        roles: ['user'],
        ttl: '1h'
      };

      // Create JWT token
      const token = await authService.createUserToken(tokenOptions);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Validate token
      const authContext = await authService.validateToken(token);
      
      expect(authContext.userId).toBe(tokenOptions.userId);
      expect(authContext.workspaceId).toBe(tokenOptions.workspaceId);
      expect(authContext.scopes).toEqual(tokenOptions.scopes);
      expect(authContext.roles).toEqual(tokenOptions.roles);
      expect(authContext.tokenType).toBe('user');
    });

    it('should create and validate Vault service tokens', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const tokenOptions = {
        serviceId: 'test-service',
        workspaceId: 'ws-test-001',
        policies: ['default', 'toolhub-access'],
        ttl: '2h'
      };

      // Create service token
      const token = await authService.createServiceToken(tokenOptions);
      
      expect(token).toBeDefined();
      expect(token).toMatch(/^[sh]\.[\w-]+/); // Vault token format

      // Validate token
      const authContext = await authService.validateToken(token);
      
      expect(authContext.userId).toBe(tokenOptions.serviceId);
      expect(authContext.workspaceId).toBe(tokenOptions.workspaceId);
      expect(authContext.tokenType).toBe('service');
      expect(authContext.scopes).toContain('toolhub-access');

      // Clean up
      await authService.revokeToken(token);
    });

    it('should create and validate agent tokens', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const tokenOptions = {
        agentType: 'research',
        workspaceId: 'ws-test-001',
        executionId: 'exec-123',
        ttl: '2h'
      };

      // Create agent token
      const token = await authService.createAgentToken(tokenOptions);
      
      expect(token).toBeDefined();
      expect(token).toMatch(/^[sh]\.[\w-]+/); // Vault token format

      // Validate token
      const authContext = await authService.validateToken(token);
      
      expect(authContext.tokenType).toBe('agent');
      expect(authContext.workspaceId).toBe(tokenOptions.workspaceId);
      expect(authContext.scopes).toContain('ingest:read');

      // Clean up
      await authService.revokeToken(token);
    });

    it('should validate workspace access', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const userContext = {
        userId: 'test-user',
        workspaceId: 'ws-test-001',
        scopes: ['workspace:read'],
        tokenType: 'user' as const,
        roles: ['user']
      };

      // Should have access to own workspace
      const hasAccess = await authService.validateWorkspaceAccess(userContext, 'ws-test-001');
      expect(hasAccess).toBe(true);

      // Should not have access to other workspace
      const noAccess = await authService.validateWorkspaceAccess(userContext, 'ws-other');
      expect(noAccess).toBe(false);

      // Admin should have access to all workspaces
      const adminContext = { ...userContext, roles: ['admin'] };
      const adminAccess = await authService.validateWorkspaceAccess(adminContext, 'ws-other');
      expect(adminAccess).toBe(true);
    });
  });

  describe('VaultKMSAdapter', () => {
    it('should create and list keys', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const keyAlias = `test-key-${Date.now()}`;
      
      // Create key
      const keyId = await kmsAdapter.createKey(keyAlias);
      expect(keyId).toContain(keyAlias);

      // List keys
      const keys = await kmsAdapter.listKeys();
      expect(keys).toContain(keyAlias);

      // Get public key
      const publicKey = await kmsAdapter.getPublicKey(keyAlias);
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('should sign and verify data', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const keyAlias = `sign-test-key-${Date.now()}`;
      const testData = Buffer.from('This is test data to sign', 'utf8');
      
      // Create key for signing
      await kmsAdapter.createKey(keyAlias);

      // Sign data
      const signature = await kmsAdapter.sign(testData, keyAlias);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^vault:v\d+:/); // Vault signature format

      // Verify signature
      const isValid = await kmsAdapter.verify(testData, signature, keyAlias);
      expect(isValid).toBe(true);

      // Verify with wrong data should fail
      const wrongData = Buffer.from('Wrong data', 'utf8');
      const isInvalid = await kmsAdapter.verify(wrongData, signature, keyAlias);
      expect(isInvalid).toBe(false);
    });

    it('should encrypt and decrypt data', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const keyAlias = `encrypt-test-key-${Date.now()}`;
      const testData = Buffer.from('This is secret data to encrypt', 'utf8');
      
      // Create key for encryption
      await kmsAdapter.createKey(keyAlias);

      // Encrypt data
      const ciphertext = await kmsAdapter.encrypt(testData, keyAlias);
      expect(ciphertext).toBeDefined();
      expect(ciphertext).toMatch(/^vault:v\d+:/); // Vault ciphertext format

      // Decrypt data
      const decryptedData = await kmsAdapter.decrypt(ciphertext, keyAlias);
      expect(decryptedData).toEqual(testData);
    });

    it('should provide health status', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const health = await kmsAdapter.getHealthStatus();
      
      expect(health.healthy).toBe(true);
      expect(health.transitEnabled).toBe(true);
      expect(health.keyCount).toBeGreaterThanOrEqual(0);
      expect(health.error).toBeUndefined();
    });
  });

  describe('VaultTokenIssuer', () => {
    it('should issue and lookup agent tokens', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const agentType = 'research';
      const workspaceId = 'ws-test-001';
      
      // Issue token
      const token = await tokenIssuer.issueAgentToken(agentType, workspaceId);
      expect(token).toBeDefined();
      expect(token).toMatch(/^[sh]\.[\w-]+/);

      // Lookup token
      const tokenInfo = await tokenIssuer.lookupToken(token);
      
      expect(tokenInfo.agentType).toBe(agentType);
      expect(tokenInfo.workspaceId).toBe(workspaceId);
      expect(tokenInfo.policies).toContain(`agent-${agentType}`);
      expect(tokenInfo.ttl).toBeGreaterThan(0);

      // Revoke token
      await tokenIssuer.revokeToken(token);
    });

    it('should create agent policies', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const agentType = 'test-agent';
      const workspaceId = 'ws-test-001';
      
      // Create policies
      await tokenIssuer.createAgentPolicies(agentType, workspaceId);

      // Verify policy was created by reading it
      const policyName = `agent-${agentType}-${workspaceId}`;
      const policy = await vaultClient.readPolicy(policyName);
      
      expect(policy).toBeDefined();
      expect(policy).toContain(`workspaces/${workspaceId}`);
      expect(policy).toContain(`agents/${agentType}`);
    });

    it('should list workspace tokens', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const workspaceId = 'ws-test-002';
      
      // Issue a few tokens
      const token1 = await tokenIssuer.issueAgentToken('research', workspaceId);
      const token2 = await tokenIssuer.issueAgentToken('planner', workspaceId);

      // List tokens
      const tokens = await tokenIssuer.listWorkspaceTokens(workspaceId);
      
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      
      const researchToken = tokens.find(t => t.agentType === 'research');
      const plannerToken = tokens.find(t => t.agentType === 'planner');
      
      expect(researchToken).toBeDefined();
      expect(plannerToken).toBeDefined();

      // Clean up
      await tokenIssuer.revokeToken(token1);
      await tokenIssuer.revokeToken(token2);
    });

    it('should get health status', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const health = await tokenIssuer.getHealthStatus();
      
      expect(health.connected).toBe(true);
      expect(health.authenticated).toBe(true);
      expect(health.version).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete agent workflow', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const workspaceId = 'ws-integration-test';
      const agentType = 'research';
      const testSecret = 'test-api-key-12345';
      
      // 1. Store workspace secret
      await vaultClient.writeKVSecret(`workspaces/${workspaceId}/api-keys`, {
        external_api_key: testSecret,
        updated_at: new Date().toISOString()
      });

      // 2. Create agent policies
      await tokenIssuer.createAgentPolicies(agentType, workspaceId);

      // 3. Issue agent token
      const agentToken = await tokenIssuer.issueAgentToken(agentType, workspaceId);

      // 4. Validate token can access workspace secrets
      const tempVault = new VaultClient({
        address: vaultConfig.address,
        token: agentToken
      });

      const secretData = await tempVault.readKVSecret(`workspaces/${workspaceId}/api-keys`);
      expect(secretData.external_api_key).toBe(testSecret);

      // 5. Sign data with agent context
      const keyAlias = `agent-${agentType}-${workspaceId}`;
      await kmsAdapter.createKey(keyAlias);
      
      const testData = Buffer.from(`Agent ${agentType} output for ${workspaceId}`, 'utf8');
      const signature = await kmsAdapter.sign(testData, keyAlias);
      
      expect(signature).toBeDefined();

      // 6. Verify signature
      const isValid = await kmsAdapter.verify(testData, signature, keyAlias);
      expect(isValid).toBe(true);

      // 7. Clean up
      await tokenIssuer.revokeToken(agentToken);
      await vaultClient.deleteKVSecret(`workspaces/${workspaceId}/api-keys`);
    });

    it('should handle authentication service integration', async () => {
      if (process.env.SKIP_VAULT_TESTS === 'true') return;

      const workspaceId = 'ws-auth-test';
      
      // Create user JWT token
      const userToken = await authService.createUserToken({
        userId: 'user-123',
        workspaceId,
        scopes: ['workspace:read', 'workspace:write'],
        roles: ['user']
      });

      // Create service Vault token
      const serviceToken = await authService.createServiceToken({
        serviceId: 'toolhub',
        workspaceId,
        policies: ['toolhub-access', 'default'],
        ttl: '1h'
      });

      // Create agent Vault token
      const agentToken = await authService.createAgentToken({
        agentType: 'research',
        workspaceId,
        ttl: '2h'
      });

      // Validate all tokens
      const userContext = await authService.validateToken(userToken);
      const serviceContext = await authService.validateToken(serviceToken);
      const agentContext = await authService.validateToken(agentToken);

      expect(userContext.tokenType).toBe('user');
      expect(serviceContext.tokenType).toBe('service');
      expect(agentContext.tokenType).toBe('agent');

      // All should have workspace access
      expect(await authService.validateWorkspaceAccess(userContext, workspaceId)).toBe(true);
      expect(await authService.validateWorkspaceAccess(serviceContext, workspaceId)).toBe(true);
      expect(await authService.validateWorkspaceAccess(agentContext, workspaceId)).toBe(true);

      // Clean up Vault tokens
      await authService.revokeToken(serviceToken);
      await authService.revokeToken(agentToken);
    });
  });
});