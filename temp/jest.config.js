"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
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
exports.default = config;
//# sourceMappingURL=jest.config.js.map