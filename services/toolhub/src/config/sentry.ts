import { initializeSentry } from "../shared/sentry-utils";
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
  initializeSentry(sentryConfig, serviceContext);
} catch (error) {
  // Log to console if Sentry fails to initialize
  console.error("Failed to initialize Sentry", { error: error.message });
}

export default sentryConfig;