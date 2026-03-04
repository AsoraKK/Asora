module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/contract/**/*.ts'],
  modulePathIgnorePatterns: ['<rootDir>/temp', '<rootDir>/functions'],
  transformIgnorePatterns: ['/node_modules/'],
};
