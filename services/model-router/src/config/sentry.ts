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
const dsn = process.env.SENTRY_DSN;

const sentryConfig = {
  dsn,
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
  if (!dsn) {
    log.warn("Sentry DSN not provided. Skipping Sentry initialization.");
  } else {
    initializeSentry(sentryConfig, serviceContext);
    log.info("Sentry initialized for model-router service");
  }
} catch (error) {
  log.error("Failed to initialize Sentry", error);
}

export default sentryConfig;