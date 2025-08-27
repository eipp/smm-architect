import axios from 'axios';

export interface ModelRouterConfig {
  endpoint: string;
  defaultModel?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface CompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  token: string;
}

export interface CompletionResponse {
  response: {
    id: string;
    choices: Array<{
      message: {
        role: string;
        content: string;
        tool_calls?: any[];
      };
      finish_reason: string;
    }>;
    created: number;
    model: string;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  requestId: string;
  provider: string;
  costEstimate?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  };
}

export interface ModelInfo {
  id: string;
  provider: string;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  maxTokens: number;
  supportsFunctionCalling: boolean;
  isAvailable: boolean;
}

/**
 * ModelRouterClient - Integrates with model-router service for LLM calls
 * Handles model selection, usage tracking, and cost estimation
 */
export class ModelRouterClient {
  private endpoint: string;
  private defaultModel: string;
  private timeout: number;
  private retryAttempts: number;

  constructor(config: ModelRouterConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.defaultModel = config.defaultModel || 'gpt-4';
    this.timeout = config.timeout || 60000; // 60 seconds
    this.retryAttempts = config.retryAttempts || 3;
  }

  /**
   * Generate completion using the model router
   */
  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      this.validateCompletionRequest(request);
      
      // Add request metadata
      const enhancedRequest = {
        ...request,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          source: 'smm-architect-agent'
        }
      };

      // Make request with retry logic
      const response = await this.makeRequestWithRetry('POST', '/v1/completions', enhancedRequest, request.token);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Enhance response with cost estimation
      const enhancedResponse: CompletionResponse = {
        ...response,
        costEstimate: await this.calculateCostEstimate(response.usage, response.model),
        requestId: enhancedRequest.metadata.requestId
      };

      console.log(`✓ Model completion: ${response.model}, tokens: ${response.usage.totalTokens}, time: ${responseTime}ms`);
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('Model router completion failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Model completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available models and their capabilities
   */
  async getAvailableModels(token: string): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest('GET', '/v1/models', undefined, token);
      return response.models || [];
    } catch (error) {
      throw new Error(`Failed to get available models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get model information and pricing
   */
  async getModelInfo(modelId: string, token: string): Promise<ModelInfo> {
    try {
      const response = await this.makeRequest('GET', `/v1/models/${modelId}`, undefined, token);
      return response;
    } catch (error) {
      throw new Error(`Failed to get model info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Estimate cost for a completion request before making it
   */
  async estimateCompletionCost(request: Omit<CompletionRequest, 'token'>, token: string): Promise<{
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: number;
    currency: string;
  }> {
    try {
      const estimateRequest = {
        model: request.model,
        messages: request.messages,
        maxTokens: request.maxTokens || 2000
      };

      const response = await this.makeRequest('POST', '/v1/estimate', estimateRequest, token);
      return response;
    } catch (error) {
      // Fallback to simple estimation
      const inputTokens = this.estimateTokens(JSON.stringify(request.messages));
      const outputTokens = request.maxTokens || 1000;
      
      return {
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCost: (inputTokens * 0.00003) + (outputTokens * 0.00006), // Rough GPT-4 pricing
        currency: 'USD'
      };
    }
  }

  /**
   * Stream completion (for real-time agent responses)
   */
  async streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<CompletionResponse> {
    // Streaming implementation would go here
    // For now, fallback to regular completion
    const response = await this.generateCompletion(request);
    
    // Simulate streaming by calling onChunk with the full response
    if (response.response.choices[0]?.message?.content) {
      onChunk(response.response.choices[0].message.content);
    }
    
    return response;
  }

  /**
   * Health check for model router service
   */
  async healthCheck(token: string): Promise<{
    healthy: boolean;
    availableModels: number;
    avgResponseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const response = await this.makeRequest('GET', '/health', undefined, token);
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: response.status === 'healthy',
        availableModels: response.modelCount || 0,
        avgResponseTime: responseTime
      };
    } catch (error) {
      return {
        healthy: false,
        availableModels: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Private helper methods

  private validateCompletionRequest(request: CompletionRequest): void {
    if (!request.model) {
      throw new Error('Model is required');
    }
    
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages are required');
    }
    
    if (!request.token) {
      throw new Error('Authentication token is required');
    }

    // Validate message format
    for (const message of request.messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have role and content');
      }
      
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error('Invalid message role');
      }
    }
  }

  private async makeRequestWithRetry(
    method: string,
    path: string,
    data: any,
    token: string
  ): Promise<any> {
    let lastError: Error = new Error('No attempts made');
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.makeRequest(method, path, data, token);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on authentication or validation errors
        if ((error as any)?.response?.status === 401 || (error as any)?.response?.status === 400) {
          throw lastError;
        }
        
        if (attempt < this.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
          console.log(`Retrying model router request in ${delay}ms (attempt ${attempt}/${this.retryAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  private async makeRequest(
    method: string,
    path: string,
    data?: any,
    token?: string
  ): Promise<any> {
    const url = `${this.endpoint}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: any = {
      method,
      url,
      headers,
      timeout: this.timeout
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  private async calculateCostEstimate(usage: any, model: string): Promise<{
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  }> {
    // Rough pricing estimates (would be fetched from model router)
    const pricing = this.getModelPricing(model);
    
    const inputCost = (usage.promptTokens / 1000) * pricing.inputCostPer1k;
    const outputCost = (usage.completionTokens / 1000) * pricing.outputCostPer1k;
    
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: 'USD'
    };
  }

  private getModelPricing(model: string): { inputCostPer1k: number; outputCostPer1k: number } {
    // Simplified pricing - in production this would come from model router
    const pricing: Record<string, { inputCostPer1k: number; outputCostPer1k: number }> = {
      'gpt-4': { inputCostPer1k: 0.03, outputCostPer1k: 0.06 },
      'gpt-4-turbo': { inputCostPer1k: 0.01, outputCostPer1k: 0.03 },
      'gpt-3.5-turbo': { inputCostPer1k: 0.0015, outputCostPer1k: 0.002 },
      'claude-3-opus': { inputCostPer1k: 0.015, outputCostPer1k: 0.075 },
      'claude-3-sonnet': { inputCostPer1k: 0.003, outputCostPer1k: 0.015 }
    };
    
    return pricing[model] || { inputCostPer1k: 0.03, outputCostPer1k: 0.06 }; // Default to GPT-4 pricing
  }

  private estimateTokens(text: string): number {
    // Rough token estimation (1 token ≈ 4 characters for English)
    return Math.ceil(text.length / 4);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create mock model router for development/testing
   */
  static createMockClient(): ModelRouterClient {
    const client = new ModelRouterClient({
      endpoint: 'http://localhost:3005'
    });

    // Override makeRequest for testing
    (client as any).makeRequest = async (method: string, path: string, data?: any) => {
      if (path === '/v1/completions') {
        return {
          response: {
            id: 'mock_completion_' + Date.now(),
            choices: [{
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  brandId: data.messages[1]?.content?.includes('domain:') ? 
                    data.messages[1].content.split('domain:')[1].split('.')[0] : 'mock-brand',
                  facts: [
                    { fact: 'Mock brand fact', sourceUrl: 'mock-source', confidence: 0.9 }
                  ],
                  voiceTone: { primaryTone: 'professional', description: 'Mock analysis' },
                  competitors: [],
                  metadata: { ingestedBy: 'research-agent-v1', generatedAt: new Date().toISOString() }
                })
              },
              finish_reason: 'stop'
            }],
            created: Math.floor(Date.now() / 1000),
            model: data.model
          },
          usage: {
            promptTokens: 100,
            completionTokens: 200,
            totalTokens: 300
          },
          model: data.model,
          provider: 'openai'
        };
      }
      
      if (path === '/v1/models') {
        return {
          models: [
            {
              id: 'gpt-4',
              provider: 'openai',
              inputCostPer1kTokens: 0.03,
              outputCostPer1kTokens: 0.06,
              maxTokens: 8192,
              supportsFunctionCalling: true,
              isAvailable: true
            }
          ]
        };
      }
      
      if (path === '/health') {
        return {
          status: 'healthy',
          modelCount: 5
        };
      }
      
      return {};
    };

    return client;
  }
}