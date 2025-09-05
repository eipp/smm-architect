import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "YOUR_SENTRY_DSN",
  
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