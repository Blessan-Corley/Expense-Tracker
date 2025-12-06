/**
 * Test Setup File
 * 
 * Runs before each test file.
 * Configures environment and extends Jest matchers.
 */

// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests-only';

// Use the same database URL as the app (set in CI or local .env)
// Tests will clean up after themselves

// Increase timeout for integration tests
jest.setTimeout(30000);

// Custom Jest matchers
expect.extend({
    /**
     * Check if value is a valid Date object
     */
    toBeValidDate(received) {
        const pass = received instanceof Date && !isNaN(received.getTime());
        return {
            message: () => `expected ${received} to be a valid Date`,
            pass
        };
    },

    /**
     * Check if value is a positive number
     */
    toBePositiveNumber(received) {
        const pass = typeof received === 'number' && received > 0;
        return {
            message: () => `expected ${received} to be a positive number`,
            pass
        };
    },

    /**
     * Check if value is a valid UUID/CUID
     */
    toBeValidId(received) {
        const pass = typeof received === 'string' && received.length > 10;
        return {
            message: () => `expected ${received} to be a valid ID string`,
            pass
        };
    }
});

// Suppress console logs during tests unless debugging
if (process.env.DEBUG !== 'true') {
    const originalConsole = { ...console };

    global.console = {
        ...originalConsole,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        // Keep warn and error for debugging test failures
        warn: originalConsole.warn,
        error: originalConsole.error
    };
}

// Global test utilities
global.testUtils = {
    /**
     * Wait for a specified number of milliseconds
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Generate a unique email for tests
     */
    uniqueEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,

    /**
     * Generate a future date
     */
    futureDate: (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
};
