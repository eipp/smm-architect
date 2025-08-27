// Mock sentry initialization for standalone service
function initializeSentry(config: any) {
  console.log('Sentry initialized with config:', config);
  return {
    initialized: true,
    captureException: (error: Error) => console.error('Sentry capture:', error),
    captureMessage: (message: string, level?: string) => console.log('Sentry message:', message, level)
  };
}
import winston from 'winston';

// Sentry configuration
const sentryConfig = {
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  release: process.env.npm_package_version,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: process.env.NODE_ENV !== "production",
  enabled: process.env.SENTRY_ENABLED !== "false",
};

// Service context
const serviceContext = {
  serviceName: "toolhub",
  version: process.env.npm_package_version,
  environment: sentryConfig.environment,
};

// Initialize Sentry
try {
  initializeSentry(sentryConfig);
} catch (error) {
  // Log to console if Sentry fails to initialize
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Failed to initialize Sentry", { error: errorMessage });
}

export default sentryConfig;