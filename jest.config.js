module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src', '<rootDir>/agents', '<rootDir>/tools', '<rootDir>/foundry/foundry'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.git/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|mermaid|sharp))'
  ],
  moduleNameMapper: {
    '^@foundry/(.*)$': '<rootDir>/foundry/foundry/$1',
    '^foundry/(.*)$': '<rootDir>/foundry/foundry/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@agents/(.*)$': '<rootDir>/agents/$1',
    '^@tools/(.*)$': '<rootDir>/tools/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@utils/(.*)$': '<rootDir>/tests/utils/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    // Support non-prefixed imports as per AGENTS.md
    '^src/(.*)$': '<rootDir>/src/$1',
    '^agents/(.*)$': '<rootDir>/agents/$1',
    '^tools/(.*)$': '<rootDir>/tools/$1',
    // ESM module mappings
    '^mermaid$': '<rootDir>/node_modules/mermaid/dist/mermaid.esm.min.mjs',
    '^sharp$': '<rootDir>/node_modules/sharp/lib/sharp.js'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'agents/**/*.ts',
    'tools/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/*.test.ts',
    '!**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './agents/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  testTimeout: 30000, // 30 seconds
  slowTestThreshold: 5000, // 5 seconds
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true,
  verbose: true,
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  // Transform configuration
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true
      }
    }]
  },
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts'
};