const baseConfig = require('../../packages/build-config/eslint/eslint.config.base.js');

module.exports = {
  ...baseConfig,
  parserOptions: {
    ...baseConfig.parserOptions,
    project: './tsconfig.json'
  },
  rules: {
    ...baseConfig.rules,
    'no-console': 'off' // Allow console in services
  }
};