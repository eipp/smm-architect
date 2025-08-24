import { VaultClient, VaultClientConfig } from '../../shared/vault-client';
import { AuthenticationService } from '../../shared/auth-service';

export interface VaultConfig {
  endpoint: string;
  token: string;
  namespace?: string;
  tokenPath?: string;
}

export interface TokenPolicy {
  agentType: string;
  workspaceId: string;
  policies: string[];
  ttl: string;
  metadata: Record<string, string>;
}

/**
 * VaultTokenIssuer - Issues scoped ephemeral tokens for agent execution
 * Integrates with HashiCorp Vault for secure token management
 */
export class VaultTokenIssuer {
  private authService: AuthenticationService;
  private vaultClient: VaultClient;

  constructor(config: VaultConfig) {
    const vaultConfig: VaultClientConfig = {
      address: config.endpoint,
      token: config.token,
      namespace: config.namespace,
      timeout: 30000,
      retries: 3
    };

    this.vaultClient = new VaultClient(vaultConfig);
    this.authService = new AuthenticationService(vaultConfig, {
      secret: process.env.JWT_SECRET || 'dev-secret',
      issuer: 'smm-architect',
      audience: 'smm-architect-agents'
    });
  }

  /**
   * Issue a scoped token for agent execution
   */
  async issueAgentToken(agentType: string, workspaceId: string, executionId?: string): Promise<string> {
    try {
      return await this.authService.createAgentToken({
        agentType,
        workspaceId,
        executionId,
        ttl: '2h',
        agentInstanceId: `instance-${Date.now()}`
      });
    } catch (error) {
      throw new Error(`Failed to issue agent token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Revoke a token when agent execution completes
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await this.authService.revokeToken(token);
      console.log('✓ Revoked agent token');
    } catch (error) {
      console.error('Failed to revoke token:', error instanceof Error ? error.message : String(error));
      // Don't throw - token will expire naturally
    }
  }

  /**
   * Lookup token information for validation
   */
  async lookupToken(token: string): Promise<{
    agentType?: string;
    workspaceId?: string;
    policies: string[];
    ttl: number;
    renewable: boolean;
  }> {
    try {
      const tokenInfo = await this.vaultClient.lookupToken(token);
      
      return {
        agentType: tokenInfo.meta?.agent_type,
        workspaceId: tokenInfo.meta?.workspace_id,
        policies: tokenInfo.policies || [],
        ttl: tokenInfo.ttl || 0,
        renewable: tokenInfo.renewable || false
      };
    } catch (error) {
      throw new Error(`Failed to lookup token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create agent-specific policies in Vault
   */
  async createAgentPolicies(agentType: string, workspaceId: string): Promise<void> {
    const policyName = `agent-${agentType}-${workspaceId}`;
    
    // Define HCL policy for this agent type and workspace
    const policyRules = this.generatePolicyRules(agentType, workspaceId);
    
    try {
      await this.vaultClient.writePolicy(policyName, policyRules);
      console.log(`✓ Created policy: ${policyName}`);
    } catch (error) {
      throw new Error(`Failed to create agent policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List active agent tokens for a workspace
   */
  async listWorkspaceTokens(workspaceId: string): Promise<Array<{
    accessor: string;
    agentType: string;
    displayName: string;
    creationTime: string;
    ttl: number;
  }>> {
    try {
      return await this.authService.listWorkspaceTokens(workspaceId);
    } catch (error) {
      throw new Error(`Failed to list workspace tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Revoke all tokens for a workspace (emergency cleanup)
   */
  async revokeWorkspaceTokens(workspaceId: string): Promise<number> {
    const tokens = await this.listWorkspaceTokens(workspaceId);
    let revokedCount = 0;
    
    for (const token of tokens) {
      try {
        await this.vaultClient.revokeToken(token.accessor);
        revokedCount++;
      } catch (error) {
        console.error(`Failed to revoke token ${token.accessor}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    return revokedCount;
  }

  /**
   * Get health status of Vault integration
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    authenticated: boolean;
    version?: string;
  }> {
    try {
      const health = await this.authService.getHealthStatus();
      return {
        connected: health.vault.connected,
        authenticated: await this.vaultClient.isAuthenticated(),
        version: health.vault.version
      };
    } catch (error) {
      return {
        connected: false,
        authenticated: false
      };
    }
  }

  // Private helper methods

  private generateAgentPolicies(agentType: string, workspaceId: string): string[] {
    const basePolicy = 'default';
    const agentPolicy = `agent-${agentType}`;
    const workspacePolicy = `workspace-${workspaceId}`;
    
    return [basePolicy, agentPolicy, workspacePolicy];
  }

  private generatePolicyRules(agentType: string, workspaceId: string): string {
    // Generate HCL policy rules based on agent type and workspace
    const rules = [
      '# Agent execution policy',
      `# Generated for agent: ${agentType}, workspace: ${workspaceId}`,
      '',
      '# Allow reading workspace secrets',
      `path "secret/data/workspaces/${workspaceId}/*" {`,
      '  capabilities = ["read"]',
      '}',
      '',
      '# Allow reading agent configuration',
      `path "secret/data/agents/${agentType}/*" {`,
      '  capabilities = ["read"]',
      '}',
    ];

    // Add agent-specific permissions
    switch (agentType) {
      case 'research':
        rules.push(
          '',
          '# Research agent - ToolHub access',
          'path "secret/data/toolhub/api-keys/*" {',
          '  capabilities = ["read"]',
          '}',
          '',
          '# Research agent - external API keys',
          'path "secret/data/external-apis/*" {',
          '  capabilities = ["read"]',
          '}'
        );
        break;
        
      case 'publisher':
        rules.push(
          '',
          '# Publisher agent - social media tokens',
          `path "secret/data/connectors/${workspaceId}/*" {`,
          '  capabilities = ["read", "update"]',
          '}'
        );
        break;
        
      case 'creative':
        rules.push(
          '',
          '# Creative agent - asset generation keys',
          'path "secret/data/creative/api-keys/*" {',
          '  capabilities = ["read"]',
          '}'
        );
        break;
    }

    return rules.join('\n');
  }

  /**
   * Create mock token issuer for development/testing
   */
  static createMockIssuer(): VaultTokenIssuer {
    const mockConfig = {
      endpoint: 'http://localhost:8200',
      token: 'mock-vault-token'
    };

    const issuer = new VaultTokenIssuer(mockConfig);
    
    // Override the auth service with a mock implementation
    (issuer as any).authService = {
      async initialize() { return Promise.resolve(); },
      async createAgentToken(options: any) {
        return `mock-token-${Date.now()}-${options.agentType}`;
      },
      async revokeToken(token: string) {
        return Promise.resolve();
      },
      async listWorkspaceTokens(workspaceId: string) {
        return [
          {
            accessor: 'accessor1',
            agentType: 'research',
            displayName: 'agent-research-test',
            creationTime: new Date().toISOString(),
            ttl: 7200,
            metadata: { workspace_id: workspaceId }
          }
        ];
      },
      async getHealthStatus() {
        return {
          vault: { connected: true, sealed: false, version: 'mock' },
          jwt: { algorithm: 'HS256', issuer: 'mock' }
        };
      }
    };

    (issuer as any).vaultClient = {
      async lookupToken(token: string) {
        return {
          policies: ['default', 'agent-research'],
          ttl: 7200,
          renewable: false,
          meta: {
            agent_type: 'research',
            workspace_id: 'ws-test-001'
          }
        };
      },
      async writePolicy(name: string, policy: string) {
        return Promise.resolve();
      },
      async revokeToken(token: string) {
        return Promise.resolve();
      },
      async isAuthenticated() {
        return true;
      }
    };

    return issuer;
  }
}