import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface AgentJobRequest {
  workspaceId: string;
  tenantId: string;
  agentType: string;
  agentVersion?: string;
  input: any;
  blueprint?: AgentBlueprint;
  timeout?: number;
  correlationId?: string;
  createdBy: string;
}

export interface AgentJobResponse {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  outputs?: any;
  errorMessage?: string;
  modelUsage?: ModelUsage[];
  qualityScore?: number;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface ModelUsage {
  modelId: string;
  provider: string;
  promptHash: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  costEstimateUsd: number;
  timestamp: string;
  requestId?: string;
}

export interface AgentBlueprint {
  agentId: string;
  role: string;
  displayName: string;
  systemPrompt: string;
  version: string;
  tools: string[];
  outputs: {
    primary: {
      type: string;
      schema?: string;
    };
    secondary?: {
      type: string;
      format?: string;
    };
  };
  configuration: {
    runTTLSeconds: number;
    costEstimateTokens: number;
    maxConcurrentSources?: number;
    minFactsRequired?: number;
  };
}

export interface VaultTokenIssuer {
  issueAgentToken(agentType: string, workspaceId: string): Promise<string>;
  revokeToken(token: string): Promise<void>;
}

export interface ModelRouter {
  generateCompletion(request: {
    model: string;
    messages: any[];
    tools?: any[];
    temperature?: number;
    maxTokens?: number;
    token: string;
  }): Promise<{
    response: any;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    requestId: string;
  }>;
}

export interface ToolHubClient {
  ingestSource(url: string, sourceType: string, workspaceId: string, token: string): Promise<{ sourceId: string }>;
  vectorSearch(query: string, workspaceId: string, topK: number, token: string): Promise<any[]>;
  storeOutput(output: any, outputType: string, workspaceId: string, token: string): Promise<{ outputId: string }>;
}

/**
 * AgentExecutor - Orchestrates agent execution with proper token management,
 * model usage tracking, and output storage
 */
export class AgentExecutor {
  private vaultTokenIssuer: VaultTokenIssuer;
  private modelRouter: ModelRouter;
  private toolHubClient: ToolHubClient;
  private activeJobs: Map<string, AgentJobExecution> = new Map();

  constructor(
    vaultTokenIssuer: VaultTokenIssuer,
    modelRouter: ModelRouter,
    toolHubClient: ToolHubClient
  ) {
    this.vaultTokenIssuer = vaultTokenIssuer;
    this.modelRouter = modelRouter;
    this.toolHubClient = toolHubClient;
  }

  /**
   * Execute an agent job with full lifecycle management
   */
  async executeJob(request: AgentJobRequest): Promise<AgentJobResponse> {
    const jobId = `job-${request.agentType}-${uuidv4()}`;
    const startTime = Date.now();

    try {
      // Create job execution context
      const execution = new AgentJobExecution(
        jobId,
        request,
        this.vaultTokenIssuer,
        this.modelRouter,
        this.toolHubClient
      );

      // Track active job
      this.activeJobs.set(jobId, execution);

      // Store job in database
      await this.storeJobRecord(jobId, request, 'pending');

      // Issue scoped Vault token
      const vaultToken = await this.vaultTokenIssuer.issueAgentToken(
        request.agentType,
        request.workspaceId
      );

      // Update job status
      await this.updateJobStatus(jobId, 'running', { startedAt: new Date().toISOString() });

      // Execute the agent
      const result = await execution.execute(vaultToken);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Update job completion
      await this.updateJobStatus(jobId, 'completed', {
        completedAt: new Date().toISOString(),
        duration_ms: duration,
        output_data: result.outputs,
        model_usage: result.modelUsage,
        quality_score: result.qualityScore
      });

      // Clean up
      this.activeJobs.delete(jobId);
      await this.vaultTokenIssuer.revokeToken(vaultToken);

      return {
        jobId,
        status: 'completed',
        outputs: result.outputs,
        modelUsage: result.modelUsage,
        qualityScore: result.qualityScore,
        duration,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      // Handle execution error
      const duration = Date.now() - startTime;
      
      await this.updateJobStatus(jobId, 'failed', {
        completedAt: new Date().toISOString(),
        duration_ms: duration,
        error_message: error.message
      });

      this.activeJobs.delete(jobId);

      return {
        jobId,
        status: 'failed',
        errorMessage: error.message,
        duration,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get status of a running job
   */
  async getJobStatus(jobId: string): Promise<AgentJobResponse | null> {
    const job = await this.getJobRecord(jobId);
    if (!job) return null;

    return {
      jobId: job.job_id,
      status: job.status,
      outputs: job.output_data,
      errorMessage: job.error_message,
      modelUsage: job.model_usage,
      qualityScore: job.quality_score,
      duration: job.duration_ms,
      startedAt: job.started_at,
      completedAt: job.completed_at
    };
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const execution = this.activeJobs.get(jobId);
    if (execution) {
      await execution.cancel();
      this.activeJobs.delete(jobId);
      
      await this.updateJobStatus(jobId, 'cancelled', {
        completedAt: new Date().toISOString()
      });
      
      return true;
    }
    return false;
  }

  /**
   * List active jobs
   */
  getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys());
  }

  /**
   * Get job execution metrics
   */
  async getJobMetrics(workspaceId: string, timeRange: { start: Date; end: Date }): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageDuration: number;
    totalCost: number;
    modelUsageBreakdown: Record<string, number>;
  }> {
    // This would query the database for metrics
    // Mock implementation for now
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageDuration: 0,
      totalCost: 0,
      modelUsageBreakdown: {}
    };
  }

  // Private helper methods for database operations
  private async storeJobRecord(jobId: string, request: AgentJobRequest, status: string): Promise<void> {
    // Mock implementation - would use actual database connection
    console.log(`Storing job record: ${jobId} with status: ${status}`);
  }

  private async updateJobStatus(jobId: string, status: string, updates: any): Promise<void> {
    // Mock implementation - would update database record
    console.log(`Updating job ${jobId} status to: ${status}`, updates);
  }

  private async getJobRecord(jobId: string): Promise<any> {
    // Mock implementation - would query database
    return null;
  }
}

/**
 * AgentJobExecution - Handles the actual execution of a single agent job
 */
class AgentJobExecution {
  private jobId: string;
  private request: AgentJobRequest;
  private vaultTokenIssuer: VaultTokenIssuer;
  private modelRouter: ModelRouter;
  private toolHubClient: ToolHubClient;
  private modelUsage: ModelUsage[] = [];
  private cancelled = false;

  constructor(
    jobId: string,
    request: AgentJobRequest,
    vaultTokenIssuer: VaultTokenIssuer,
    modelRouter: ModelRouter,
    toolHubClient: ToolHubClient
  ) {
    this.jobId = jobId;
    this.request = request;
    this.vaultTokenIssuer = vaultTokenIssuer;
    this.modelRouter = modelRouter;
    this.toolHubClient = toolHubClient;
  }

  async execute(vaultToken: string): Promise<{
    outputs: any;
    modelUsage: ModelUsage[];
    qualityScore: number;
  }> {
    if (this.cancelled) {
      throw new Error('Job was cancelled');
    }

    // Load agent blueprint
    const blueprint = this.request.blueprint || await this.loadAgentBlueprint(this.request.agentType);

    // Execute agent logic based on type
    switch (this.request.agentType) {
      case 'research':
        return await this.executeResearchAgent(blueprint, vaultToken);
      case 'planner':
        return await this.executePlannerAgent(blueprint, vaultToken);
      case 'creative':
        return await this.executeCreativeAgent(blueprint, vaultToken);
      default:
        throw new Error(`Unsupported agent type: ${this.request.agentType}`);
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  private async executeResearchAgent(blueprint: AgentBlueprint, token: string): Promise<any> {
    const { input } = this.request;

    // Step 1: Ingest sources
    const sources = input.sources || [input.domain];
    const sourceIds = [];

    for (const source of sources) {
      if (this.cancelled) throw new Error('Job cancelled');

      const result = await this.toolHubClient.ingestSource(
        source,
        'website',
        this.request.workspaceId,
        token
      );
      sourceIds.push(result.sourceId);
    }

    // Step 2: Generate brand research using LLM
    const researchPrompt = this.buildResearchPrompt(blueprint, input, sourceIds);
    const completion = await this.callModelRouter(researchPrompt, token);

    // Step 3: Extract structured output
    const brandTwin = this.parseResearchOutput(completion.response);

    // Step 4: Store output to ToolHub
    const outputResult = await this.toolHubClient.storeOutput(
      brandTwin,
      'BrandTwin',
      this.request.workspaceId,
      token
    );

    return {
      outputs: {
        brandTwin,
        outputId: outputResult.outputId,
        sourceIds
      },
      modelUsage: this.modelUsage,
      qualityScore: this.calculateQualityScore(brandTwin)
    };
  }

  private async executePlannerAgent(blueprint: AgentBlueprint, token: string): Promise<any> {
    // Mock implementation for planner agent
    const planningPrompt = this.buildPlanningPrompt(blueprint, this.request.input);
    const completion = await this.callModelRouter(planningPrompt, token);

    const campaignPlan = this.parsePlanningOutput(completion.response);

    return {
      outputs: { campaignPlan },
      modelUsage: this.modelUsage,
      qualityScore: 0.8
    };
  }

  private async executeCreativeAgent(blueprint: AgentBlueprint, token: string): Promise<any> {
    // Mock implementation for creative agent
    const creativePrompt = this.buildCreativePrompt(blueprint, this.request.input);
    const completion = await this.callModelRouter(creativePrompt, token);

    const contentAssets = this.parseCreativeOutput(completion.response);

    return {
      outputs: { contentAssets },
      modelUsage: this.modelUsage,
      qualityScore: 0.85
    };
  }

  private async callModelRouter(
    messages: any[],
    token: string,
    model: string = 'gpt-4'
  ): Promise<any> {
    const response = await this.modelRouter.generateCompletion({
      model,
      messages,
      temperature: 0.1,
      maxTokens: 2000,
      token
    });

    // Track model usage
    const usage: ModelUsage = {
      modelId: response.model,
      provider: 'openai', // Would be determined by model router
      promptHash: this.hashPrompt(messages),
      totalTokens: response.usage.totalTokens,
      inputTokens: response.usage.promptTokens,
      outputTokens: response.usage.completionTokens,
      costEstimateUsd: this.estimateCost(response.usage.totalTokens, response.model),
      timestamp: new Date().toISOString(),
      requestId: response.requestId
    };

    this.modelUsage.push(usage);
    return response;
  }

  private async loadAgentBlueprint(agentType: string): Promise<AgentBlueprint> {
    // Load blueprint from filesystem or configuration
    // Mock implementation
    return {
      agentId: `${agentType}-agent-v1`,
      role: agentType,
      displayName: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`,
      systemPrompt: `You are a ${agentType} agent for SMM Architect.`,
      version: '1.0.0',
      tools: ['toolhub.ingestSource', 'toolhub.vectorSearch'],
      outputs: {
        primary: { type: 'Object' }
      },
      configuration: {
        runTTLSeconds: 3600,
        costEstimateTokens: 2000
      }
    };
  }

  private buildResearchPrompt(blueprint: AgentBlueprint, input: any, sourceIds: string[]): any[] {
    return [
      {
        role: 'system',
        content: blueprint.systemPrompt
      },
      {
        role: 'user',
        content: `Research the brand for domain: ${input.domain}. Sources ingested: ${sourceIds.join(', ')}. 
        Please create a comprehensive BrandTwin profile including:
        - Brand facts with citations
        - Voice and tone analysis  
        - Competitor analysis
        - Target audience insights
        
        Return the response as valid JSON following the BrandTwin schema.`
      }
    ];
  }

  private buildPlanningPrompt(blueprint: AgentBlueprint, input: any): any[] {
    return [
      {
        role: 'system',
        content: blueprint.systemPrompt
      },
      {
        role: 'user',
        content: `Create a social media campaign plan based on the brand research and goals: ${JSON.stringify(input)}`
      }
    ];
  }

  private buildCreativePrompt(blueprint: AgentBlueprint, input: any): any[] {
    return [
      {
        role: 'system',
        content: blueprint.systemPrompt
      },
      {
        role: 'user',
        content: `Generate creative content assets for the campaign: ${JSON.stringify(input)}`
      }
    ];
  }

  private parseResearchOutput(response: any): any {
    // Parse LLM response into structured BrandTwin format
    try {
      return typeof response === 'string' ? JSON.parse(response) : response;
    } catch {
      return {
        brandId: this.request.workspaceId,
        facts: [],
        voiceTone: { primaryTone: 'professional', description: 'Default analysis' },
        competitors: [],
        metadata: { ingestedBy: 'research-agent-v1' }
      };
    }
  }

  private parsePlanningOutput(response: any): any {
    // Parse planning response
    return { plan: response, generatedAt: new Date().toISOString() };
  }

  private parseCreativeOutput(response: any): any {
    // Parse creative response
    return { content: response, generatedAt: new Date().toISOString() };
  }

  private calculateQualityScore(output: any): number {
    // Calculate quality score based on output completeness
    if (!output) return 0;
    
    let score = 0.5; // Base score
    
    if (output.facts && output.facts.length > 0) score += 0.2;
    if (output.voiceTone && output.voiceTone.description) score += 0.2;
    if (output.competitors && output.competitors.length > 0) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private hashPrompt(messages: any[]): string {
    const crypto = require('crypto');
    const content = JSON.stringify(messages);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private estimateCost(tokens: number, model: string): number {
    // Rough cost estimation (would use actual pricing)
    const costPerToken = model.includes('gpt-4') ? 0.00003 : 0.000002;
    return tokens * costPerToken;
  }
}