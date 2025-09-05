/**
 * SMM Architect Build Configuration
 * Shared configuration utilities and constants
 */

export interface BuildTarget {
  name: string;
  platform: 'node' | 'browser' | 'universal';
  environment: 'development' | 'staging' | 'production';
  optimize: boolean;
  sourcemap: boolean;
  typecheck: boolean;
}

export interface PackageConfig {
  name: string;
  version: string;
  description: string;
  main: string;
  types: string;
  exports: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface LintConfig {
  extends: string[];
  rules: Record<string, any>;
  overrides: Array<{
    files: string[];
    rules: Record<string, any>;
  }>;
  ignorePatterns: string[];
}

export interface TestConfig {
  testEnvironment: 'node' | 'jsdom';
  setupFilesAfterEnv: string[];
  testMatch: string[];
  collectCoverageFrom: string[];
  coverageThreshold: {
    global: {
      branches: number;
      functions: number;
      lines: number;
      statements: number;
    };
  };
  moduleNameMapping: Record<string, string>;
}

export const BUILD_TARGETS: Record<string, BuildTarget> = {
  'node-dev': {
    name: 'node-development',
    platform: 'node',
    environment: 'development',
    optimize: false,
    sourcemap: true,
    typecheck: true
  },
  'node-prod': {
    name: 'node-production',
    platform: 'node',
    environment: 'production',
    optimize: true,
    sourcemap: false,
    typecheck: true
  },
  'browser-dev': {
    name: 'browser-development',
    platform: 'browser',
    environment: 'development',
    optimize: false,
    sourcemap: true,
    typecheck: true
  },
  'browser-prod': {
    name: 'browser-production',
    platform: 'browser',
    environment: 'production',
    optimize: true,
    sourcemap: false,
    typecheck: true
  }
};

export const DEFAULT_DEPENDENCIES = {
  typescript: '^5.0.0',
  '@types/node': '^18.0.0',
  eslint: '^8.0.0',
  jest: '^29.0.0',
  prettier: '^3.0.0'
};

export const SHARED_SCRIPTS = {
  build: 'tsc --build',
  'build:watch': 'tsc --build --watch',
  clean: 'rm -rf dist .turbo',
  lint: 'eslint src --ext .ts,.tsx',
  'lint:fix': 'eslint src --ext .ts,.tsx --fix',
  test: 'jest',
  'test:watch': 'jest --watch',
  'test:coverage': 'jest --coverage',
  typecheck: 'tsc --noEmit'
};

/**
 * Generate package.json configuration
 */
export function generatePackageConfig(overrides: Partial<PackageConfig>): PackageConfig {
  return {
    name: '',
    version: '1.0.0',
    description: '',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    exports: {
      '.': {
        require: './dist/index.js',
        import: './dist/index.mjs',
        types: './dist/index.d.ts'
      }
    },
    scripts: SHARED_SCRIPTS,
    dependencies: {},
    devDependencies: DEFAULT_DEPENDENCIES,
    ...overrides
  };
}

/**
 * Generate TypeScript configuration
 */
export function generateTsConfig(options: {
  target?: 'node' | 'browser';
  moduleResolution?: 'node' | 'bundler';
  strict?: boolean;
  baseUrl?: string;
  paths?: Record<string, string[]>;
  include?: string[];
  exclude?: string[];
}): any {
  const {
    target = 'node',
    moduleResolution = 'node',
    strict = true,
    baseUrl = '.',
    paths = {},
    include = ['src/**/*'],
    exclude = ['dist', 'node_modules', '**/*.test.ts', '**/*.spec.ts']
  } = options;

  return {
    compilerOptions: {
      target: target === 'browser' ? 'ES2020' : 'ES2022',
      lib: target === 'browser' ? ['ES2020', 'DOM', 'DOM.Iterable'] : ['ES2022'],
      module: 'CommonJS',
      moduleResolution,
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict,
      noImplicitAny: strict,
      strictNullChecks: strict,
      strictFunctionTypes: strict,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      skipLibCheck: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      outDir: 'dist',
      baseUrl,
      paths,
      experimentalDecorators: true,
      emitDecoratorMetadata: true
    },
    include,
    exclude
  };
}

/**
 * Generate Jest configuration
 */
export function generateJestConfig(options: Partial<TestConfig> = {}): TestConfig {
  return {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: [
      '<rootDir>/src/**/*.test.ts',
      '<rootDir>/src/**/*.spec.ts',
      '<rootDir>/tests/**/*.test.ts',
      '<rootDir>/tests/**/*.spec.ts'
    ],
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/**/*.test.ts',
      '!src/**/*.spec.ts',
      '!src/index.ts'
    ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    moduleNameMapping: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '^~/(.*)$': '<rootDir>/$1'
    },
    ...options
  };
}

/**
 * Generate ESLint configuration
 */
export function generateEslintConfig(options: {
  target?: 'node' | 'browser' | 'react';
  strict?: boolean;
  security?: boolean;
}): LintConfig {
  const { target = 'node', strict = true, security = true } = options;

  const baseExtends = [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ];

  if (strict) {
    baseExtends.push('plugin:@typescript-eslint/recommended-requiring-type-checking');
  }

  if (target === 'react') {
    baseExtends.push('plugin:react/recommended', 'plugin:react-hooks/recommended');
  }

  const plugins = ['@typescript-eslint'];
  
  if (security) {
    plugins.push('security');
  }

  if (target === 'react') {
    plugins.push('react', 'react-hooks');
  }

  return {
    extends: baseExtends,
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': strict ? 'error' : 'warn',
      '@typescript-eslint/no-explicit-any': strict ? 'error' : 'warn',
      ...(security && {
        'security/detect-object-injection': 'error',
        'security/detect-non-literal-fs-filename': 'warn',
        'security/detect-unsafe-regex': 'error'
      }),
      ...(target === 'react' && {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off'
      })
    },
    overrides: [
      {
        files: ['*.test.ts', '*.spec.ts'],
        rules: {
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/no-non-null-assertion': 'off'
        }
      }
    ],
    ignorePatterns: [
      'dist/',
      'build/',
      'node_modules/',
      '*.min.js',
      'coverage/',
      '.turbo/'
    ]
  };
}

/**
 * Environment variable helpers
 */
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test'
};

/**
 * Path helpers
 */
export const PATHS = {
  ROOT: process.cwd(),
  SRC: 'src',
  DIST: 'dist',
  TESTS: 'tests',
  NODE_MODULES: 'node_modules'
};

/**
 * Build utilities
 */
export class BuildUtils {
  static getVersion(): string {
    try {
      const pkg = require(`${PATHS.ROOT}/package.json`);
      return pkg.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  static getBuildTarget(): BuildTarget {
    const target = process.env.BUILD_TARGET || 'node-dev';
    return BUILD_TARGETS[target] || BUILD_TARGETS['node-dev'];
  }

  static isMonorepo(): boolean {
    try {
      const pkg = require(`${PATHS.ROOT}/package.json`);
      return Boolean(pkg.workspaces);
    } catch {
      return false;
    }
  }

  static getWorkspaces(): string[] {
    try {
      const pkg = require(`${PATHS.ROOT}/package.json`);
      return pkg.workspaces || [];
    } catch {
      return [];
    }
  }
}

export default {
  BUILD_TARGETS,
  DEFAULT_DEPENDENCIES,
  SHARED_SCRIPTS,
  generatePackageConfig,
  generateTsConfig,
  generateJestConfig,
  generateEslintConfig,
  ENV,
  PATHS,
  BuildUtils
};