import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    '<rootDir>/shared/validation-utils.ts',
    '<rootDir>/shared/http-utils.ts',
    '<rootDir>/shared/azure-logger.ts',
    '<rootDir>/auth/token.ts',
    '<rootDir>/users/**/*.ts',
    '<rootDir>/health/**/*.ts',
    '<rootDir>/src/feed/**/*.ts',
    '!<rootDir>/**/__tests__/**',
    '!<rootDir>/**/index.d.ts',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/health/index.ts',
  ],
  testPathIgnorePatterns: [
    // Ignore WIP/placeholder test files until implementation
    'voteOnAppeal.*\\.test\\.ts',
    'reviewAppealedContent.*\\.test\\.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.tests.json',
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  verbose: false,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
};

export default config;
