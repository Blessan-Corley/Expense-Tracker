/**
 * Test Helpers and Utilities
 * 
 * Common utilities for integration tests.
 * Provides database helpers, authentication helpers, and test data factories.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Create a separate Prisma client for tests
const prisma = new PrismaClient();

/**
 * Database Helpers
 */
const db = {
    /**
     * Connect to the test database
     */
    async connect() {
        await prisma.$connect();
    },

    /**
     * Disconnect from the test database
     */
    async disconnect() {
        await prisma.$disconnect();
    },

    /**
     * Clear all data from the database
     */
    async clear() {
        const tablenames = ['Transaction', 'RecurringTransaction', 'Goal', 'User'];

        for (const table of tablenames) {
            try {
                await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
            } catch (error) {
                // Table might not exist yet, ignore
            }
        }
    },

    /**
     * Get the Prisma client instance
     */
    get client() {
        return prisma;
    }
};

/**
 * Authentication Helpers
 */
const auth = {
    /**
     * Create a test user and return user data with token
     */
    async createUser(userData = {}) {
        const defaultData = {
            email: `test-${Date.now()}@example.com`,
            name: 'Test User',
            password: 'password123',
            monthlyBudget: 50000
        };

        const data = { ...defaultData, ...userData };
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: hashedPassword,
                monthlyBudget: data.monthlyBudget
            }
        });

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return {
            user,
            token,
            password: data.password // Return plain password for login tests
        };
    },

    /**
     * Generate a JWT token for a user
     */
    generateToken(userId, expiresIn = '1h') {
        return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
    },

    /**
     * Generate an expired token for testing
     */
    generateExpiredToken(userId) {
        return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '-1h' });
    },

    /**
     * Generate an invalid token
     */
    generateInvalidToken() {
        return 'invalid-token-string';
    }
};

/**
 * Test Data Factories
 */
const factories = {
    /**
     * Create a transaction
     */
    async createTransaction(userId, data = {}) {
        const defaultData = {
            type: 'EXPENSE',
            amount: 1000,
            category: 'Food & Dining',
            description: 'Test transaction',
            date: new Date(),
            paymentMethod: 'Cash',
            tags: [],
            attachments: []
        };

        return prisma.transaction.create({
            data: {
                ...defaultData,
                ...data,
                userId
            }
        });
    },

    /**
     * Create multiple transactions
     */
    async createTransactions(userId, count = 5) {
        const transactions = [];
        for (let i = 0; i < count; i++) {
            const tx = await this.createTransaction(userId, {
                description: `Test transaction ${i + 1}`,
                amount: (i + 1) * 100
            });
            transactions.push(tx);
        }
        return transactions;
    },

    /**
     * Create a goal
     */
    async createGoal(userId, data = {}) {
        const defaultData = {
            title: 'Test Goal',
            description: 'A test goal',
            targetAmount: 100000,
            currentAmount: 0,
            targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            category: 'OTHER',
            priority: 'MEDIUM'
        };

        return prisma.goal.create({
            data: {
                ...defaultData,
                ...data,
                userId
            }
        });
    },

    /**
     * Create a recurring transaction
     */
    async createRecurringTransaction(userId, data = {}) {
        const defaultData = {
            type: 'EXPENSE',
            amount: 1000,
            category: 'Subscriptions',
            description: 'Test recurring',
            paymentMethod: 'Card',
            frequency: 'MONTHLY',
            nextDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true
        };

        return prisma.recurringTransaction.create({
            data: {
                ...defaultData,
                ...data,
                userId
            }
        });
    }
};

/**
 * Request Helpers
 */
const request = {
    /**
     * Add authorization header to supertest request
     */
    withAuth(agent, token) {
        return agent.set('Authorization', `Bearer ${token}`);
    }
};

module.exports = {
    db,
    auth,
    factories,
    request,
    prisma
};
