const backendConfig = require('../../packages/build-config/jest/jest.config.backend.js');

module.exports = {
  ...backendConfig,
  displayName: 'ToolHub Service',
  
  // Service-specific test setup
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // Service-specific coverage paths
  collectCoverageFrom: [
    'src/**/*.{ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts}',
    '!src/**/*.spec.{ts}',
    '!src/types/**/*'
  ],
  
  // Service-specific module paths
  moduleNameMapping: {
    ...backendConfig.moduleNameMapping,
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};