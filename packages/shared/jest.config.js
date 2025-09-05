const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  globals: {
    'ts-jest': {
      tsconfig: path.join(__dirname, 'tsconfig.test.json')
    }
  }
};
