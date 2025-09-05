/**
 * Enhanced ESLint Configuration
 * SMM Architect Build Configuration
 */

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json', './packages/*/tsconfig.json', './services/*/tsconfig.json', './apps/*/tsconfig.json']
  },
  plugins: [
    '@typescript-eslint',
    'security',
    'import',
    'node',
    'promise'
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/ban-ts-comment': ['error', {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': false,
      'ts-nocheck': false,
      'ts-check': false
    }],

    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',

    // Import rules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-unused-modules': 'warn',
    'import/no-deprecated': 'warn',

    // Node.js rules
    'node/no-deprecated-api': 'error',
    'node/no-extraneous-import': 'error',
    'node/no-missing-import': 'off', // Handled by TypeScript
    'node/no-unpublished-import': 'off',
    'node/no-unsupported-features/es-syntax': 'off',

    // Promise rules
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-native': 'off',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/avoid-new': 'off',
    'promise/no-new-statics': 'error',
    'promise/no-return-in-finally': 'warn',
    'promise/valid-params': 'warn',

    // General ESLint rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-proto': 'error',
    'no-iterator': 'error',
    'no-caller': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-invalid-this': 'error',
    'no-multi-spaces': 'error',
    'no-multi-str': 'error',
    'no-new-wrappers': 'error',
    'no-throw-literal': 'error',
    'no-with': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-unused-expressions': 'error',
    'no-useless-concat': 'error',
    'no-useless-escape': 'error',
    'no-void': 'error',
    'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack'], location: 'start' }],
    'radix': 'error',
    'yoda': 'error',

    // Style rules
    'array-bracket-spacing': ['error', 'never'],
    'block-spacing': 'error',
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'comma-dangle': ['error', 'never'],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'eol-last': 'error',
    'func-call-spacing': 'error',
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'linebreak-style': ['error', 'unix'],
    'max-len': ['error', { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'new-cap': 'error',
    'new-parens': 'error',
    'no-array-constructor': 'error',
    'no-mixed-spaces-and-tabs': 'error',
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    'no-new-object': 'error',
    'no-tabs': 'error',
    'no-trailing-spaces': 'error',
    'object-curly-spacing': ['error', 'always'],
    'one-var': ['error', 'never'],
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'semi': ['error', 'always'],
    'semi-spacing': 'error',
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    'spaced-comment': ['error', 'always']
  },
  overrides: [
    {
      files: ['*.test.ts', '*.spec.ts', '**/__tests__/**/*.ts'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'security/detect-object-injection': 'off'
      }
    },
    {
      files: ['*.config.js', '*.config.ts', 'jest.setup.js'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: ['apps/frontend/**/*.ts', 'apps/frontend/**/*.tsx'],
      env: {
        browser: true,
        es6: true
      },
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended'
      ],
      plugins: ['react', 'react-hooks', 'jsx-a11y'],
      settings: {
        react: {
          version: 'detect'
        }
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/no-unescaped-entities': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'jsx-a11y/anchor-is-valid': 'off'
      }
    },
    {
      files: ['services/**/*.ts'],
      rules: {
        'node/no-extraneous-import': 'error',
        'security/detect-child-process': 'error',
        'security/detect-non-literal-fs-filename': 'error'
      }
    },
    {
      files: ['infrastructure/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'security/detect-object-injection': 'off'
      }
    }
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './packages/*/tsconfig.json', './services/*/tsconfig.json', './apps/*/tsconfig.json']
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    '*.min.js',
    'coverage/',
    '.turbo/',
    '.next/',
    'public/',
    '*.generated.ts',
    '*.d.ts'
  ]
};