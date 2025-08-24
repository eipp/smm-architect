# Sentry Error Tracking Configuration

## Overview

This document describes how to configure and use Sentry error tracking across the SMM Architect platform. Sentry is configured for both frontend and backend services to provide comprehensive error monitoring and performance tracing.

## Architecture

SMM Architect uses Sentry across multiple components:

1. **Frontend (Next.js)** - Client-side error tracking with React integration
2. **Backend Services** - Server-side error tracking for all microservices
3. **Shared Utilities** - Common Sentry configuration and utilities

## Configuration

### Environment Variables

All services use the following environment variables:

- `SENTRY_DSN` - The Data Source Name for your Sentry project
- `SENTRY_ORG` - Your Sentry organization name (for source map uploads)
- `SENTRY_PROJECT` - Your Sentry project name (for source map uploads)
- `SENTRY_AUTH_TOKEN` - Authentication token for source map uploads
- `SENTRY_ENABLED` - Set to "false" to disable Sentry (default: true)
- `NODE_ENV` - Environment (development, staging, production)
- `APP_VERSION` - Application version for release tracking

### Per-Service Configuration

Each service has its own Sentry configuration file located at:
- `services/{service-name}/src/config/sentry.ts`

## Frontend Setup

The frontend uses `@sentry/nextjs` with automatic instrumentation:

1. **Client-side**: `sentry.client.config.ts` - Browser error tracking
2. **Server-side**: `sentry.server.config.ts` - Server-side error tracking
3. **Edge runtime**: `sentry.edge.config.ts` - Edge function error tracking

### Error Boundaries

The frontend includes a custom React Error Boundary component at `src/components/ErrorBoundary.tsx` that integrates with Sentry.

## Backend Setup

All backend services use the shared Sentry utilities located at `services/shared/sentry-utils.ts`.

### Service Integration

Each service initializes Sentry by importing the configuration file:
```typescript
import './config/sentry'; // Initialize Sentry
```

### Error Handling

Services capture exceptions using the shared utility:
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

## Performance Monitoring

Sentry is configured for performance monitoring with:

- **Tracing**: Automatic tracing for HTTP requests
- **Profiling**: Node.js profiling for performance bottlenecks
- **Transactions**: Custom transaction tracking for business operations

## Source Maps

Source maps are automatically uploaded during the build process for Next.js frontend when `SENTRY_AUTH_TOKEN` is provided.

## Testing

To test Sentry configuration:

1. **Frontend**: Trigger an error in a React component
2. **Backend**: Throw an error in an API endpoint
3. **Verify**: Check the Sentry dashboard for the captured error

## Best Practices

1. **Environment Separation**: Use different Sentry projects for development, staging, and production
2. **Release Tracking**: Always set the `APP_VERSION` environment variable
3. **Sampling**: Adjust `tracesSampleRate` based on environment (higher in development, lower in production)
4. **Filtering**: Use `beforeSend` hooks to filter out noise
5. **Context**: Add relevant context to captured exceptions

## Troubleshooting

### Sentry Not Initializing

1. Check that `SENTRY_DSN` is set correctly
2. Verify that `SENTRY_ENABLED` is not set to "false"
3. Check service logs for initialization errors

### Missing Source Maps

1. Ensure `SENTRY_AUTH_TOKEN` is set during build
2. Verify `SENTRY_ORG` and `SENTRY_PROJECT` are correct
3. Check that the auth token has the required permissions

### Performance Issues

1. Adjust sampling rates (`tracesSampleRate`, `profilesSampleRate`)
2. Review Sentry integration configuration
3. Check network connectivity to Sentry servers