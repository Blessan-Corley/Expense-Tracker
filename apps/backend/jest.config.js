/**
 * Jest Configuration for Backend Tests
 * 
 * Configures Jest to run integration tests against PostgreSQL.
 */
module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Root directory
    rootDir: '.',

    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],

    // Setup files - run before each test file
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Global setup/teardown
    globalSetup: '<rootDir>/tests/globalSetup.js',
    globalTeardown: '<rootDir>/tests/globalTeardown.js',

    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js', // Exclude server startup
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

    // Timeout for async tests (30 seconds for database operations)
    testTimeout: 30000,

    // Verbose output
    verbose: true,

    // Force exit after tests complete
    forceExit: true,

    // Detect open handles (helps debug hanging tests)
    detectOpenHandles: true,

    // Clear mocks between tests
    clearMocks: true,

    // Run tests serially in one process for database consistency
    maxWorkers: 1,

    // Module name mapper for path aliases
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};
