import axios from 'axios';

export interface ModelMetricData {
  requests: number;
  successRate: number;
  errorRate: number;
  avgLatency: number;
  p95Latency: number;
  qualityScore: number;
  avgCost: number;
}

export interface ModelMetricsProvider {
  getMetrics(modelId: string, since: Date, isCanary: boolean): Promise<ModelMetricData>;
}

export class PrometheusModelMetricsProvider implements ModelMetricsProvider {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.PROMETHEUS_URL || 'http://localhost:9090') {
    this.baseUrl = baseUrl;
  }

  async getMetrics(modelId: string, since: Date, isCanary: boolean): Promise<ModelMetricData> {
    const windowSeconds = Math.max(1, Math.floor((Date.now() - since.getTime()) / 1000));
    const range = `${windowSeconds}s`;

    const requestSelector = `model_id="${modelId}",is_canary="${isCanary}"`;
    const latencySelector = `model_id="${modelId}"`;

    const [throughput, errors, avgLatency, p95Latency] = await Promise.all([
      this.query(`sum(increase(model_router_canary_requests_total{${requestSelector}}[${range}]))`),
      this.query(`sum(increase(model_router_canary_errors_total{${requestSelector}}[${range}]))`),
      this.query(`sum(increase(model_router_model_latency_seconds_sum{${latencySelector}}[${range}])) / sum(increase(model_router_model_latency_seconds_count{${latencySelector}}[${range}]))`),
      this.query(`histogram_quantile(0.95, sum(rate(model_router_model_latency_seconds_bucket{${latencySelector}}[${range}])) by (le))`)
    ]);

    const errorRate = throughput > 0 ? errors / throughput : 0;
    const successRate = 1 - errorRate;

    return {
      requests: throughput,
      successRate,
      errorRate,
      avgLatency: avgLatency * 1000,
      p95Latency: p95Latency * 1000,
      qualityScore: 1,
      avgCost: 0
    };
  }

  private async query(query: string): Promise<number> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/v1/query`, {
        params: { query }
      });
      const value = parseFloat(res.data?.data?.result?.[0]?.value?.[1] ?? '0');
      return isNaN(value) ? 0 : value;
    } catch (error) {
      return 0;
    }
  }
}
