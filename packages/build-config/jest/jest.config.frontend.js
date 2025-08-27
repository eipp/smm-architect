const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'Frontend App',
  testEnvironment: 'jsdom',
  
  // Frontend-specific timeout
  testTimeout: 10000,
  
  // Setup for React Testing Library
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/jest.setup.js'
  ],
  
  // Transform configuration for Next.js
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
    '^.+\\.css$': 'jest-transform-stub'
  },
  
  // Module name mapping for Next.js and React
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },
  
  // Frontend test patterns
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Coverage for React components
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/stories/**/*',
    '!src/test-utils/**/*'
  ],
  
  // Module file extensions for frontend
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Test environment options for jsdom
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};