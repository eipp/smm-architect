import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn) {
  // eslint-disable-next-line no-console
  console.warn("Sentry DSN not provided. Client-side monitoring disabled.");
}

Sentry.init({
  dsn,
  enabled: !!dsn,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Enable client replay sessions
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  // Configure integrations
  integrations: [
    new Sentry.BrowserTracing({
      // Capture interactions like clicks and navigation
      routingInstrumentation: Sentry.nextRouterInstrumentation(
        // This is required for Next.js App Router
        require('next/router')
      ),
    }),
    new Sentry.Replay({
      // Capture console messages
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // Environment and release information
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Performance monitoring
  enableTracing: true,
  
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
  
  // Configure tags
  initialScope: {
    tags: {
      component: 'frontend',
      service: 'smm-architect-ui'
    }
  }
});