import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { createHash } from 'crypto';
import { Logger } from '../utils/logger';

export class MetricsService {
  private logger: Logger;
  
  // RED Metrics (Rate, Errors, Duration)
  private requestsTotal: Counter<string>;
  private requestDuration: Histogram<string>;
  private errorsTotal: Counter<string>;
  
  // Circuit Breaker Metrics
  private circuitBreakerState: Gauge<string>;
  private circuitBreakerFailures: Counter<string>;
  
  // Endpoint Health Metrics
  private endpointHealth: Gauge<string>;
  private endpointLatency: Histogram<string>;
  
  // Bulkhead Metrics
  private bulkheadPoolUsage: Gauge<string>;
  private bulkheadQueueLength: Gauge<string>;
  
  // Model Router Business Metrics
  private modelRequests: Counter<string>;
  private modelLatency: Histogram<string>;
  private tokenUsage: Counter<string>;
  private costAccumulator: Counter<string>;
  
  // Canary Deployment Metrics
  private canaryRequests: Counter<string>;
  private canaryErrors: Counter<string>;

  constructor() {
    this.logger = new Logger('MetricsService');
    
    // Enable default metrics collection (CPU, memory, etc.)
    collectDefaultMetrics({ prefix: 'model_router_' });
    
    this.initializeMetrics();
    this.logger.info('Prometheus metrics initialized');
  }

  private initializeMetrics(): void {
    // Request metrics (RED pattern)
    this.requestsTotal = new Counter({
      name: 'model_router_requests_total',
      help: 'Total number of requests processed',
      labelNames: ['method', 'route', 'status_code', 'tenant_id_hash']
    });

    this.requestDuration = new Histogram({
      name: 'model_router_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['method', 'route', 'status_code', 'tenant_id_hash'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30]
    });

    this.errorsTotal = new Counter({
      name: 'model_router_errors_total',
      help: 'Total number of errors',
      labelNames: ['method', 'route', 'error_type', 'tenant_id_hash']
    });

    // Circuit breaker metrics
    this.circuitBreakerState = new Gauge({
      name: 'model_router_circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['model_id', 'circuit_breaker_name']
    });

    this.circuitBreakerFailures = new Counter({
      name: 'model_router_circuit_breaker_failures_total',
      help: 'Total circuit breaker failures',
      labelNames: ['model_id', 'circuit_breaker_name']
    });

    // Endpoint health metrics
    this.endpointHealth = new Gauge({
      name: 'model_router_endpoint_health',
      help: 'Endpoint health status (1=healthy, 0=unhealthy)',
      labelNames: ['endpoint_url', 'model_provider']
    });

    this.endpointLatency = new Histogram({
      name: 'model_router_endpoint_latency_seconds',
      help: 'Endpoint response latency in seconds',
      labelNames: ['endpoint_url', 'model_provider'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10]
    });

    // Bulkhead metrics
    this.bulkheadPoolUsage = new Gauge({
      name: 'model_router_bulkhead_pool_usage',
      help: 'Current bulkhead pool usage',
      labelNames: ['pool_name']
    });

    this.bulkheadQueueLength = new Gauge({
      name: 'model_router_bulkhead_queue_length',
      help: 'Current bulkhead queue length',
      labelNames: ['pool_name']
    });

    // Model router business metrics
    this.modelRequests = new Counter({
      name: 'model_router_model_requests_total',
      help: 'Total requests per model',
      labelNames: ['model_id', 'model_provider', 'agent_type', 'tenant_id_hash']
    });

    this.modelLatency = new Histogram({
      name: 'model_router_model_latency_seconds',
      help: 'Model response latency in seconds',
      labelNames: ['model_id', 'model_provider', 'agent_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.tokenUsage = new Counter({
      name: 'model_router_tokens_total',
      help: 'Total tokens consumed',
      labelNames: ['model_id', 'token_type', 'tenant_id_hash'] // token_type: prompt, completion, total
    });

    this.costAccumulator = new Counter({
      name: 'model_router_cost_usd_total',
      help: 'Total cost in USD',
      labelNames: ['model_id', 'model_provider', 'tenant_id_hash']
    });

    // Canary deployment metrics
    this.canaryRequests = new Counter({
      name: 'model_router_canary_requests_total',
      help: 'Total canary deployment requests',
      labelNames: ['deployment_id', 'is_canary', 'model_id']
    });

    this.canaryErrors = new Counter({
      name: 'model_router_canary_errors_total',
      help: 'Total canary deployment errors',
      labelNames: ['deployment_id', 'is_canary', 'model_id', 'error_type']
    });

    // Register all metrics
    register.registerMetric(this.requestsTotal);
    register.registerMetric(this.requestDuration);
    register.registerMetric(this.errorsTotal);
    register.registerMetric(this.circuitBreakerState);
    register.registerMetric(this.circuitBreakerFailures);
    register.registerMetric(this.endpointHealth);
    register.registerMetric(this.endpointLatency);
    register.registerMetric(this.bulkheadPoolUsage);
    register.registerMetric(this.bulkheadQueueLength);
    register.registerMetric(this.modelRequests);
    register.registerMetric(this.modelLatency);
    register.registerMetric(this.tokenUsage);
    register.registerMetric(this.costAccumulator);
    register.registerMetric(this.canaryRequests);
    register.registerMetric(this.canaryErrors);
  }

  // RED Metrics Recording
  recordRequest(method: string, route: string, statusCode: number, duration: number, tenantId?: string): void {
    const tenantIdHash = tenantId ? this.hashTenantId(tenantId) : 'unknown';
    const labels = { method, route, status_code: statusCode.toString(), tenant_id_hash: tenantIdHash };
    
    this.requestsTotal.inc(labels);
    this.requestDuration.observe(labels, duration / 1000); // Convert to seconds
  }

  recordError(method: string, route: string, errorType: string, tenantId?: string): void {
    const tenantIdHash = tenantId ? this.hashTenantId(tenantId) : 'unknown';
    this.errorsTotal.inc({ method, route, error_type: errorType, tenant_id_hash: tenantIdHash });
  }

  // Circuit Breaker Metrics
  recordCircuitBreakerState(modelId: string, circuitBreakerName: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    const stateValue = state === 'CLOSED' ? 0 : state === 'OPEN' ? 1 : 2;
    this.circuitBreakerState.set({ model_id: modelId, circuit_breaker_name: circuitBreakerName }, stateValue);
  }

  recordCircuitBreakerFailure(modelId: string, circuitBreakerName: string): void {
    this.circuitBreakerFailures.inc({ model_id: modelId, circuit_breaker_name: circuitBreakerName });
  }

  // Endpoint Health Metrics
  recordEndpointHealth(endpointUrl: string, modelProvider: string, isHealthy: boolean): void {
    this.endpointHealth.set({ endpoint_url: endpointUrl, model_provider: modelProvider }, isHealthy ? 1 : 0);
  }

  recordEndpointLatency(endpointUrl: string, modelProvider: string, latency: number): void {
    this.endpointLatency.observe({ endpoint_url: endpointUrl, model_provider: modelProvider }, latency / 1000);
  }

  // Bulkhead Metrics
  recordBulkheadUsage(poolName: string, currentUsage: number, maxCapacity: number): void {
    const usageRatio = currentUsage / maxCapacity;
    this.bulkheadPoolUsage.set({ pool_name: poolName }, usageRatio);
  }

  recordBulkheadQueueLength(poolName: string, queueLength: number): void {
    this.bulkheadQueueLength.set({ pool_name: poolName }, queueLength);
  }

  // Model Router Business Metrics
  recordModelRequest(modelId: string, modelProvider: string, agentType: string, latency: number, tenantId?: string): void {
    const tenantIdHash = tenantId ? this.hashTenantId(tenantId) : 'unknown';
    
    this.modelRequests.inc({ 
      model_id: modelId, 
      model_provider: modelProvider, 
      agent_type: agentType, 
      tenant_id_hash: tenantIdHash 
    });
    
    this.modelLatency.observe({ 
      model_id: modelId, 
      model_provider: modelProvider, 
      agent_type: agentType 
    }, latency / 1000);
  }

  recordTokenUsage(modelId: string, promptTokens: number, completionTokens: number, totalTokens: number, tenantId?: string): void {
    const tenantIdHash = tenantId ? this.hashTenantId(tenantId) : 'unknown';
    const labels = { model_id: modelId, tenant_id_hash: tenantIdHash };
    
    this.tokenUsage.inc({ ...labels, token_type: 'prompt' }, promptTokens);
    this.tokenUsage.inc({ ...labels, token_type: 'completion' }, completionTokens);
    this.tokenUsage.inc({ ...labels, token_type: 'total' }, totalTokens);
  }

  recordCost(modelId: string, modelProvider: string, cost: number, tenantId?: string): void {
    const tenantIdHash = tenantId ? this.hashTenantId(tenantId) : 'unknown';
    this.costAccumulator.inc({ 
      model_id: modelId, 
      model_provider: modelProvider, 
      tenant_id_hash: tenantIdHash 
    }, cost);
  }

  // Canary Deployment Metrics
  recordCanaryRequest(deploymentId: string, isCanary: boolean, modelId: string): void {
    this.canaryRequests.inc({ 
      deployment_id: deploymentId, 
      is_canary: isCanary.toString(), 
      model_id: modelId 
    });
  }

  recordCanaryError(deploymentId: string, isCanary: boolean, modelId: string, errorType: string): void {
    this.canaryErrors.inc({ 
      deployment_id: deploymentId, 
      is_canary: isCanary.toString(), 
      model_id: modelId, 
      error_type: errorType 
    });
  }

  // Periodic metrics update (call from scheduled job)
  updateResilienceMetrics(resilienceStatus: any): void {
    // Update circuit breaker states
    for (const cb of resilienceStatus.circuitBreakers) {
      this.recordCircuitBreakerState(cb.modelId, cb.state.state, cb.state.state);
    }

    // Update endpoint health
    for (const endpoint of resilienceStatus.endpointHealth) {
      // Extract provider from endpoint URL or use default
      const provider = this.extractProviderFromEndpoint(endpoint.endpoint);
      this.recordEndpointHealth(endpoint.endpoint, provider, endpoint.healthy);
    }

    // Update bulkhead metrics
    for (const [poolName, stats] of Object.entries(resilienceStatus.bulkheadPools)) {
      const poolStats = stats as any;
      this.recordBulkheadUsage(poolName, poolStats.maxConcurrency - poolStats.available, poolStats.maxConcurrency);
      this.recordBulkheadQueueLength(poolName, poolStats.queueLength);
    }
  }

  // Get metrics for /metrics endpoint
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Clear all metrics (for testing)
  clearMetrics(): void {
    register.clear();
    this.initializeMetrics();
  }

  // Utility methods
  private hashTenantId(tenantId: string): string {
    // Hash tenant ID for privacy while maintaining cardinality
    return createHash('sha256').update(tenantId).digest('hex').substring(0, 8);
  }

  private extractProviderFromEndpoint(endpointUrl: string): string {
    if (endpointUrl.includes('openai')) return 'openai';
    if (endpointUrl.includes('anthropic')) return 'anthropic';
    if (endpointUrl.includes('azure')) return 'azure';
    if (endpointUrl.includes('cohere')) return 'cohere';
    return 'unknown';
  }
}