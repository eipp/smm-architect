const backendConfig = require('../../packages/build-config/jest/jest.config.backend.js');

module.exports = {
  ...backendConfig,
  displayName: 'Simulator Service',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'src/**/*.{ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts}',
    '!src/**/*.spec.{ts}',
    '!src/types/**/*'
  ]
};
