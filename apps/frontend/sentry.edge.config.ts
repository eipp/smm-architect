import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://02a82d6e1d09e631f5ef7083e197c841@o4509899378786304.ingest.de.sentry.io/4509899558879312",
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Environment and release information
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  
  // Configure tags
  initialScope: {
    tags: {
      component: 'frontend-edge',
      service: 'smm-architect-ui'
    }
  }
});