/**
 * Prisma Client Singleton
 * Ensures .env is loaded before Prisma connects (for correct DATABASE_URL).
 */
const { loadEnv } = require('./env');
loadEnv();

const { PrismaClient } = require('@prisma/client');

// Use global to store the client in development to prevent hot-reload issues
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
