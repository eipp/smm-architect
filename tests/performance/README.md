# Performance Testing Framework

This document describes the comprehensive performance testing framework for SMM Architect, including SLO compliance monitoring, load testing, benchmarking, and regression detection.

## Overview

The performance testing framework ensures that SMM Architect maintains high performance standards through:

- **SLO Compliance Monitoring**: Continuous validation of Service Level Objectives
- **Load Testing**: HTTP load testing using Artillery for realistic traffic simulation  
- **Performance Benchmarking**: Micro-benchmarks with regression detection
- **SLO Monitoring**: Real-time SLO tracking with error budget management

## Framework Components

### 1. SLO Compliance Tests (`slo-compliance.test.ts`)

Validates that all services meet their Service Level Objectives:

```typescript
// Example SLO targets
{
  "model_router_latency_p95": "< 2.0 seconds",
  "toolhub_vector_search_p95": "< 300ms", 
  "simulation_success_rate": "> 95%",
  "workspace_creation_p95": "< 5.0 seconds"
}
```

**Key Features**:
- Real-time performance measurement
- P50, P95, P99 latency tracking
- Success rate and error rate monitoring
- Memory usage validation

### 2. Load Testing Framework (`load-testing-framework.ts`)

HTTP load testing using Artillery for realistic traffic patterns:

```yaml
# Example load test configuration
config:
  target: http://model-router.smm-system.svc.cluster.local:8080
  phases:
    - duration: 60s, arrivalRate: 20 RPS
scenarios:
  - name: model-registration
    weight: 100
    flow:
      - post: /api/models
      - get: /api/models/{{ modelId }}
```

**Test Scenarios**:
- Model Router API load testing
- ToolHub vector search stress testing
- n8n workflow execution capacity testing
- End-to-end campaign creation workflows

### 3. Performance Benchmarking (`benchmark-framework.ts`)

Micro-benchmarks with regression detection and baseline tracking:

```typescript
const result = await framework.benchmark(
  'ToolHub Vector Search',
  mockVectorSearch,
  {
    iterations: 50,
    warmupIterations: 10,
    metadata: { testType: 'vector_search' }
  }
);
```

**Features**:
- Automated baseline management
- Statistical analysis (mean, median, P95, P99)
- Regression detection with configurable thresholds
- HTML and JSON reporting

### 4. SLO Monitoring Framework (`slo-monitoring-framework.ts`)

Continuous SLO monitoring with error budget tracking:

```typescript
interface SLODefinition {
  name: string;
  service: string;
  sli: { type: 'latency' | 'availability' | 'error_rate' };
  slo: { target: number; operator: '<=' | '>=' };
  errorBudget: { period: '30d'; budgetPercentage: number };
}
```

**Capabilities**:
- Real-time SLO compliance checking
- Error budget consumption tracking
- Burn rate analysis and alerting
- Performance trend analysis

## Configuration

### Environment Configuration (`benchmark-config.json`)

```json
{
  "sloTargets": {
    "toolhub": {
      "vectorSearch": { "p95": 200, "p50": 100, "unit": "ms" }
    },
    "simulation": {
      "smallWorkflow": { "p95": 30000, "p50": 20000, "unit": "ms" }
    }
  },
  "loadTestingProfiles": {
    "light": { "concurrentUsers": 5, "duration": 60 },
    "stress": { "concurrentUsers": 50, "duration": 600 }
  }
}
```

### Test Environment Settings

- **CI Environment**: Light load, fast execution (< 10 minutes)
- **Staging Environment**: Moderate load, comprehensive testing (< 30 minutes)  
- **Production Environment**: Full stress testing with complete validation

## Usage

### Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific test suites
npm run test:slo          # SLO compliance only
npm run test:benchmark    # Benchmarking only
npm run test:load         # Load testing only

# Run performance testing pipeline
./scripts/run-performance-tests.sh ci
./scripts/run-performance-tests.sh staging
./scripts/run-performance-tests.sh production
```

### CI/CD Integration

The framework integrates with GitHub Actions for automated testing:

```yaml
# Triggered on:
- Push to main/develop branches
- Pull requests
- Daily scheduled runs (2 AM UTC)
- Manual workflow dispatch
```

### Environment Variables

```bash
# Test configuration
NODE_ENV=ci|staging|production
PERFORMANCE_TEST_MODE=slo|benchmark|load
UPDATE_BASELINES=true|false
PERFORMANCE_THRESHOLD=20  # Regression threshold %

# Notification settings  
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
EMAIL_RECIPIENTS=team@example.com
```

## Performance Targets & SLOs

### Service Level Objectives

| Service | Metric | Target | Error Budget |
|---------|--------|--------|--------------|
| Model Router | P95 Latency | ≤ 2.0s | 1% (99% availability) |
| Model Router | Availability | ≥ 99.5% | 0.5% |
| Model Router | Error Rate | ≤ 1% | 1% |
| ToolHub | Vector Search P95 | ≤ 300ms | 2% |
| Simulation | Success Rate | ≥ 95% | 5% |
| n8n Workflows | P95 Latency | ≤ 10s | 5% |
| Agent Jobs | P95 Completion | ≤ 300s | 5% |
| Workspace | Creation P95 | ≤ 5s | 2% |

### Load Testing Targets

| Profile | Concurrent Users | Duration | Target RPS |
|---------|------------------|----------|------------|
| Light (CI) | 5 | 60s | 10 RPS |
| Moderate (Staging) | 20 | 300s | 50 RPS |
| Stress (Production) | 50 | 600s | 100 RPS |
| Spike | 100 | 120s | 200 RPS |

## Monitoring & Alerting

### Error Budget Alerting

- **Critical**: Burn rate > 5x, Error budget < 10%
- **Warning**: Burn rate > 2x, Error budget < 20%
- **Info**: Performance trends, minor degradations

### Alert Channels

- **Slack**: Real-time notifications to #performance-alerts
- **Email**: Daily summary reports to SRE team
- **PagerDuty**: Critical SLO violations and outages

### Dashboards

- **Grafana**: Real-time performance metrics
- **HTML Reports**: Detailed benchmark analysis
- **GitHub Actions**: CI/CD test results

## Regression Detection

### Baseline Management

```typescript
// Automatically update baselines on successful runs
if (!hasRegressions && process.env.UPDATE_BASELINES === 'true') {
  await framework.saveBaseline(result);
}
```

### Regression Thresholds

- **Minor**: 10-20% performance degradation
- **Major**: 20-50% performance degradation  
- **Critical**: >50% performance degradation

### Automatic Actions

- **Block deployments** on critical regressions
- **Warning notifications** on major regressions
- **Baseline updates** on performance improvements

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Check for memory leaks in long-running tests
2. **Flaky Tests**: Increase warmup iterations or timeout values
3. **Network Timeouts**: Verify service connectivity and increase timeouts
4. **False Positives**: Review baseline data and adjust thresholds

### Debug Mode

```bash
# Enable detailed logging
DEBUG=performance:* npm run test:performance

# Run with increased timeouts
PERFORMANCE_TIMEOUT_MULTIPLIER=2.0 npm run test:benchmark
```

### Performance Analysis

```bash
# Generate detailed performance report
npm run test:benchmark -- --verbose --detectOpenHandles

# Memory profiling
node --max-old-space-size=4096 --expose-gc npm run test:performance
```

## Best Practices

### Test Design

1. **Isolation**: Run performance tests in isolated environments
2. **Warmup**: Always include warmup iterations for accurate measurements
3. **Statistics**: Use appropriate sample sizes (>30 iterations)
4. **Cleanup**: Ensure proper cleanup to prevent resource leaks

### Baseline Management

1. **Regular Updates**: Update baselines after verified improvements
2. **Environment Consistency**: Use consistent test environments
3. **Statistical Significance**: Ensure sufficient data for regression detection
4. **Version Control**: Track baseline changes with git

### Monitoring

1. **Continuous**: Run SLO monitoring continuously, not just in CI
2. **Alerting**: Set appropriate alert thresholds to minimize noise
3. **Trending**: Monitor performance trends over time
4. **Capacity Planning**: Use load test results for capacity planning

## Integration with Monitoring Stack

### Prometheus Metrics

```typescript
// Example metrics exposed by services
model_router_request_duration_seconds_bucket
model_router_requests_total
toolhub_vector_search_duration_seconds
simulation_runs_total{status="success|failed"}
```

### Grafana Dashboards

- Performance Overview: Service health and SLO compliance
- Load Testing: Real-time load test execution
- Error Budgets: SLO burn rate and budget consumption

### Log Correlation

- Structured logging with trace IDs
- Performance annotations in logs
- Error correlation with performance metrics

## Future Enhancements

1. **Chaos Engineering**: Integrate fault injection testing
2. **Machine Learning**: Anomaly detection for performance patterns
3. **Multi-Region**: Geographic load testing
4. **Auto-Scaling**: Performance-based scaling decisions
5. **Cost Optimization**: Performance vs. cost analysis

## Contributing

When adding new performance tests:

1. **Define SLOs**: Establish clear performance targets
2. **Add Baselines**: Create initial performance baselines
3. **Document**: Update this README with new test scenarios
4. **Monitor**: Add appropriate alerting and dashboards

For questions or issues, contact the SRE team or create an issue in the repository.