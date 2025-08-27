module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  collectCoverage: false,
  
  // Test timeout configuration
  testTimeout: 30000,
  
  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        types: ['node', 'jest']
      }
    }]
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/test-utils/**/*',
    '!src/mocks/**/*'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Module name mapping for path resolution
  moduleNameMapper: {
    '^@smm-architect/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@smm-architect/ui/(.*)$': '<rootDir>/../../packages/ui/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Test environment options
  testEnvironmentOptions: {},
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  bail: false,
  
  // Performance
  maxWorkers: '50%'
};