import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/src/__tests__/**/*.test.ts',
    '**/src/**/*.test.ts',
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
