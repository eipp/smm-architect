import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { CanaryDeploymentSystem, CanaryDeployment } from '../../services/model-router/src/services/CanaryDeploymentSystem';
import { ModelMetricsProvider, ModelMetricData } from '../../services/model-router/src/monitoring/model-metrics-provider';

class MockMetricsProvider implements ModelMetricsProvider {
  constructor(private responses: ModelMetricData[]) {}
  getMetrics = jest.fn(async () => this.responses.shift() as ModelMetricData);
}

describe('CanaryDeploymentSystem metric-based decisions', () => {
  const registry = {
    getModel: jest.fn(async (id: string) => ({ id }))
  } as any;
  const evaluationFramework = {} as any;
  let system: CanaryDeploymentSystem;

  const baseConfig: Omit<CanaryDeployment, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
    name: 'Test',
    description: 'Test deployment',
    productionModelId: 'prod-model',
    canaryModelId: 'canary-model',
    trafficSplit: { production: 90, canary: 10 },
    rolloutStrategy: { type: 'linear', duration: 60, maxTrafficPercentage: 50 },
    successCriteria: {
      minRequests: 100,
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
      maxLatencyP95: 2000,
      minQualityScore: 0.8,
      evaluationWindow: 30
    },
    rollbackCriteria: {
      maxErrorRate: 0.1,
      maxLatencyP95: 3000,
      minSuccessRate: 0.9,
      minQualityScore: 0.7,
      alertThresholds: { errorSpike: 0.2, latencySpike: 5000, qualityDrop: 0.3 }
    },
    createdBy: 'tester'
  };

  afterEach(async () => {
    if (system) {
      await system.cleanup();
    }
  });

  it('recommends rollback on poor canary metrics', async () => {
    const provider = new MockMetricsProvider([
      { requests: 200, successRate: 0.99, errorRate: 0.01, avgLatency: 400, p95Latency: 800, qualityScore: 0.9, avgCost: 0 },
      { requests: 200, successRate: 0.6, errorRate: 0.4, avgLatency: 1500, p95Latency: 2500, qualityScore: 0.5, avgCost: 0 }
    ]);
    system = new CanaryDeploymentSystem(registry, evaluationFramework, provider);
    const deployment = await system.createCanaryDeployment(baseConfig);

    const metrics = await system.evaluateCanaryPerformance(deployment.id);

    expect(provider.getMetrics).toHaveBeenNthCalledWith(1, deployment.productionModelId, expect.any(Date), false);
    expect(provider.getMetrics).toHaveBeenNthCalledWith(2, deployment.canaryModelId, expect.any(Date), true);
    expect(metrics.comparison.recommendation).toBe('rollback');
  });

  it('recommends proceed when canary is healthy', async () => {
    const provider = new MockMetricsProvider([
      { requests: 300, successRate: 0.97, errorRate: 0.03, avgLatency: 500, p95Latency: 900, qualityScore: 0.9, avgCost: 0 },
      { requests: 200, successRate: 0.96, errorRate: 0.04, avgLatency: 550, p95Latency: 950, qualityScore: 0.85, avgCost: 0 }
    ]);
    system = new CanaryDeploymentSystem(registry, evaluationFramework, provider);
    const deployment = await system.createCanaryDeployment(baseConfig);

    const metrics = await system.evaluateCanaryPerformance(deployment.id);

    expect(metrics.comparison.recommendation).toBe('proceed');
  });
});
