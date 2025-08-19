import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    // Ignore WIP/placeholder test files until implementation
    'voteOnAppeal.*\\.test\\.ts',
    'reviewAppealedContent.*\\.test\\.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.tests.json'
    }],
  },
  verbose: false
};

export default config;
