import { initializeSentry } from "../shared/sentry-utils";
import log from "encore.dev/log";

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
  log.info("Sentry initialized for smm-architect service");
} catch (error) {
  log.error("Failed to initialize Sentry", { error: error.message });
}

export default sentryConfig;