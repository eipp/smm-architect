// Test setup file for ToolHub
import { jest } from '@jest/globals';

// Mock external services
jest.mock('axios');
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({
    sub: 'test-user-id',
    workspaceId: '123e4567-e89b-12d3-a456-426614174000',
    scopes: ['ingest:read', 'ingest:write', 'vector:read', 'vector:write', 'simulate:read', 'simulate:execute', 'render:read', 'render:execute', 'oauth:read', 'oauth:write', 'oauth:initiate', 'oauth:callback', 'oauth:refresh']
  }),
  sign: jest.fn().mockReturnValue('mock-jwt-token')
}));

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    level: 'info'
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.VAULT_URL = 'http://localhost:8200';
process.env.SIMULATOR_SERVICE_URL = 'http://localhost:8082';
process.env.RENDER_SERVICE_URL = 'http://localhost:8083';
process.env.BASE_URL = 'http://localhost:8080';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PINECONE_API_KEY = 'test-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'test-env';
process.env.PINECONE_INDEX = 'test-index';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};