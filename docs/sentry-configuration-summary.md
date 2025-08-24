# Sentry Configuration Summary for SMM Architect

## Overview

This document provides a comprehensive summary of the Sentry error tracking configuration implemented across the SMM Architect platform. Sentry has been configured for both frontend and all backend microservices to provide unified error monitoring and performance tracing.

## Configuration Summary

### Frontend (Next.js)

**Location**: `apps/frontend/`

**Components**:
- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `src/components/ErrorBoundary.tsx` - React error boundary with Sentry integration

**Dependencies**:
- `@sentry/nextjs`
- `@sentry/react`

### Backend Services

All backend services have been configured with Sentry integration:

1. **SMM Architect Service** (`services/smm-architect/`)
2. **ToolHub Service** (`services/toolhub/`)
3. **Model Router Service** (`services/model-router/`)
4. **Audit Service** (`services/audit/`)
5. **Simulator Service** (`services/simulator/`)
6. **Monitoring Service** (`services/monitoring/`)

**Shared Utilities**: `services/shared/sentry-utils.ts`

**Dependencies** (for each service):
- `@sentry/node`
- `@sentry/profiling-node`

## Implementation Details

### Error Capture

Each service captures errors using the shared utility functions:

```typescript
import { captureException } from "../../../shared/sentry-utils";

try {
  // Some operation
} catch (error) {
  captureException(error, {
    endpoint: "someEndpoint",
    additionalContext: "someValue"
  });
}
```

### Performance Monitoring

All services are configured with performance monitoring:

- **Tracing**: Automatic HTTP request tracing
- **Profiling**: Node.js profiling for performance bottlenecks
- **Transactions**: Custom transaction tracking for business operations

### Configuration Files

Each service has its own Sentry configuration at:
`services/{service-name}/src/config/sentry.ts`

## Environment Configuration

### Required Environment Variables

- `SENTRY_DSN` - Data Source Name for your Sentry project
- `NODE_ENV` - Environment (development, staging, production)
- `APP_VERSION` - Application version for release tracking

### Optional Environment Variables

- `SENTRY_ORG` - Organization name (for source map uploads)
- `SENTRY_PROJECT` - Project name (for source map uploads)
- `SENTRY_AUTH_TOKEN` - Auth token (for source map uploads)
- `SENTRY_ENABLED` - Enable/disable Sentry (default: true)

## Testing the Configuration

### Verification Script

Run the verification script to check configuration:
```bash
./scripts/verify-sentry-config.sh
```

### Manual Testing

1. **Frontend**: Trigger an error in a React component
2. **Backend**: Throw an error in an API endpoint
3. **Verify**: Check the Sentry dashboard for captured errors

## Monitoring Stack Integration

Sentry integrates with the existing Prometheus/Grafana monitoring stack:

- **Complementary Data**: Sentry captures errors while Prometheus collects metrics
- **Correlation**: Common tagging enables correlation between errors and metrics
- **Alerting**: Bidirectional alerting between systems via webhooks
- **Dashboarding**: Unified views showing both error and metric data

## Best Practices Implemented

1. **Environment Separation**: Different Sentry projects for dev/staging/production
2. **Release Tracking**: Version tracking through `APP_VERSION` environment variable
3. **Sampling**: Appropriate sampling rates per environment
4. **Filtering**: Error filtering to reduce noise
5. **Context**: Rich context added to error reports

## Next Steps

1. **Set Environment Variables**: Configure `SENTRY_DSN` and other variables
2. **Run npm install**: Install dependencies in all directories
3. **Test Configuration**: Verify error tracking works in development
4. **Configure Alerts**: Set up alert rules in Sentry dashboard
5. **Monitor Production**: Deploy to production and monitor error rates

## Documentation

Additional documentation is available at:
- `docs/sentry-configuration.md` - Detailed configuration guide
- `docs/sentry-monitoring-integration.md` - Integration with monitoring stack
- `.env.sentry.example` - Example environment configuration

## Support

For issues with Sentry configuration:
1. Check the verification script output
2. Review the documentation
3. Ensure all environment variables are set correctly
4. Verify network connectivity to Sentry servers