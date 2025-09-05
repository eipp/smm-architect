import logger from './logger';

// Mock sentry-utils implementation
function initializeSentry(config: any, context: any) {
  // Mock initialization
  logger.info('Sentry initialized (mock)', { config, context });
}

// Sentry configuration
const sentryConfig = {
  dsn: process.env.SENTRY_DSN || "https://02a82d6e1d09e631f5ef7083e197c841@o4509899378786304.ingest.de.sentry.io/4509899558879312",
  environment: process.env.NODE_ENV || "development",
  release: process.env.npm_package_version,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: process.env.NODE_ENV !== "production",
  enabled: process.env.SENTRY_ENABLED !== "false",
  enableLogs: true,
  sendDefaultPii: false,
};

// Service context
const serviceContext = {
  serviceName: "smm-architect",
  version: process.env.npm_package_version,
  environment: sentryConfig.environment,
};

// Initialize Sentry
try {
  initializeSentry(sentryConfig, serviceContext);
  logger.info("Sentry initialized for smm-architect service");
} catch (error) {
  logger.error("Failed to initialize Sentry", { error: error instanceof Error ? error.message : String(error) });
}

export default sentryConfig;