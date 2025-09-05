import { initializeSentry } from "../../shared/sentry-utils";

// Sentry configuration
const dsn = process.env['SENTRY_DSN'];

const sentryConfig = {
  dsn,
  environment: process.env['NODE_ENV'] || "development",
  release: process.env['npm_package_version'],
  tracesSampleRate: process.env['NODE_ENV'] === "production" ? 0.1 : 1.0,
  profilesSampleRate: process.env['NODE_ENV'] === "production" ? 0.1 : 1.0,
  debug: process.env['NODE_ENV'] !== "production",
  enabled: process.env['SENTRY_ENABLED'] !== "false",
};

// Service context
const serviceContext = {
  serviceName: "audit",
  version: process.env['npm_package_version'],
  environment: sentryConfig.environment,
};

// Initialize Sentry
try {
  if (!dsn) {
    console.warn("Sentry DSN not provided. Skipping Sentry initialization.");
  } else {
    initializeSentry(sentryConfig, serviceContext);
    console.log("Sentry initialized for audit service");
  }
} catch (error) {
  console.error("Failed to initialize Sentry", error);
}

export default sentryConfig;