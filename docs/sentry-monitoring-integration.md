# Sentry Integration with Monitoring Stack

## Overview

This document describes how Sentry integrates with the existing Prometheus/Grafana monitoring stack in the SMM Architect platform. While Prometheus focuses on metrics and Grafana on visualization, Sentry provides error tracking and performance monitoring capabilities that complement the existing stack.

## Integration Approach

Sentry operates alongside the existing monitoring stack rather than replacing it. Each system has distinct responsibilities:

- **Prometheus**: Collects and stores time-series metrics
- **Grafana**: Visualizes metrics and provides dashboards
- **Sentry**: Captures errors, exceptions, and performance traces

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│   Application   │    │   Sentry     │    │   Frontend   │
│   (Services)    │───▶│   (Error     │◀──▶│   (UI)       │
│                 │    │   Tracking)  │    │              │
└─────────────────┘    └──────────────┘    └──────────────┘
         │                       │                  │
         ▼                       ▼                  ▼
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│  Prometheus     │    │ Sentry API   │    │ Sentry Web   │
│  (Metrics)      │    │ (Data Store) │    │ UI           │
└─────────────────┘    └──────────────┘    └──────────────┘
         │                       │                  │
         ▼                       ▼                  ▼
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│   Grafana       │    │   Sentry     │    │   Browser    │
│   (Metrics      │    │   Webhooks   │    │   Alerts     │
│   Dashboard)    │    │   & Alerts   │    │              │
└─────────────────┘    └──────────────┘    └──────────────┘
```

## Data Flow

1. **Error Detection**: Applications capture errors and send them to Sentry
2. **Metrics Collection**: Applications expose Prometheus metrics endpoints
3. **Data Storage**: Both systems store their respective data
4. **Visualization**: Grafana displays metrics; Sentry provides error details
5. **Alerting**: Both systems can trigger alerts based on their data

## Correlation Between Systems

To correlate data between Sentry and Prometheus:

1. **Common Tags**: Use consistent tagging across both systems (service name, environment, etc.)
2. **Request IDs**: Include request IDs in both Sentry events and Prometheus logs
3. **Timestamps**: Ensure synchronized system clocks for temporal correlation

Example of correlated logging:
```typescript
// In application code
const requestId = uuidv4();
logger.info('Processing request', { requestId, service: 'toolhub' });
Sentry.setTag('request_id', requestId);
Sentry.setTag('service', 'toolhub');
```

## Alerting Integration

### Sentry to Prometheus Alertmanager

Configure Sentry webhooks to send alerts to Alertmanager:

1. In Sentry: Project Settings → Alerts → Integrations → Webhook
2. Add webhook URL: `http://alertmanager:9093/api/v1/alerts`
3. Configure payload format to match Alertmanager requirements

### Prometheus to Sentry

Forward critical alerts from Prometheus to Sentry:

1. Configure Alertmanager to send webhooks to Sentry
2. Use Sentry's incoming webhook integration
3. Map alert labels to Sentry tags for better filtering

## Dashboard Integration

### Grafana Dashboard Enhancement

Add Sentry data to existing Grafana dashboards:

1. **Error Rate Panels**: Show error rates from Sentry alongside success rates from Prometheus
2. **Error Distribution**: Display error types and frequencies
3. **Performance Comparison**: Compare Sentry performance traces with Prometheus metrics

### Sentry Dashboard Enhancement

Enhance Sentry dashboards with Prometheus data:

1. **Infrastructure Context**: Show system metrics alongside error reports
2. **Service Health**: Display overall service health combining error and metric data
3. **Correlation Views**: Create views that show related errors and metrics

## Configuration

### Prometheus Configuration

No changes needed to existing Prometheus configuration. Services continue to expose metrics endpoints as before.

### Sentry Configuration

Services are configured to send error data to Sentry while maintaining Prometheus metrics:

```typescript
// Example service configuration
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  integrations: [
    new ProfilingIntegration(),
  ],
});
```

## Best Practices

### Tagging Strategy

Use consistent tags across both systems:

- `service`: Service name (e.g., "toolhub", "smm-architect")
- `environment`: Environment name (e.g., "production", "staging")
- `version`: Application version
- `request_id`: Unique identifier for request correlation

### Sampling Rates

Configure appropriate sampling rates:

- **Development**: 100% sampling for detailed debugging
- **Staging**: 50% sampling for performance testing
- **Production**: 10% sampling to balance cost and insight

### Alert Thresholds

Set complementary alert thresholds:

- **Prometheus**: Alert on metric thresholds (high error rates, slow response times)
- **Sentry**: Alert on error volume and new error types

## Troubleshooting

### Missing Error Data

1. Verify Sentry DSN is correctly configured
2. Check network connectivity to Sentry servers
3. Ensure services are properly initialized with Sentry

### Duplicate Alerts

1. Review alert rules in both systems
2. Implement deduplication strategies
3. Use different notification channels for different alert types

### Performance Impact

1. Monitor sampling rates and adjust as needed
2. Use Sentry's performance features judiciously
3. Profile applications to ensure minimal overhead

## Future Enhancements

1. **Automated Correlation**: Develop tools to automatically correlate Sentry errors with Prometheus metrics
2. **Unified Dashboard**: Create a unified dashboard showing both error and metric data
3. **Advanced Alerting**: Implement machine learning-based anomaly detection combining both data sources
4. **Service Mesh Integration**: Integrate with service mesh for enhanced tracing capabilities