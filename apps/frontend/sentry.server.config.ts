import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "YOUR_SENTRY_DSN",
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Configure integrations for server-side
  integrations: [
    // Use basic integrations that are available in @sentry/nextjs
  ],
  
  // Environment and release information
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  
  // Performance monitoring
  enableTracing: true,
  
  // Server-specific configuration
  beforeSend(event, hint) {
    // Don't send events for cancelled requests
    if (event.exception?.values?.[0]?.type === 'AbortError') {
      return null;
    }
    
    // Filter out Next.js build errors in development
    if (process.env.NODE_ENV === 'development' && 
        event.exception?.values?.[0]?.stacktrace?.frames?.some(
          frame => frame.filename?.includes('.next')
        )) {
      return null;
    }
    
    return event;
  },
  
  // Configure tags
  initialScope: {
    tags: {
      component: 'frontend-server',
      service: 'smm-architect-ui'
    }
  }
});