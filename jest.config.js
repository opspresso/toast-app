module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/renderer/pages/**/*.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  verbose: true,
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {},
  // Mock electron modules
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/mocks/electron.js',
  },
};
