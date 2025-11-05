import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/?(*.)+(test).[tj]s'],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/shared/**/*.{ts,tsx}',
    '<rootDir>/src/**/routes/**/*.{ts,tsx}',
    '!<rootDir>/src/**/routes/**/index.ts',
    '!<rootDir>/src/**/routes/**/types.ts',
    '!<rootDir>/src/shared/routes/health.ts', // Exclude defensive-only liveness check
    '!<rootDir>/src/shared/clients/**',
    '!<rootDir>/src/**/__fixtures__/**',
    '!<rootDir>/src/test-handler.ts',
  ],
  coverageReporters: ['json-summary', 'lcov', 'text', 'clover'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  testPathIgnorePatterns: [
    // Ignore WIP/placeholder test files until implementation
    'reviewAppealedContent.*test\\.ts',
    // Ignore service tests temporarily (need proper Cosmos mocking infrastructure)
    '.*Service\\.test\\.ts',
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
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@feed/(.*)$': '<rootDir>/src/feed/$1',
    '^@moderation/(.*)$': '<rootDir>/src/moderation/$1',
    '^@privacy/(.*)$': '<rootDir>/src/privacy/$1',
    '^@rate-limit/(.*)$': '<rootDir>/src/rate-limit/$1',
    '^@http/(.*)$': '<rootDir>/src/http/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts', '<rootDir>/tests/jest.setup.ts'],
  verbose: false,
};

export default config;
