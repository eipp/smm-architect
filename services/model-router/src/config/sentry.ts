// Mock sentry-utils implementation
function initializeSentry(config: any, context: any) {
  // Mock initialization
  console.log('Sentry initialized (mock)', config, context);
}

// Mock log implementation
const log = {
  info: (message: string, data?: any) => console.log('[INFO]', message, data),
  error: (message: string, data?: any) => console.error('[ERROR]', message, data),
  debug: (message: string, data?: any) => console.log('[DEBUG]', message, data),
  warn: (message: string, data?: any) => console.warn('[WARN]', message, data)
};

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
  serviceName: "model-router",
  version: process.env.npm_package_version,
  environment: sentryConfig.environment,
};

// Initialize Sentry
try {
  initializeSentry(sentryConfig, serviceContext);
  log.info("Sentry initialized for model-router service");
} catch (error) {
  log.error("Failed to initialize Sentry", error);
}

export default sentryConfig;