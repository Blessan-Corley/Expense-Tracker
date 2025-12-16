/**
 * Transactions Import Integration Tests
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const prisma = require('../src/lib/prisma');

describe('Transactions Import - Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Import Test User',
        email: `import-test-${Date.now()}@example.com`,
        password: hashedPassword,
        monthlyBudget: 10000
      }
    });

    authToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('imports valid CSV transactions', async () => {
    const csv = [
      'Date,Type,Description,Category,Subcategory,Amount,Payment Method,Location,Tags,Notes',
      '2025-01-01,EXPENSE,Groceries,Food & Dining,,1200,Cash,Store,food;monthly,Weekly groceries',
      '2025-01-02,INCOME,Salary,Salary,,50000,Bank Transfer,,salary;income,'
    ].join('\n');

    const response = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(csv, 'utf8'), {
        filename: 'transactions.csv',
        contentType: 'text/csv'
      });

    expect(response.status).toBe(200);
    expect(response.body.imported).toBe(2);

    const count = await prisma.transaction.count({ where: { userId: testUser.id } });
    expect(count).toBe(2);
  });
});
