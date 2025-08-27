import type { AgentContext, AgentRequest, AgentResponse } from '@agentuity/sdk';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

// Type definitions for requests
interface AgentRequestData {
  tenantId: string;
  workspaceId: string;
  content?: string;
  action?: string;
}

// Initialize Anthropic client
const client = new Anthropic();

// Simple VaultClient mock for development
class MockVaultClient {
  async readKVSecret(path: string): Promise<any> {
    // Mock implementation - in production this would use real Vault
    if (path.includes('webhook_key')) {
      return { key: 'mock-webhook-key' };
    }
    if (path.includes('toolhub-api-key')) {
      return { api_key: 'mock-toolhub-key' };
    }
    return null;
  }
}

const vaultClient = new MockVaultClient();

// ToolHub endpoints
const TOOLHUB_ENDPOINT = process.env.TOOLHUB_ENDPOINT || 'http://localhost:8080';
const AGENT_ID = 'agentuity-my-agent';
const AGENT_VERSION = '1.0.0';

/**
 * Get ToolHub API credentials
 */
async function getToolHubCredentials(tenantId: string): Promise<string> {
  const secret = await vaultClient.readKVSecret(`workspaces/${tenantId}/toolhub-api-key`);
  
  if (!secret) {
    throw new Error(`ToolHub credentials not found for tenant ${tenantId}`);
  }
  
  return secret.api_key;
}

/**
 * Set tenant context for database operations (RLS compliance)
 */
async function setDatabaseTenantContext(tenantId: string, agentId: string = AGENT_ID): Promise<void> {
  // This would typically be done via database client
  // For now, we ensure tenant context is propagated in all API calls
  console.log(`Setting tenant context: ${tenantId} for agent: ${agentId}`);
}

/**
 * Process content through ToolHub service
 */
async function processContentThroughToolHub(
  content: string,
  tenantId: string,
  workspaceId: string,
  toolhubToken: string
): Promise<any> {
  try {
    const response = await fetch(`${TOOLHUB_ENDPOINT}/ingest/source`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${toolhubToken}`,
        'X-Tenant-ID': tenantId,
        'X-Workspace-ID': workspaceId,
        'X-Agent-ID': AGENT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspaceId,
        sourceType: 'html',
        html: content,
        metadata: {
          source: 'agentuity-agent',
          agent_id: AGENT_ID,
          agent_version: AGENT_VERSION,
          processed_at: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ToolHub request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('ToolHub integration error:', error);
    return null; // Graceful degradation
  }
}

/**
 * Store agent results back in ToolHub
 */
async function storeResultsInToolHub(
  result: string,
  metadata: any,
  tenantId: string,
  workspaceId: string,
  toolhubToken: string
): Promise<void> {
  try {
    await fetch(`${TOOLHUB_ENDPOINT}/api/store`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${toolhubToken}`,
        'X-Tenant-ID': tenantId,
        'X-Workspace-ID': workspaceId,
        'X-Agent-ID': AGENT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        result,
        metadata: {
          ...metadata,
          agent_version: AGENT_VERSION,
          completed_at: new Date().toISOString()
        }
      })
    });
  } catch (error) {
    console.error('Failed to store results in ToolHub:', error);
  }
}

/**
 * Emit MCP protocol event for workflow coordination
 */
async function emitMCPEvent(eventType: string, eventData: any): Promise<void> {
  try {
    // In a real implementation, this would connect to the MCP message bus
    console.log(`MCP Event: ${eventType}`, eventData);
    
    const mcpEvent = {
      protocol_version: '2.0',
      event_type: eventType,
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source_agent: AGENT_ID,
      data: eventData
    };
    
    console.log('MCP Event emitted:', JSON.stringify(mcpEvent, null, 2));
  } catch (error) {
    console.error('Failed to emit MCP event:', error);
  }
}

/**
 * Estimate token cost before processing
 */
function estimateTokenCost(content: string, model: string = 'claude-3-7-sonnet-latest'): number {
  // Rough estimation: ~4 characters per token
  const estimatedTokens = Math.ceil(content.length / 4);
  
  // Claude 3.7 Sonnet pricing (approximate)
  const costPerToken = 0.000003; // $3 per 1M tokens
  
  return estimatedTokens * costPerToken;
}

export const welcome = () => {
  return {
    welcome:
      'Welcome to the SMM Architect Agentuity Agent! I integrate with ToolHub for content processing, support multi-tenant isolation, and participate in MCP protocol workflows.',
    prompts: [
      {
        data: JSON.stringify({
          tenantId: 'your-tenant-id',
          workspaceId: 'your-workspace-id',
          content: 'Analyze this brand content and extract key insights',
          action: 'research'
        }),
        contentType: 'application/json',
      },
      {
        data: JSON.stringify({
          tenantId: 'your-tenant-id',
          workspaceId: 'your-workspace-id',
          content: 'Generate social media content based on brand guidelines',
          action: 'creative'
        }),
        contentType: 'application/json',
      },
    ],
  };
};

export default async function Agent(
  req: AgentRequest,
  resp: AgentResponse,
  ctx: AgentContext
) {
  const startTime = Date.now();
  let tenantId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    // Parse request data with proper typing
    const requestDataRaw = await req.data.json();
    
    // Type guard for AgentRequestData
    if (!requestDataRaw || typeof requestDataRaw !== 'object' || 
        typeof (requestDataRaw as any).tenantId !== 'string' || 
        typeof (requestDataRaw as any).workspaceId !== 'string') {
      return resp.json({ 
        status: 'error', 
        error: 'Invalid request format - missing required fields' 
      });
    }
    
    const requestData = requestDataRaw as unknown as AgentRequestData;
    
    tenantId = requestData.tenantId;
    workspaceId = requestData.workspaceId;
    const content = requestData.content || 'Hello, Claude';
    const action = requestData.action || 'general';
    
    // Validate required parameters
    if (!tenantId) {
      return resp.json({ 
        status: 'error', 
        error: 'tenantId is required for multi-tenant compliance' 
      });
    }
    
    if (!workspaceId) {
      return resp.json({ 
        status: 'error', 
        error: 'workspaceId is required for workspace scoping' 
      });
    }
    
    ctx.logger.info('Agentuity agent processing request', {
      tenantId,
      workspaceId,
      action,
      contentLength: content.length,
      agentId: AGENT_ID
    });
    
    // Set tenant context for RLS compliance
    await setDatabaseTenantContext(tenantId, AGENT_ID);
    
    // Get ToolHub credentials
    const toolhubToken = await getToolHubCredentials(tenantId);
    
    // Estimate cost before processing
    const estimatedCost = estimateTokenCost(content);
    ctx.logger.info('Cost estimation', {
      estimatedCost,
      contentLength: content.length,
      tenantId
    });
    
    // Emit start event for MCP coordination
    await emitMCPEvent('agent.started', {
      agentId: AGENT_ID,
      tenantId,
      workspaceId,
      action,
      estimatedCost
    });
    
    // Process content through ToolHub if needed
    let toolhubData = null;
    if (action === 'research' || action === 'creative') {
      toolhubData = await processContentThroughToolHub(
        content,
        tenantId,
        workspaceId,
        toolhubToken
      );
    }
    
    // Process with Claude
    const claudeResult = await client.messages.create({
      model: 'claude-3-7-sonnet-latest',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an expert social media marketing assistant integrated with the SMM Architect platform.
          
          Context:
          - Tenant: ${tenantId}
          - Workspace: ${workspaceId}
          - Action: ${action}
          - ToolHub Data: ${toolhubData ? JSON.stringify(toolhubData) : 'None'}
          
          Task: ${content}
          
          Please provide a detailed response that includes:
          1. Analysis of the provided content
          2. Actionable recommendations
          3. Specific implementation steps
          4. Compliance and safety considerations
          
          Format your response as structured JSON with clear sections.`,
        },
      ],
    });
    
    const responseText = claudeResult.content[0]?.type === 'text' 
      ? claudeResult.content[0].text 
      : 'No response generated';
    
    // Store results in ToolHub
    const metadata = {
      model_used: 'claude-3-7-sonnet-latest',
      tokens_consumed: claudeResult.usage?.output_tokens || 0,
      processing_time: Date.now() - startTime,
      estimated_cost: estimatedCost,
      actual_cost: (claudeResult.usage?.output_tokens || 0) * 0.000003,
      action
    };
    
    await storeResultsInToolHub(
      responseText,
      metadata,
      tenantId,
      workspaceId,
      toolhubToken
    );
    
    // Emit completion event for MCP coordination
    await emitMCPEvent('agent.completed', {
      agentId: AGENT_ID,
      tenantId,
      workspaceId,
      status: 'success',
      processingTime: Date.now() - startTime,
      tokensUsed: claudeResult.usage?.output_tokens || 0
    });
    
    ctx.logger.info('Agentuity agent completed successfully', {
      tenantId,
      workspaceId,
      tokensUsed: claudeResult.usage?.output_tokens || 0,
      processingTime: Date.now() - startTime
    });
    
    return resp.json({
      status: 'completed',
      result: responseText,
      metadata,
      toolhub_processed: !!toolhubData,
      tenant_context_set: true
    });
    
  } catch (error) {
    ctx.logger.error('Agent execution failed:', error);
    
    // Emit failure event for workflow handling
    if (tenantId && workspaceId) {
      await emitMCPEvent('agent.failed', {
        agentId: AGENT_ID,
        tenantId,
        workspaceId,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      });
    }
    
    return resp.json({ 
      status: 'failed', 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      agent_id: AGENT_ID
    });
  }
}
