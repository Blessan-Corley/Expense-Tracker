/**
 * Global Setup for Integration Tests
 * 
 * Runs once before all test suites.
 * Sets up the test database and environment.
 */
const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

module.exports = async () => {
    console.log('Setting up test environment');

    // Set test environment
    process.env.NODE_ENV = 'test';
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    // Require DATABASE_URL for tests (PostgreSQL provider)
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required for tests with PostgreSQL provider');
    }

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
        execSync('npx prisma db push --force-reset --accept-data-loss', {
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe',
            env: {
                ...process.env,
                DATABASE_URL: process.env.DATABASE_URL,
                DIRECT_URL: process.env.DIRECT_URL
            }
        });

        console.log('Test environment ready');
    } catch (error) {
        console.error('Failed to set up test environment:', error.message);
        throw error;
    }
};
