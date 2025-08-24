// Import Sentry configuration from instrument.js first (must be first import)
require('./instrument.js');

// Now import other dependencies
const express = require('express');
const Sentry = require('@sentry/node');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up Sentry middleware - these must be after Sentry.init() is called
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// All your controllers should live here
app.get('/', (req, res) => {
  res.json({
    message: 'SMM Architect - Sentry Express Example',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Example endpoint that demonstrates Sentry functionality
app.get('/debug-sentry', (req, res) => {
  console.log('Testing Sentry integration...');
  
  // Capture a message
  Sentry.captureMessage('Sentry Express example endpoint accessed', 'info');
  
  // Add some user context
  Sentry.configureScope((scope) => {
    scope.setUser({
      id: '12345',
      email: 'test@example.com',
      username: 'testuser'
    });
    scope.setTag('endpoint', '/debug-sentry');
    scope.setContext('request_info', {
      path: req.path,
      method: req.method,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  });
  
  res.json({
    message: 'Sentry integration test completed successfully',
    timestamp: new Date().toISOString(),
    note: 'Check your Sentry dashboard for events'
  });
});

// Example endpoint that demonstrates error handling
app.get('/test-error', (req, res) => {
  // This will be automatically captured by Sentry
  throw new Error('This is a test error for Sentry monitoring');
});

// Example endpoint that demonstrates performance monitoring
app.get('/test-performance', (req, res) => {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'GET /test-performance'
  });
  
  // Simulate some work with spans
  const span1 = transaction.startChild({
    op: 'db.query',
    description: 'Fetching user data'
  });
  
  setTimeout(() => {
    span1.finish();
    
    const span2 = transaction.startChild({
      op: 'external.api',
      description: 'Calling external service'
    });
    
    setTimeout(() => {
      span2.finish();
      transaction.finish();
      
      res.json({
        message: 'Performance test completed',
        duration: "150ms simulated"
      });
    }, 100);
  }, 50);
});

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  console.error("Unhandled error:", err);
  
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.json({
    error: 'Internal Server Error',
    errorId: res.sentry,
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMM Architect Sentry Express Example running on port ${PORT}`);
  console.log(`📊 Sentry monitoring enabled`);
  console.log(`🔗 Test endpoints:`);
  console.log(`   GET http://localhost:${PORT}/ - Basic health check`);
  console.log(`   GET http://localhost:${PORT}/debug-sentry - Test Sentry integration`);
  console.log(`   GET http://localhost:${PORT}/test-error - Test error handling`);
  console.log(`   GET http://localhost:${PORT}/test-performance - Test performance monitoring`);
  console.log(`\n✅ Ready to receive requests!`);
});

module.exports = app;