module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '../../services/**/*.ts',
    '!../../services/**/*.d.ts',
    '!../../services/**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 120000, // 2 minutes for E2E tests
  maxWorkers: 1, // Run tests sequentially for E2E
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/global-setup.js',
  globalTeardown: '<rootDir>/global-teardown.js',
  testSequencer: '<rootDir>/test-sequencer.js',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'e2e-results.xml',
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results',
      filename: 'e2e-report.html',
      expand: true,
    }],
  ],
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/../../services/shared/$1',
  },
};