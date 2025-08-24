import { initializeSentry } from "../shared/sentry-utils";
import { Logger } from './utils/logger';

// Initialize logger
const logger = new Logger('SentryConfig');

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
  serviceName: "model-router",
  version: process.env.npm_package_version,
  environment: sentryConfig.environment,
};

// Initialize Sentry
try {
  initializeSentry(sentryConfig, serviceContext);
  logger.info("Sentry initialized for model-router service");
} catch (error) {
  logger.error("Failed to initialize Sentry", error as Error);
}

export default sentryConfig;