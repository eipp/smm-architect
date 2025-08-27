// Global test setup
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default timeouts
jest.setTimeout(120000); // 2 minutes

// Global test configuration
global.testConfig = {
  baseUrls: {
    core: process.env.CORE_SERVICE_URL || 'http://localhost:4000',
    toolhub: process.env.TOOLHUB_SERVICE_URL || 'http://localhost:3001',
    modelRouter: process.env.MODEL_ROUTER_SERVICE_URL || 'http://localhost:3002',
    publisher: process.env.PUBLISHER_SERVICE_URL || 'http://localhost:3003',
    agents: process.env.AGENTS_SERVICE_URL || 'http://localhost:3004',
  },
  auth: {
    testToken: process.env.TEST_AUTH_TOKEN || 'test-token',
    workspaceId: process.env.TEST_WORKSPACE_ID || 'test-workspace',
  },
  timeouts: {
    service: 30000,
    api: 10000,
    healthCheck: 5000,
  },
};

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Test utilities
global.waitForService = async (url, timeout = 30000) => {
  const start = Date.now();
  const interval = 2000;

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`${url}/health`, { timeout: 5000 });
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Service at ${url} did not become ready within ${timeout}ms`);
};