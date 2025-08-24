// Global test setup for SMM Architect QA framework
import { jest } from '@jest/globals';

// Set up global test timeout
jest.setTimeout(300000); // 5 minutes for integration tests

// Mock console methods to reduce test noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only show console output in verbose mode
if (!process.env.JEST_VERBOSE) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
process.env.ALERTMANAGER_URL = process.env.ALERTMANAGER_URL || 'http://localhost:9093';
process.env.N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
process.env.TOOLHUB_BASE_URL = process.env.TOOLHUB_BASE_URL || 'http://localhost:8080';
process.env.MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'ws://localhost:3000/mcp';

// Global test utilities
global.testUtils = {
  skipIfNoService: (serviceName: string, serviceUrl: string) => {
    if (!serviceUrl || serviceUrl.includes('localhost')) {
      console.warn(`Skipping test - ${serviceName} not available at ${serviceUrl}`);
      return true;
    }
    return false;
  },
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  retryUntil: async (fn: () => Promise<boolean>, maxAttempts = 10, delay = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      if (await fn()) return true;
      if (i < maxAttempts - 1) await global.testUtils.waitFor(delay);
    }
    return false;
  }
};

// Cleanup function for tests
afterAll(() => {
  if (!process.env.JEST_VERBOSE) {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  }
});

// Add global type declarations
declare global {
  var testUtils: {
    skipIfNoService: (serviceName: string, serviceUrl: string) => boolean;
    waitFor: (ms: number) => Promise<void>;
    retryUntil: (fn: () => Promise<boolean>, maxAttempts?: number, delay?: number) => Promise<boolean>;
  };
}