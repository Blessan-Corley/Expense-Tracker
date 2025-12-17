/**
 * Recurring Process Integration Tests
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const prisma = require('../src/lib/prisma');

describe('Recurring Processing - Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Recurring Test User',
        email: `recurring-test-${Date.now()}@example.com`,
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

  beforeEach(async () => {
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.recurringTransaction.deleteMany({ where: { userId: testUser.id } });
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.recurringTransaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('processes due recurring transactions and creates transactions', async () => {
    const dueDate = new Date(Date.now() - 60 * 60 * 1000);

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: testUser.id,
        type: 'EXPENSE',
        amount: 500,
        category: 'Subscriptions',
        description: 'Test recurring',
        paymentMethod: 'Card',
        frequency: 'MONTHLY',
        nextDate: dueDate,
        isActive: true
      }
    });

    const response = await request(app)
      .post('/api/recurring/process')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.transactions.length).toBe(1);

    const txCount = await prisma.transaction.count({ where: { userId: testUser.id } });
    expect(txCount).toBe(1);

    const updated = await prisma.recurringTransaction.findUnique({ where: { id: recurring.id } });
    expect(updated.isActive).toBe(true);
    expect(new Date(updated.nextDate).getTime()).toBeGreaterThan(dueDate.getTime());
  });
});
