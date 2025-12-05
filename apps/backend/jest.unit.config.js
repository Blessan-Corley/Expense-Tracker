/**
 * Jest Configuration for Unit Tests Only (no database)
 * Run with: npm run test:unit
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/tests/unit/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
};
