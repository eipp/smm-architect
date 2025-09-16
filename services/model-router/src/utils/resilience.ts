import { EventEmitter } from 'events';
import axios from 'axios';
import { Logger } from '../utils/logger';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  recoveryTimeout: number; // ms
  monitoringInterval: number; // ms
  minimumRequests: number;
  timeout: number; // ms
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  halfOpenCalls: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  jitter: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

export interface EndpointHealth {
  endpoint: string;
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  averageLatency: number;
  recentLatencies: number[];
  weight: number;
}

export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private logger: Logger;
  private resetTimer?: NodeJS.Timeout;

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
    this.logger = new Logger(`CircuitBreaker:${config.name}`);
    this.state = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      totalRequests: 0,
      halfOpenCalls: 0
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (Date.now() - this.state.lastFailureTime < this.config.recoveryTimeout) {
        throw new Error(`Circuit breaker ${this.config.name} is OPEN`);
      } else {
        this.transitionTo('HALF_OPEN');
      }
    }

    if (this.state.state === 'HALF_OPEN' && this.state.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new Error(`Circuit breaker ${this.config.name} is HALF_OPEN with max calls reached`);
    }

    this.state.totalRequests++;
    if (this.state.state === 'HALF_OPEN') {
      this.state.halfOpenCalls++;
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private onSuccess(): void {
    this.state.successes++;
    this.state.lastSuccessTime = Date.now();

    if (this.state.state === 'HALF_OPEN') {
      // If we've had enough successful calls in half-open state, transition to closed
      if (this.state.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.transitionTo('CLOSED');
      }
    }

    this.emit('success', { state: this.getState() });
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === 'HALF_OPEN') {
      // Immediate transition to OPEN on any failure in HALF_OPEN state
      this.transitionTo('OPEN');
    } else if (this.state.state === 'CLOSED') {
      // Check if we should transition to OPEN
      if (this.shouldTrip()) {
        this.transitionTo('OPEN');
      }
    }

    this.emit('failure', { state: this.getState() });
  }

  private shouldTrip(): boolean {
    if (this.state.totalRequests < this.config.minimumRequests) {
      return false;
    }

    const failureRate = this.state.failures / this.state.totalRequests;
    return failureRate >= this.config.failureThreshold;
  }

  private transitionTo(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    const oldState = this.state.state;
    this.state.state = newState;

    switch (newState) {
      case 'CLOSED':
        this.state.failures = 0;
        this.state.successes = 0;
        this.state.totalRequests = 0;
        this.state.halfOpenCalls = 0;
        break;
      case 'OPEN':
        if (this.resetTimer) {
          clearTimeout(this.resetTimer);
        }
        this.resetTimer = setTimeout(() => {
          this.transitionTo('HALF_OPEN');
        }, this.config.recoveryTimeout);
        break;
      case 'HALF_OPEN':
        this.state.halfOpenCalls = 0;
        break;
    }

    this.logger.info(`Circuit breaker transitioned from ${oldState} to ${newState}`);
    this.emit('stateChange', { oldState, newState, state: this.getState() });
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  isOpen(): boolean {
    return this.state.state === 'OPEN';
  }

  reset(): void {
    this.transitionTo('CLOSED');
  }
}

export class RetryExecutor {
  private config: RetryConfig;
  private logger: Logger;

  constructor(config: RetryConfig) {
    this.config = config;
    this.logger = new Logger('RetryExecutor');
  }

  async execute<T>(operation: () => Promise<T>, isRetriable?: (error: any) => boolean): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          this.logger.info(`Operation succeeded after ${attempt} retries`);
        }
        return result;
      } catch (error) {
        lastError = error;

        if (attempt === this.config.maxRetries) {
          this.logger.error(`Operation failed after ${this.config.maxRetries} retries`, error);
          break;
        }

        if (isRetriable && !isRetriable(error)) {
          this.logger.info('Error is not retriable, aborting retry', { error });
          break;
        }

        const delay = this.calculateDelay(attempt);
        this.logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`, error);
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    delay = Math.min(delay, this.config.maxDelay);

    if (this.config.jitter) {
      // Add jitter to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class HealthBasedEndpointSelector {
  private endpointHealthMap: Map<string, EndpointHealth> = new Map();
  private logger: Logger;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly maxLatencyHistory = 10;
  private readonly healthCheckIntervalMs = 30000; // 30 seconds
  private readonly healthCheckTimeoutMs = 2000; // 2 seconds

  constructor() {
    this.logger = new Logger('HealthBasedEndpointSelector');
    this.startHealthMonitoring();
  }

  addEndpoint(endpoint: string, initialWeight: number = 1): void {
    this.endpointHealthMap.set(endpoint, {
      endpoint,
      healthy: true,
      lastCheck: 0,
      consecutiveFailures: 0,
      averageLatency: 0,
      recentLatencies: [],
      weight: initialWeight
    });
    this.logger.info(`Added endpoint: ${endpoint}`);
  }

  removeEndpoint(endpoint: string): void {
    this.endpointHealthMap.delete(endpoint);
    this.logger.info(`Removed endpoint: ${endpoint}`);
  }

  selectEndpoint(): string | null {
    const healthyEndpoints = Array.from(this.endpointHealthMap.values())
      .filter(health => health.healthy);

    if (healthyEndpoints.length === 0) {
      this.logger.warn('No healthy endpoints available');
      return null;
    }

    // Weight-based selection considering health and performance
    const weightedEndpoints = healthyEndpoints.map(health => ({
      endpoint: health.endpoint,
      // Higher weight for lower latency and higher base weight
      adjustedWeight: health.weight / (1 + health.averageLatency / 1000)
    }));

    const totalWeight = weightedEndpoints.reduce((sum, item) => sum + item.adjustedWeight, 0);
    const random = Math.random() * totalWeight;

    let cumulative = 0;
    for (const item of weightedEndpoints) {
      cumulative += item.adjustedWeight;
      if (random <= cumulative) {
        return item.endpoint;
      }
    }

    // Fallback to first healthy endpoint
    return healthyEndpoints[0].endpoint;
  }

  async recordResult(endpoint: string, latency: number, success: boolean): Promise<void> {
    const health = this.endpointHealthMap.get(endpoint);
    if (!health) {
      this.logger.warn(`Recording result for unknown endpoint: ${endpoint}`);
      return;
    }

    // Update latency tracking
    health.recentLatencies.push(latency);
    if (health.recentLatencies.length > this.maxLatencyHistory) {
      health.recentLatencies.shift();
    }
    health.averageLatency = health.recentLatencies.reduce((sum, lat) => sum + lat, 0) / health.recentLatencies.length;

    // Update health status
    if (success) {
      health.consecutiveFailures = 0;
      if (!health.healthy && health.consecutiveFailures <= 2) {
        health.healthy = true;
        this.logger.info(`Endpoint ${endpoint} marked as healthy`);
      }
    } else {
      health.consecutiveFailures++;
      if (health.healthy && health.consecutiveFailures >= 3) {
        health.healthy = false;
        this.logger.warn(`Endpoint ${endpoint} marked as unhealthy after ${health.consecutiveFailures} consecutive failures`);
      }
    }

    health.lastCheck = Date.now();
  }

  getEndpointHealth(): EndpointHealth[] {
    return Array.from(this.endpointHealthMap.values());
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckIntervalMs);
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.endpointHealthMap.keys()).map(endpoint => 
      this.performHealthCheck(endpoint)
    );

    await Promise.allSettled(promises);
  }

  private async performHealthCheck(endpoint: string): Promise<void> {
    try {
      const startTime = Date.now();
      const healthUrl = endpoint.endsWith('/health') ? endpoint : `${endpoint.replace(/\/$/, '')}/health`;

      const response = await axios.get(healthUrl, {
        timeout: this.healthCheckTimeoutMs,
        validateStatus: () => true
      });

      const latency = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      await this.recordResult(endpoint, latency, success);
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(`Health check failed for endpoint ${endpoint}`, error);
      await this.recordResult(endpoint, latency, false);
    }
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export class BulkheadExecutor {
  private pools: Map<string, { semaphore: number; maxConcurrency: number; queue: Array<() => void> }> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('BulkheadExecutor');
  }

  createPool(poolName: string, maxConcurrency: number): void {
    this.pools.set(poolName, {
      semaphore: maxConcurrency,
      maxConcurrency,
      queue: []
    });
    this.logger.info(`Created bulkhead pool: ${poolName} with max concurrency: ${maxConcurrency}`);
  }

  async execute<T>(poolName: string, operation: () => Promise<T>): Promise<T> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool ${poolName} not found`);
    }

    // Wait for available slot
    await this.acquireSlot(pool);

    try {
      const result = await operation();
      return result;
    } finally {
      this.releaseSlot(pool);
    }
  }

  private async acquireSlot(pool: { semaphore: number; maxConcurrency: number; queue: Array<() => void> }): Promise<void> {
    return new Promise((resolve) => {
      if (pool.semaphore > 0) {
        pool.semaphore--;
        resolve();
      } else {
        pool.queue.push(() => {
          pool.semaphore--;
          resolve();
        });
      }
    });
  }

  private releaseSlot(pool: { semaphore: number; maxConcurrency: number; queue: Array<() => void> }): void {
    if (pool.queue.length > 0) {
      const next = pool.queue.shift();
      if (next) {
        next();
      }
    } else {
      pool.semaphore++;
    }
  }

  getPoolStats(): Record<string, { available: number; maxConcurrency: number; queueLength: number }> {
    const stats: Record<string, { available: number; maxConcurrency: number; queueLength: number }> = {};
    
    for (const [poolName, pool] of this.pools) {
      stats[poolName] = {
        available: pool.semaphore,
        maxConcurrency: pool.maxConcurrency,
        queueLength: pool.queue.length
      };
    }
    
    return stats;
  }
}