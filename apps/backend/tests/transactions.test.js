/**
 * Transactions Integration Tests
 * 
 * Tests the complete transactions flow against a real database.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const prisma = require('../src/lib/prisma');

describe('Transactions API - Integration Tests', () => {
  let testUser;
  let authToken;

  // Setup test user before all tests
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Transaction Test User',
        email: `transactions-test-${Date.now()}@example.com`,
        password: hashedPassword,
        monthlyBudget: 50000
      }
    });

    authToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // Clean up transactions before each test
  beforeEach(async () => {
    await prisma.transaction.deleteMany({
      where: { userId: testUser.id }
    });
  });

  // Clean up after all tests
  afterAll(async () => {
    if (testUser) {
      await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
      await prisma.goal.deleteMany({ where: { userId: testUser.id } });
      await prisma.recurringTransaction.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/transactions', () => {
    it('should create an expense transaction', async () => {
      const transactionData = {
        type: 'EXPENSE',
        amount: 500,
        category: 'Food & Dining',
        description: 'Lunch at restaurant',
        date: new Date().toISOString(),
        paymentMethod: 'Card'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Transaction created successfully');
      expect(response.body).toHaveProperty('transaction');
      expect(response.body.transaction.type).toBe('EXPENSE');
      expect(response.body.transaction.amount).toBe(500);
      expect(response.body.transaction.category).toBe('Food & Dining');

      // Verify transaction was created in database
      const dbTransaction = await prisma.transaction.findUnique({
        where: { id: response.body.transaction.id }
      });
      expect(dbTransaction).not.toBeNull();
      expect(dbTransaction.userId).toBe(testUser.id);
    });

    it('should create an income transaction', async () => {
      const transactionData = {
        type: 'INCOME',
        amount: 75000,
        category: 'Salary',
        description: 'Monthly salary',
        date: new Date().toISOString(),
        paymentMethod: 'Bank Transfer'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.transaction.type).toBe('INCOME');
      expect(response.body.transaction.amount).toBe(75000);
      expect(response.body.transaction.category).toBe('Salary');
    });

    it('should create transaction with optional fields', async () => {
      const transactionData = {
        type: 'EXPENSE',
        amount: 1500,
        category: 'Shopping',
        description: 'New shoes',
        date: new Date().toISOString(),
        paymentMethod: 'Card',
        location: 'Mall',
        notes: 'Birthday gift for myself',
        tags: ['personal', 'clothing']
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.transaction.location).toBe('Mall');
      expect(response.body.transaction.notes).toBe('Birthday gift for myself');
      expect(response.body.transaction.tags).toContain('personal');
    });

    it('should reject transaction with invalid category for expense', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'EXPENSE',
          amount: 100,
          category: 'Salary', // Income category for expense
          description: 'Test',
          date: new Date().toISOString(),
          paymentMethod: 'Cash'
        })
        .expect(400);

      expect(response.body.message).toMatch(/Invalid category/i);
    });

    it('should reject transaction with invalid category for income', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'INCOME',
          amount: 100,
          category: 'Food & Dining', // Expense category for income
          description: 'Test',
          date: new Date().toISOString(),
          paymentMethod: 'Cash'
        })
        .expect(400);

      expect(response.body.message).toMatch(/Invalid category/i);
    });

    it('should reject transaction with negative amount', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'EXPENSE',
          amount: -100,
          category: 'Food & Dining',
          description: 'Test',
          date: new Date().toISOString(),
          paymentMethod: 'Cash'
        })
        .expect(400);

      expect(response.body.message).toMatch(/amount/i);
    });

    it('should reject transaction with invalid payment method', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'EXPENSE',
          amount: 100,
          category: 'Food & Dining',
          description: 'Test',
          date: new Date().toISOString(),
          paymentMethod: 'Bitcoin' // Invalid payment method
        })
        .expect(400);

      expect(response.body.message).toMatch(/paymentMethod/i);
    });

    it('should reject transaction without authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'EXPENSE',
          amount: 100,
          category: 'Food & Dining',
          description: 'Test',
          date: new Date().toISOString(),
          paymentMethod: 'Cash'
        })
        .expect(401);

      expect(response.body.message).toBe('No token, authorization denied');
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Create sample transactions
      const transactions = [
        {
          type: 'EXPENSE',
          amount: 500,
          category: 'Food & Dining',
          description: 'Restaurant dinner',
          date: new Date('2025-01-15'),
          paymentMethod: 'Card',
          tags: ['dining'],
          attachments: [],
          userId: testUser.id
        },
        {
          type: 'EXPENSE',
          amount: 2000,
          category: 'Transportation',
          description: 'Uber rides',
          date: new Date('2025-01-10'),
          paymentMethod: 'UPI',
          tags: [],
          attachments: [],
          userId: testUser.id
        },
        {
          type: 'INCOME',
          amount: 75000,
          category: 'Salary',
          description: 'Monthly salary',
          date: new Date('2025-01-01'),
          paymentMethod: 'Bank Transfer',
          tags: [],
          attachments: [],
          userId: testUser.id
        }
      ];

      for (const tx of transactions) {
        await prisma.transaction.create({ data: tx });
      }
    });

    it('should return all transactions for user', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body.transactions).toHaveLength(3);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter transactions by type', async () => {
      const response = await request(app)
        .get('/api/transactions?type=EXPENSE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      response.body.transactions.forEach(tx => {
        expect(tx.type).toBe('EXPENSE');
      });
    });

    it('should filter transactions by category', async () => {
      const response = await request(app)
        .get('/api/transactions?category=Food%20%26%20Dining')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].category).toBe('Food & Dining');
    });

    it('should filter transactions by date range', async () => {
      const response = await request(app)
        .get('/api/transactions?startDate=2025-01-10&endDate=2025-01-20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
    });

    it('should search transactions by description', async () => {
      const response = await request(app)
        .get('/api/transactions?search=salary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].description).toMatch(/salary/i);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/transactions?limit=2&page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.pagination.current).toBe(1);
    });

    it('should cap limit to maximum 100', async () => {
      const response = await request(app)
        .get('/api/transactions?limit=999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should return transactions sorted by date descending', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const dates = response.body.transactions.map(tx => new Date(tx.date));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
      }
    });

    it('should filter by visibility status', async () => {
      await prisma.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 300,
          category: 'Shopping',
          description: 'Hidden transaction',
          date: new Date('2025-01-16'),
          paymentMethod: 'Card',
          tags: [],
          attachments: [],
          isHidden: true,
          userId: testUser.id
        }
      });

      const hiddenResponse = await request(app)
        .get('/api/transactions?visibility=hidden')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(hiddenResponse.body.transactions.length).toBe(1);
      hiddenResponse.body.transactions.forEach(tx => {
        expect(tx.isHidden).toBe(true);
      });

      const visibleResponse = await request(app)
        .get('/api/transactions?visibility=visible')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(visibleResponse.body.transactions.length).toBe(3);
      visibleResponse.body.transactions.forEach(tx => {
        expect(tx.isHidden).toBe(false);
      });
    });
  });

  describe('PUT /api/transactions/:id', () => {
    let existingTransaction;

    beforeEach(async () => {
      existingTransaction = await prisma.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 1000,
          category: 'Food & Dining',
          description: 'Original description',
          date: new Date(),
          paymentMethod: 'Cash',
          tags: [],
          attachments: [],
          userId: testUser.id
        }
      });
    });

    it('should update an existing transaction', async () => {
      const updateData = {
        type: 'EXPENSE',
        amount: 1500,
        category: 'Shopping',
        description: 'Updated description',
        date: new Date().toISOString(),
        paymentMethod: 'Card'
      };

      const response = await request(app)
        .put(`/api/transactions/${existingTransaction.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Transaction updated successfully');
      expect(response.body.transaction.amount).toBe(1500);
      expect(response.body.transaction.category).toBe('Shopping');
      expect(response.body.transaction.description).toBe('Updated description');

      // Verify in database
      const dbTransaction = await prisma.transaction.findUnique({
        where: { id: existingTransaction.id }
      });
      expect(Number(dbTransaction.amount)).toBe(1500);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .put('/api/transactions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'EXPENSE',
          amount: 1000,
          category: 'Food & Dining',
          description: 'Test',
          date: new Date().toISOString(),
          paymentMethod: 'Cash'
        })
        .expect(404);

      expect(response.body.message).toBe('Transaction not found');
    });

    it('should not allow updating another user\'s transaction', async () => {
      // Create another user and their transaction
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: `other-${Date.now()}@example.com`,
          password: 'hashed'
        }
      });

      const otherTransaction = await prisma.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 500,
          category: 'Food & Dining',
          description: 'Other user transaction',
          date: new Date(),
          paymentMethod: 'Cash',
          tags: [],
          attachments: [],
          userId: otherUser.id
        }
      });

      const response = await request(app)
        .put(`/api/transactions/${otherTransaction.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'EXPENSE',
          amount: 1000,
          category: 'Food & Dining',
          description: 'Hacked!',
          date: new Date().toISOString(),
          paymentMethod: 'Cash'
        })
        .expect(404);

      expect(response.body.message).toBe('Transaction not found');

      // Cleanup
      await prisma.transaction.delete({ where: { id: otherTransaction.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    let transactionToDelete;

    beforeEach(async () => {
      transactionToDelete = await prisma.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 500,
          category: 'Food & Dining',
          description: 'To be deleted',
          date: new Date(),
          paymentMethod: 'Cash',
          tags: [],
          attachments: [],
          userId: testUser.id
        }
      });
    });

    it('should delete a transaction', async () => {
      const response = await request(app)
        .delete(`/api/transactions/${transactionToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Transaction deleted successfully');

      // Verify deletion in database
      const dbTransaction = await prisma.transaction.findUnique({
        where: { id: transactionToDelete.id }
      });
      expect(dbTransaction).toBeNull();
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .delete('/api/transactions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Transaction not found');
    });
  });

  describe('PATCH /api/transactions/:id/visibility', () => {
    let existingTransaction;

    beforeEach(async () => {
      existingTransaction = await prisma.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 450,
          category: 'Food & Dining',
          description: 'Visibility test',
          date: new Date(),
          paymentMethod: 'Cash',
          tags: [],
          attachments: [],
          userId: testUser.id
        }
      });
    });

    it('should hide and unhide a transaction', async () => {
      const hideResponse = await request(app)
        .patch(`/api/transactions/${existingTransaction.id}/visibility`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isHidden: true })
        .expect(200);

      expect(hideResponse.body.transaction.isHidden).toBe(true);

      const unhideResponse = await request(app)
        .patch(`/api/transactions/${existingTransaction.id}/visibility`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isHidden: false })
        .expect(200);

      expect(unhideResponse.body.transaction.isHidden).toBe(false);
    });

    it('should reject invalid visibility payload', async () => {
      await request(app)
        .patch(`/api/transactions/${existingTransaction.id}/visibility`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isHidden: 'yes' })
        .expect(400);
    });
  });

  describe('GET /api/transactions/analytics', () => {
    beforeEach(async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Create transactions for current month
      await prisma.transaction.createMany({
        data: [
          {
            type: 'INCOME',
            amount: 75000,
            category: 'Salary',
            description: 'Salary',
            date: new Date(currentYear, currentMonth, 1),
            paymentMethod: 'Bank Transfer',
            tags: [],
            attachments: [],
            userId: testUser.id
          },
          {
            type: 'EXPENSE',
            amount: 10000,
            category: 'Food & Dining',
            description: 'Food',
            date: new Date(currentYear, currentMonth, 5),
            paymentMethod: 'Card',
            tags: [],
            attachments: [],
            userId: testUser.id
          },
          {
            type: 'EXPENSE',
            amount: 5000,
            category: 'Transportation',
            description: 'Transport',
            date: new Date(currentYear, currentMonth, 10),
            paymentMethod: 'UPI',
            tags: [],
            attachments: [],
            userId: testUser.id
          }
        ]
      });
    });

    it('should return comprehensive analytics', async () => {
      const response = await request(app)
        .get('/api/transactions/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('monthly');
      expect(response.body.monthly).toHaveProperty('income');
      expect(response.body.monthly).toHaveProperty('expenses');
      expect(response.body.monthly).toHaveProperty('netIncome');
      expect(response.body.monthly).toHaveProperty('savingsRate');

      expect(response.body).toHaveProperty('yearly');
      expect(response.body).toHaveProperty('categoryBreakdown');
      expect(response.body).toHaveProperty('monthlyTrends');
      expect(response.body).toHaveProperty('recentTransactions');
      expect(response.body).toHaveProperty('budget');
    });

    it('should calculate monthly totals correctly', async () => {
      const response = await request(app)
        .get('/api/transactions/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.monthly.income).toBe(75000);
      expect(response.body.monthly.expenses).toBe(15000);
      expect(response.body.monthly.netIncome).toBe(60000);
    });

    it('should calculate savings rate correctly', async () => {
      const response = await request(app)
        .get('/api/transactions/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Savings rate = (75000 - 15000) / 75000 * 100 = 80%
      expect(response.body.monthly.savingsRate).toBe(80);
    });

    it('should include category breakdown', async () => {
      const response = await request(app)
        .get('/api/transactions/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.categoryBreakdown).toHaveProperty('expenses');
      expect(response.body.categoryBreakdown).toHaveProperty('income');
      expect(response.body.categoryBreakdown.expenses.length).toBeGreaterThan(0);
    });

    it('should include quarterly/yearly metrics and trend series', async () => {
      const response = await request(app)
        .get('/api/transactions/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('quarterly');
      expect(response.body).toHaveProperty('yearly');
      expect(response.body.quarterly).toHaveProperty('income');
      expect(response.body.quarterly).toHaveProperty('expenses');
      expect(response.body.quarterly).toHaveProperty('categoryBreakdown');
      expect(response.body.yearly).toHaveProperty('categoryBreakdown');
      expect(Array.isArray(response.body.quarterlyTrends)).toBe(true);
      expect(Array.isArray(response.body.yearlyTrends)).toBe(true);
      expect(response.body.quarterlyTrends.length).toBeGreaterThan(0);
      expect(response.body.yearlyTrends.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/transactions/report', () => {
    beforeEach(async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      await prisma.transaction.createMany({
        data: [
          {
            type: 'INCOME',
            amount: 10000,
            category: 'Salary',
            description: 'Income for report',
            date: new Date(currentYear, currentMonth, 2),
            paymentMethod: 'Bank Transfer',
            tags: [],
            attachments: [],
            userId: testUser.id
          },
          {
            type: 'EXPENSE',
            amount: 2500,
            category: 'Food & Dining',
            description: 'Expense for report',
            date: new Date(currentYear, currentMonth, 3),
            paymentMethod: 'Card',
            tags: ['report'],
            attachments: [],
            userId: testUser.id
          }
        ]
      });
    });

    it('should generate a monthly CSV report', async () => {
      const response = await request(app)
        .get('/api/transactions/report?timeframe=monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /text\/csv/)
        .expect(200);

      expect(response.text).toContain('Expense Tracker Report');
      expect(response.text).toContain('Timeframe,monthly');
      expect(response.text).toContain('Transactions');
    });

    it('should generate quarterly and yearly CSV reports', async () => {
      const quarterlyResponse = await request(app)
        .get('/api/transactions/report?timeframe=quarterly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /text\/csv/)
        .expect(200);

      const yearlyResponse = await request(app)
        .get('/api/transactions/report?timeframe=yearly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /text\/csv/)
        .expect(200);

      expect(quarterlyResponse.text).toContain('Timeframe,quarterly');
      expect(yearlyResponse.text).toContain('Timeframe,yearly');
    });

    it('should scale planned budget by timeframe in report summary', async () => {
      const monthlyResponse = await request(app)
        .get('/api/transactions/report?timeframe=monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const quarterlyResponse = await request(app)
        .get('/api/transactions/report?timeframe=quarterly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const yearlyResponse = await request(app)
        .get('/api/transactions/report?timeframe=yearly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(monthlyResponse.text).toContain('Planned Budget,50000.00');
      expect(quarterlyResponse.text).toContain('Planned Budget,150000.00');
      expect(yearlyResponse.text).toContain('Planned Budget,600000.00');
    });

    it('should reject invalid timeframe values', async () => {
      await request(app)
        .get('/api/transactions/report?timeframe=weekly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/transactions/categories', () => {
    it('should return available categories', async () => {
      const response = await request(app)
        .get('/api/transactions/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('income');
      expect(response.body).toHaveProperty('expense');
      expect(Array.isArray(response.body.income)).toBe(true);
      expect(Array.isArray(response.body.expense)).toBe(true);
      expect(response.body.income).toContain('Salary');
      expect(response.body.expense).toContain('Food & Dining');
    });
  });
});
