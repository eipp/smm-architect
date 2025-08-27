const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'Backend Service',
  testEnvironment: 'node',
  
  // Extended timeout for integration tests
  testTimeout: 60000,
  
  // Additional setup for backend tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // Backend-specific test patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/*.integration.test.ts'
  ],
  
  // Coverage specific to backend code
  collectCoverageFrom: [
    'src/**/*.{ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts}',
    '!src/**/*.spec.{ts}',
    '!src/test-utils/**/*',
    '!src/mocks/**/*',
    '!src/types/**/*'
  ],
  
  // Backend-specific module mapping
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper
  },
  
  // Test environment setup for database/external services (optional)
  // globalSetup: '<rootDir>/tests/global-setup.ts',
  // globalTeardown: '<rootDir>/tests/global-teardown.ts',
  
  // Performance optimization for backend tests
  maxWorkers: 1, // Sequential execution for database tests
  forceExit: true,
  detectOpenHandles: true
};