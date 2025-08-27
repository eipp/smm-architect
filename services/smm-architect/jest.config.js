const backendConfig = require('../../packages/build-config/jest/jest.config.backend.js');

module.exports = {
  ...backendConfig,
  displayName: 'SMM Architect Service',
  
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
  moduleNameMapper: {
    ...backendConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};