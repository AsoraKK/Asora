import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/?(*.)+(test).[tj]s'],
  collectCoverageFrom: [
    '<rootDir>/src/shared/**/*.{ts,tsx}',
    '<rootDir>/src/auth/**/*.{ts,tsx}',
    '<rootDir>/src/feed/**/*.{ts,tsx}',
    '<rootDir>/src/moderation/**/*.{ts,tsx}',
    '<rootDir>/src/privacy/**/*.{ts,tsx}',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/src/**/__tests__/**',
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
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@feed/(.*)$': '<rootDir>/src/feed/$1',
    '^@moderation/(.*)$': '<rootDir>/src/moderation/$1',
    '^@privacy/(.*)$': '<rootDir>/src/privacy/$1',
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
