// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");

// Try to import profiling integration, but handle gracefully if not available
let nodeProfilingIntegration;
try {
  const profilingModule = require("@sentry/profiling-node");
  nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
} catch (error) {
  console.warn('Sentry profiling integration not available:', error.message);
  nodeProfilingIntegration = null;
}

const integrations = [];

// Add profiling integration if available
if (nodeProfilingIntegration) {
  integrations.push(nodeProfilingIntegration());
}

const dsn = process.env.SENTRY_DSN;

if (!dsn) {
  console.warn("Sentry DSN not provided. Monitoring disabled.");
} else {
  Sentry.init({
    dsn,
    integrations: integrations,
  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Set sampling rate for profiling - this is evaluated only once per SDK.init call
  profileSessionSampleRate: nodeProfilingIntegration ? (process.env.NODE_ENV === 'production' ? 0.1 : 1.0) : 0,
  // Trace lifecycle automatically enables profiling during active traces  
  profileLifecycle: nodeProfilingIntegration ? 'trace' : undefined,

  // Send structured logs to Sentry
  enableLogs: true,

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: false, // Set to false for better privacy

  // Environment and release information
  environment: process.env.NODE_ENV || 'development',
  release: process.env.npm_package_version || '1.0.0',

  // Before sending to Sentry, filter out noise
  beforeSend(event, hint) {
    // Don't send events for cancelled requests
    if (event.exception?.values?.[0]?.type === 'AbortError') {
      return null;
    }
    
    // Filter out network errors that are not actionable
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    
    return event;
  },
  });
}

module.exports = Sentry;