/**
 * Global Setup for Integration Tests
 * 
 * Runs once before all test suites.
 * Sets up the test database and environment.
 */
const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

function isSafeTestDatabaseUrl(databaseUrl) {
    try {
        const parsed = new URL(databaseUrl);
        const host = (parsed.hostname || '').toLowerCase();
        const dbName = (parsed.pathname || '').replace(/^\//, '').toLowerCase();
        const localHosts = new Set(['localhost', '127.0.0.1']);
        const looksLikeTestDb = /(^|[-_])test($|[-_])/.test(dbName);

        return localHosts.has(host) || looksLikeTestDb;
    } catch {
        return false;
    }
}

module.exports = async () => {
    console.log('Setting up test environment');

    // Set test environment
    process.env.NODE_ENV = 'test';
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    // Prefer TEST_DATABASE_URL so tests never accidentally touch production data.
    const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDatabaseUrl) {
        throw new Error('TEST_DATABASE_URL (or DATABASE_URL) is required for tests with PostgreSQL provider');
    }

    const allowDangerousReset = process.env.ALLOW_DANGEROUS_TEST_DB_RESET === 'true';
    if (!isSafeTestDatabaseUrl(testDatabaseUrl) && !allowDangerousReset) {
        throw new Error(
            'Refusing to reset a non-test database. Set TEST_DATABASE_URL to a dedicated test DB ' +
            'or explicitly set ALLOW_DANGEROUS_TEST_DB_RESET=true.'
        );
    }

    process.env.DATABASE_URL = testDatabaseUrl;

    // DIRECT_URL required for Prisma schema (Neon uses direct for migrations)
    // Fallback to DATABASE_URL for local Postgres / backward compatibility
    if (!process.env.DIRECT_URL) {
        process.env.DIRECT_URL = process.env.DATABASE_URL;
    }

    // Set a test JWT secret
    process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-only';

    try {
        // Assume Prisma client is already generated to avoid Windows file locks
        console.log('Setting up test database');
        execSync('node scripts/prisma-with-env.js db push --force-reset --accept-data-loss', {
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe',
            env: {
                ...process.env,
                DATABASE_URL: process.env.DATABASE_URL,
                DIRECT_URL: process.env.DIRECT_URL,
                ALLOW_DESTRUCTIVE_DB_COMMANDS: 'true'
            }
        });

        console.log('Test environment ready');
    } catch (error) {
        console.error('Failed to set up test environment:', error.message);
        throw error;
    }
};
