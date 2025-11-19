/**
 * Database Seed Script
 * 
 * Creates demo user and sample data for testing and development.
 * Run with: npm run db:seed
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log(' Starting database seed...\n');

  // Create a demo user
  const hashedPassword = await bcrypt.hash('demo123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
      monthlyBudget: 50000.00, // 50,000 monthly budget
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
  });

  console.log(' Created demo user:', user.email);

  // Delete existing transactions for clean slate
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.recurringTransaction.deleteMany({ where: { userId: user.id } });

  // Create sample transactions - mix of income and expenses
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const transactions = [
    // Income
    {
      type: 'INCOME',
      amount: 75000.00,
      category: 'Salary',
      description: 'Monthly salary - January',
      date: new Date(currentYear, currentMonth, 1),
      paymentMethod: 'Bank Transfer',
      tags: ['salary', 'primary-income'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'INCOME',
      amount: 15000.00,
      category: 'Freelance',
      description: 'Web development project',
      date: new Date(currentYear, currentMonth, 10),
      paymentMethod: 'UPI',
      tags: ['freelance', 'web-development'],
      attachments: [],
      userId: user.id,
    },
    // Expenses
    {
      type: 'EXPENSE',
      amount: 8500.00,
      category: 'Food & Dining',
      description: 'Monthly groceries from BigBasket',
      date: new Date(currentYear, currentMonth, 5),
      paymentMethod: 'UPI',
      location: 'Online',
      tags: ['groceries', 'monthly'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 2500.00,
      category: 'Food & Dining',
      description: 'Dinner at local restaurant',
      date: new Date(currentYear, currentMonth, 15),
      paymentMethod: 'Card',
      location: 'Mumbai',
      tags: ['dining-out'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 3200.00,
      category: 'Transportation',
      description: 'Uber rides for commute',
      date: new Date(currentYear, currentMonth, 8),
      paymentMethod: 'UPI',
      tags: ['transportation', 'uber'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 4500.00,
      category: 'Transportation',
      description: 'Petrol for car',
      date: new Date(currentYear, currentMonth, 12),
      paymentMethod: 'Card',
      location: 'HP Petrol Pump',
      tags: ['fuel', 'car'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 2999.00,
      category: 'Shopping',
      description: 'Amazon - Electronics',
      date: new Date(currentYear, currentMonth, 7),
      paymentMethod: 'Card',
      location: 'Online',
      tags: ['electronics', 'online-shopping'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 15000.00,
      category: 'Bills & Utilities',
      description: 'House rent',
      date: new Date(currentYear, currentMonth, 1),
      paymentMethod: 'Bank Transfer',
      tags: ['rent', 'monthly'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 1500.00,
      category: 'Bills & Utilities',
      description: 'Electricity bill',
      date: new Date(currentYear, currentMonth, 5),
      paymentMethod: 'UPI',
      tags: ['utilities', 'electricity'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 999.00,
      category: 'Subscriptions',
      description: 'Netflix subscription',
      date: new Date(currentYear, currentMonth, 3),
      paymentMethod: 'Card',
      tags: ['entertainment', 'subscription'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 1499.00,
      category: 'Subscriptions',
      description: 'Spotify Premium',
      date: new Date(currentYear, currentMonth, 3),
      paymentMethod: 'Card',
      tags: ['entertainment', 'subscription'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 3500.00,
      category: 'Health & Fitness',
      description: 'Gym membership',
      date: new Date(currentYear, currentMonth, 1),
      paymentMethod: 'UPI',
      location: 'Gold\'s Gym',
      tags: ['fitness', 'monthly'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 2000.00,
      category: 'Healthcare',
      description: 'Doctor visit and medicines',
      date: new Date(currentYear, currentMonth, 14),
      paymentMethod: 'Cash',
      location: 'Apollo Hospital',
      tags: ['health', 'medical'],
      attachments: [],
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 5000.00,
      category: 'Entertainment',
      description: 'Weekend trip expenses',
      date: new Date(currentYear, currentMonth, 18),
      paymentMethod: 'UPI',
      location: 'Lonavala',
      tags: ['travel', 'weekend'],
      attachments: [],
      userId: user.id,
    },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({ data: tx });
  }
  console.log(` Created ${transactions.length} sample transactions`);

  // Create sample goals
  const goals = [
    {
      title: 'Emergency Fund',
      description: 'Build 6 months of expenses as emergency fund',
      targetAmount: 300000.00,
      currentAmount: 75000.00,
      targetDate: new Date(currentYear + 1, 5, 30), // June next year
      category: 'EMERGENCY_FUND',
      priority: 'HIGH',
      userId: user.id,
    },
    {
      title: 'Vacation to Europe',
      description: 'Summer vacation to Switzerland and France',
      targetAmount: 500000.00,
      currentAmount: 125000.00,
      targetDate: new Date(currentYear + 1, 3, 15), // April next year
      category: 'VACATION',
      priority: 'MEDIUM',
      userId: user.id,
    },
    {
      title: 'New Laptop',
      description: 'MacBook Pro for work',
      targetAmount: 200000.00,
      currentAmount: 50000.00,
      targetDate: new Date(currentYear, 11, 31), // December this year
      category: 'OTHER',
      priority: 'LOW',
      userId: user.id,
    },
    {
      title: 'Investment Portfolio',
      description: 'Start mutual fund investments',
      targetAmount: 100000.00,
      currentAmount: 30000.00,
      targetDate: new Date(currentYear + 1, 0, 31), // January next year
      category: 'INVESTMENT',
      priority: 'HIGH',
      userId: user.id,
    },
  ];

  for (const goal of goals) {
    await prisma.goal.create({ data: goal });
  }
  console.log(` Created ${goals.length} sample goals`);

  // Create sample recurring transactions
  const recurringTransactions = [
    {
      type: 'INCOME',
      amount: 75000.00,
      category: 'Salary',
      description: 'Monthly salary',
      paymentMethod: 'Bank Transfer',
      frequency: 'MONTHLY',
      nextDate: new Date(currentYear, currentMonth + 1, 1),
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 15000.00,
      category: 'Bills & Utilities',
      description: 'House rent',
      paymentMethod: 'Bank Transfer',
      frequency: 'MONTHLY',
      nextDate: new Date(currentYear, currentMonth + 1, 1),
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 999.00,
      category: 'Subscriptions',
      description: 'Netflix subscription',
      paymentMethod: 'Card',
      frequency: 'MONTHLY',
      nextDate: new Date(currentYear, currentMonth + 1, 3),
      userId: user.id,
    },
    {
      type: 'EXPENSE',
      amount: 3500.00,
      category: 'Health & Fitness',
      description: 'Gym membership',
      paymentMethod: 'UPI',
      frequency: 'MONTHLY',
      nextDate: new Date(currentYear, currentMonth + 1, 1),
      userId: user.id,
    },
  ];

  for (const recurring of recurringTransactions) {
    await prisma.recurringTransaction.create({ data: recurring });
  }
  console.log(` Created ${recurringTransactions.length} recurring transactions`);

  console.log('\n Database seeding completed successfully!');
  console.log('\n Demo Account:');
  console.log('   Email: demo@example.com');
  console.log('   Password: demo123456\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(' Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
