const express = require('express');
const Joi = require('joi');
const prisma = require('../lib/prisma');
const { toNumber, normalizeTransaction, normalizeUser } = require('../lib/normalize');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Enhanced categories for both income and expenses
const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities',
  'Entertainment', 'Healthcare', 'Health & Fitness', 'Education',
  'Travel', 'Subscriptions', 'Insurance', 'Groceries', 'Gas',
  'Personal Care', 'Home & Garden', 'Gifts & Donations', 'Other Expenses', 'Other'
];

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investments', 'Rental Income', 'Rental',
  'Side Hustle', 'Bonus', 'Gift', 'Gifts & Donations', 'Refund', 'Pension',
  'Government Benefits', 'Other Income', 'Other'
];

const transactionSchema = Joi.object({
  type: Joi.string().valid('INCOME', 'EXPENSE').required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().required(),
  subcategory: Joi.string().optional().allow('', null),
  description: Joi.string().min(1).max(200).required(),
  date: Joi.date().required(),
  paymentMethod: Joi.string().valid(
    'Cash', 'Card', 'Credit Card', 'Debit Card',
    'Bank Transfer', 'UPI', 'Check', 'Digital Wallet', 'Other'
  ).required(),
  location: Joi.string().max(100).optional().allow('', null),
  notes: Joi.string().max(500).optional().allow('', null),
  tags: Joi.array().items(Joi.string()).optional(),
  attachments: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(
      Joi.object({
        name: Joi.string().optional(),
        size: Joi.number().optional(),
        type: Joi.string().optional(),
        data: Joi.string().required()
      })
    )
  ).optional()
});

const budgetSchema = Joi.object({
  monthlyBudget: Joi.number().min(0).required()
});
const transactionVisibilitySchema = Joi.object({
  isHidden: Joi.boolean().required()
});

const timeframeSchema = Joi.string().valid('monthly', 'quarterly', 'yearly').default('monthly');

const getTimeframeRange = (timeframe, now = new Date()) => {
  if (timeframe === 'quarterly') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (timeframe === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const strValue = String(value);
  if (/[",\n]/.test(strValue)) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
};

router.use(authMiddleware);

// Get all transactions with filtering
router.get('/', async (req, res) => {
  try {
    const {
      type, category, subcategory, paymentMethod, startDate, endDate, search, tags, location,
      minAmount, maxAmount, sortBy, sortOrder, page = 1, limit = 50, visibility = 'all'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const where = { userId: req.user.id };

    if (type) where.type = type;
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (tags) where.tags = { hasSome: tags.split(',') };
    if (visibility === 'hidden') where.isHidden = true;
    if (visibility === 'visible') where.isHidden = false;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = Number(minAmount);
      if (maxAmount) where.amount.lte = Number(maxAmount);
    }

    const allowedSortFields = new Set(['date', 'amount', 'createdAt']);
    const orderField = allowedSortFields.has(sortBy) ? sortBy : 'date';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const total = await prisma.transaction.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      transactions: transactions.map(normalizeTransaction),
      pagination: {
        current: pageNum,
        total: totalPages,
        count: total
      },
      currentPage: pageNum,
      totalPages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new transaction
router.post('/', async (req, res) => {
  try {
    const { error } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Validate category based on type
    const validCategories = req.body.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!validCategories.includes(req.body.category)) {
      return res.status(400).json({
        message: `Invalid category for ${req.body.type.toLowerCase()}. Valid categories: ${validCategories.join(', ')}`
      });
    }

    const attachments = Array.isArray(req.body.attachments)
      ? req.body.attachments.map((att) => {
        if (typeof att === 'string') return att;
        if (att && typeof att === 'object' && att.data) return att.data;
        return null;
      }).filter(Boolean)
      : [];

    const transaction = await prisma.transaction.create({
      data: {
        ...req.body,
        // Set time to noon UTC to prevent date shifting across timezones
        date: new Date(req.body.date.toString().includes('T') ? req.body.date : req.body.date + 'T12:00:00Z'),
        tags: req.body.tags || [],
        attachments,
        userId: req.user.id
      }
    });

    res.status(201).json({ message: 'Transaction created successfully', transaction: normalizeTransaction(transaction) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comprehensive analytics
router.get('/analytics', async (req, res) => {
  try {
    const round2 = (value) => Math.round((value || 0) * 100) / 100;
    const getQuarterLabel = (date) => `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    const getMonthLabel = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
    const startOfLastQuarter = new Date(now.getFullYear(), quarterStartMonth - 3, 1);
    const endOfLastQuarter = new Date(startOfQuarter.getTime() - 1);

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear(), 0, 0, 23, 59, 59, 999);

    // Monthly totals (current + previous)
    const monthlyExpenses = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });

    const monthlyIncome = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });

    const prevMonthlyExpenses = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfLastMonth, lte: endOfLastMonth }
      },
      _sum: { amount: true }
    });

    const prevMonthlyIncome = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfLastMonth, lte: endOfLastMonth }
      },
      _sum: { amount: true }
    });

    // Quarterly totals (current + previous)
    const quarterlyExpenses = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfQuarter }
      },
      _sum: { amount: true }
    });

    const quarterlyIncome = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfQuarter }
      },
      _sum: { amount: true }
    });

    const prevQuarterlyExpenses = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfLastQuarter, lte: endOfLastQuarter }
      },
      _sum: { amount: true }
    });

    const prevQuarterlyIncome = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfLastQuarter, lte: endOfLastQuarter }
      },
      _sum: { amount: true }
    });

    // Yearly totals (current + previous)
    const yearlyExpenses = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfYear }
      },
      _sum: { amount: true }
    });

    const yearlyIncome = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfYear }
      },
      _sum: { amount: true }
    });

    const prevYearlyExpenses = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfLastYear, lte: endOfLastYear }
      },
      _sum: { amount: true }
    });

    const prevYearlyIncome = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfLastYear, lte: endOfLastYear }
      },
      _sum: { amount: true }
    });

    // Category breakdowns by period
    const expenseCategories = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });

    const incomeCategories = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });

    const quarterlyExpenseCategories = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfQuarter }
      },
      _sum: { amount: true }
    });

    const quarterlyIncomeCategories = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfQuarter }
      },
      _sum: { amount: true }
    });

    const yearlyExpenseCategories = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: startOfYear }
      },
      _sum: { amount: true }
    });

    const yearlyIncomeCategories = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id,
        type: 'INCOME',
        date: { gte: startOfYear }
      },
      _sum: { amount: true }
    });

    // Monthly trends for the last 6 months (Prisma findMany for Neon compatibility - avoids raw SQL)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const txsForTrends = await prisma.transaction.findMany({
      where: { userId: req.user.id, date: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, date: true }
    });
    const byMonth = new Map();
    for (const tx of txsForTrends) {
      const d = new Date(tx.date);
      const label = getMonthLabel(d);
      if (!byMonth.has(label)) byMonth.set(label, { month: label, income: 0, expenses: 0 });
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'INCOME') byMonth.get(label).income += amt;
      else byMonth.get(label).expenses += amt;
    }

    // Process raw results into the expected format
    const monthlyTrendsMap = new Map();

    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = getMonthLabel(d);
      monthlyTrendsMap.set(label, { period: label, month: label, income: 0, expenses: 0, netIncome: 0 });
    }

    // Merge byMonth data into monthlyTrendsMap, preserving all 6 months
    byMonth.forEach((data, label) => {
      if (monthlyTrendsMap.has(label)) {
        const entry = monthlyTrendsMap.get(label);
        entry.income = round2(data.income);
        entry.expenses = round2(data.expenses);
        entry.netIncome = round2(data.income - data.expenses);
      }
    });

    const monthlyTrends = Array.from(monthlyTrendsMap.values());

    // Quarterly trends for the last 8 quarters
    const quarterSeriesCount = 8;
    const firstQuarterInSeries = new Date(startOfQuarter.getFullYear(), startOfQuarter.getMonth() - (quarterSeriesCount - 1) * 3, 1);
    const txsForQuarterlyTrends = await prisma.transaction.findMany({
      where: { userId: req.user.id, date: { gte: firstQuarterInSeries } },
      select: { type: true, amount: true, date: true }
    });

    const quarterlyTrendsMap = new Map();
    for (let i = quarterSeriesCount - 1; i >= 0; i--) {
      const d = new Date(startOfQuarter.getFullYear(), startOfQuarter.getMonth() - i * 3, 1);
      const label = getQuarterLabel(d);
      quarterlyTrendsMap.set(label, { period: label, income: 0, expenses: 0, netIncome: 0 });
    }

    for (const tx of txsForQuarterlyTrends) {
      const d = new Date(tx.date);
      const label = getQuarterLabel(d);
      if (!quarterlyTrendsMap.has(label)) continue;
      const amt = Number(tx.amount) || 0;
      const entry = quarterlyTrendsMap.get(label);
      if (tx.type === 'INCOME') entry.income += amt;
      else entry.expenses += amt;
      entry.netIncome = entry.income - entry.expenses;
    }

    const quarterlyTrends = Array.from(quarterlyTrendsMap.values()).map((entry) => ({
      ...entry,
      income: round2(entry.income),
      expenses: round2(entry.expenses),
      netIncome: round2(entry.netIncome)
    }));

    // Yearly trends for the last 5 years
    const yearSeriesCount = 5;
    const firstYearInSeries = now.getFullYear() - (yearSeriesCount - 1);
    const startOfFirstYear = new Date(firstYearInSeries, 0, 1);
    const txsForYearlyTrends = await prisma.transaction.findMany({
      where: { userId: req.user.id, date: { gte: startOfFirstYear } },
      select: { type: true, amount: true, date: true }
    });

    const yearlyTrendsMap = new Map();
    for (let y = firstYearInSeries; y <= now.getFullYear(); y++) {
      const label = String(y);
      yearlyTrendsMap.set(label, { period: label, income: 0, expenses: 0, netIncome: 0 });
    }

    for (const tx of txsForYearlyTrends) {
      const yearLabel = String(new Date(tx.date).getFullYear());
      if (!yearlyTrendsMap.has(yearLabel)) continue;
      const amt = Number(tx.amount) || 0;
      const entry = yearlyTrendsMap.get(yearLabel);
      if (tx.type === 'INCOME') entry.income += amt;
      else entry.expenses += amt;
      entry.netIncome = entry.income - entry.expenses;
    }

    const yearlyTrends = Array.from(yearlyTrendsMap.values()).map((entry) => ({
      ...entry,
      income: round2(entry.income),
      expenses: round2(entry.expenses),
      netIncome: round2(entry.netIncome)
    }));

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get user budget
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { monthlyBudget: true }
    });

    const monthlyExpenseTotal = toNumber(monthlyExpenses._sum.amount) || 0;
    const monthlyIncomeTotal = toNumber(monthlyIncome._sum.amount) || 0;
    const prevMonthlyExpenseTotal = toNumber(prevMonthlyExpenses._sum.amount) || 0;
    const prevMonthlyIncomeTotal = toNumber(prevMonthlyIncome._sum.amount) || 0;

    const quarterlyExpenseTotal = toNumber(quarterlyExpenses._sum.amount) || 0;
    const quarterlyIncomeTotal = toNumber(quarterlyIncome._sum.amount) || 0;
    const prevQuarterlyExpenseTotal = toNumber(prevQuarterlyExpenses._sum.amount) || 0;
    const prevQuarterlyIncomeTotal = toNumber(prevQuarterlyIncome._sum.amount) || 0;

    const yearlyExpenseTotal = toNumber(yearlyExpenses._sum.amount) || 0;
    const yearlyIncomeTotal = toNumber(yearlyIncome._sum.amount) || 0;
    const prevYearlyExpenseTotal = toNumber(prevYearlyExpenses._sum.amount) || 0;
    const prevYearlyIncomeTotal = toNumber(prevYearlyIncome._sum.amount) || 0;

    const monthlySavings = monthlyIncomeTotal - monthlyExpenseTotal;
    const prevMonthlySavings = prevMonthlyIncomeTotal - prevMonthlyExpenseTotal;

    const quarterlySavings = quarterlyIncomeTotal - quarterlyExpenseTotal;
    const prevQuarterlySavings = prevQuarterlyIncomeTotal - prevQuarterlyExpenseTotal;

    const yearlySavings = yearlyIncomeTotal - yearlyExpenseTotal;
    const prevYearlySavings = prevYearlyIncomeTotal - prevYearlyExpenseTotal;

    const savingsRate = monthlyIncomeTotal > 0 ? (monthlySavings / monthlyIncomeTotal) * 100 : 0;
    const prevSavingsRate = prevMonthlyIncomeTotal > 0 ? (prevMonthlySavings / prevMonthlyIncomeTotal) * 100 : 0;

    const quarterlySavingsRate = quarterlyIncomeTotal > 0 ? (quarterlySavings / quarterlyIncomeTotal) * 100 : 0;
    const prevQuarterlySavingsRate = prevQuarterlyIncomeTotal > 0
      ? (prevQuarterlySavings / prevQuarterlyIncomeTotal) * 100
      : 0;

    const yearlySavingsRate = yearlyIncomeTotal > 0 ? (yearlySavings / yearlyIncomeTotal) * 100 : 0;
    const prevYearlySavingsRate = prevYearlyIncomeTotal > 0 ? (prevYearlySavings / prevYearlyIncomeTotal) * 100 : 0;

    const mapCategoryBreakdown = (groupedCategories) => groupedCategories.map((cat) => ({
      category: cat.category,
      amount: toNumber(cat._sum.amount) || 0
    }));

    res.json({
      monthly: {
        expenses: monthlyExpenseTotal,
        income: monthlyIncomeTotal,
        netIncome: monthlySavings,
        savingsRate: round2(savingsRate),
        prevExpenses: prevMonthlyExpenseTotal,
        prevIncome: prevMonthlyIncomeTotal,
        prevNetIncome: prevMonthlySavings,
        prevSavingsRate: round2(prevSavingsRate)
      },
      quarterly: {
        expenses: quarterlyExpenseTotal,
        income: quarterlyIncomeTotal,
        netIncome: quarterlySavings,
        savingsRate: round2(quarterlySavingsRate),
        prevExpenses: prevQuarterlyExpenseTotal,
        prevIncome: prevQuarterlyIncomeTotal,
        prevNetIncome: prevQuarterlySavings,
        prevSavingsRate: round2(prevQuarterlySavingsRate),
        categoryBreakdown: {
          expenses: mapCategoryBreakdown(quarterlyExpenseCategories),
          income: mapCategoryBreakdown(quarterlyIncomeCategories)
        }
      },
      yearly: {
        expenses: yearlyExpenseTotal,
        income: yearlyIncomeTotal,
        netIncome: yearlySavings,
        savingsRate: round2(yearlySavingsRate),
        prevExpenses: prevYearlyExpenseTotal,
        prevIncome: prevYearlyIncomeTotal,
        prevNetIncome: prevYearlySavings,
        prevSavingsRate: round2(prevYearlySavingsRate),
        categoryBreakdown: {
          expenses: mapCategoryBreakdown(yearlyExpenseCategories),
          income: mapCategoryBreakdown(yearlyIncomeCategories)
        }
      },
      categoryBreakdown: {
        expenses: mapCategoryBreakdown(expenseCategories),
        income: mapCategoryBreakdown(incomeCategories)
      },
      monthlyTrends,
      quarterlyTrends,
      yearlyTrends,
      recentTransactions: recentTransactions.map(normalizeTransaction),
      budget: {
        monthlyBudget: toNumber(user?.monthlyBudget) || 0,
        spent: monthlyExpenseTotal,
        remaining: Math.max(0, (toNumber(user?.monthlyBudget) || 0) - monthlyExpenseTotal),
        percentageUsed: toNumber(user?.monthlyBudget) > 0 ? (monthlyExpenseTotal / toNumber(user.monthlyBudget)) * 100 : 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download summary + transactions report for a timeframe as CSV
router.get('/report', async (req, res) => {
  try {
    const { error, value: timeframe } = timeframeSchema.validate(req.query.timeframe);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { start, end } = getTimeframeRange(timeframe);

    const [incomeAgg, expenseAgg, userBudget, transactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          type: 'INCOME',
          date: { gte: start, lte: end }
        },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          type: 'EXPENSE',
          date: { gte: start, lte: end }
        },
        _sum: { amount: true }
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { monthlyBudget: true }
      }),
      prisma.transaction.findMany({
        where: {
          userId: req.user.id,
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'desc' }
      })
    ]);

    const income = toNumber(incomeAgg._sum.amount) || 0;
    const expenses = toNumber(expenseAgg._sum.amount) || 0;
    const monthlyBudget = toNumber(userBudget?.monthlyBudget) || 0;
    const multiplierByTimeframe = { monthly: 1, quarterly: 3, yearly: 12 };
    const budgeted = monthlyBudget * (multiplierByTimeframe[timeframe] || 1);
    const netIncome = income - expenses;
    const savingsRate = income > 0 ? (netIncome / income) * 100 : 0;
    const remainingBudget = Math.max(0, budgeted - expenses);

    const headerRows = [
      ['Report Name', 'Expense Tracker Report'],
      ['Timeframe', timeframe],
      ['Period Start', start.toISOString().slice(0, 10)],
      ['Period End', end.toISOString().slice(0, 10)],
      ['Generated At', new Date().toISOString()],
      []
    ];

    const summaryRows = [
      ['Summary Metric', 'Value'],
      ['Income', income.toFixed(2)],
      ['Expenses', expenses.toFixed(2)],
      ['Net Income', netIncome.toFixed(2)],
      ['Savings Rate (%)', savingsRate.toFixed(2)],
      ['Planned Budget', budgeted.toFixed(2)],
      ['Budget Remaining', remainingBudget.toFixed(2)],
      []
    ];

    const transactionRows = [
      ['Transactions'],
      ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Hidden', 'Notes', 'Tags'],
      ...transactions.map((tx) => {
        const normalized = normalizeTransaction(tx);
        return [
          new Date(normalized.date).toISOString().slice(0, 10),
          normalized.type,
          normalized.category,
          normalized.description,
          (normalized.amount || 0).toFixed(2),
          normalized.paymentMethod || '',
          normalized.isHidden ? 'Yes' : 'No',
          normalized.notes || '',
          (normalized.tags || []).join(';')
        ];
      })
    ];

    const csvRows = [...headerRows, ...summaryRows, ...transactionRows];
    const csv = csvRows
      .map((row) => row.map((column) => csvEscape(column)).join(','))
      .join('\n');

    const filename = `expense-tracker-${timeframe}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Update budget
router.put('/budget', async (req, res) => {
  try {
    const { error } = budgetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { monthlyBudget: req.body.monthlyBudget },
      select: { id: true, name: true, email: true, monthlyBudget: true }
    });

    res.json({ message: 'Budget updated successfully', user: normalizeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const { error } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const attachments = Array.isArray(req.body.attachments)
      ? req.body.attachments.map((att) => {
        if (typeof att === 'string') return att;
        if (att && typeof att === 'object' && att.data) return att.data;
        return null;
      }).filter(Boolean)
      : [];

    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        date: new Date(req.body.date.toString().includes('T') ? req.body.date : req.body.date + 'T12:00:00Z'),
        attachments
      }
    });

    res.json({ message: 'Transaction updated successfully', transaction: normalizeTransaction(updatedTransaction) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle transaction visibility (hide/unhide)
router.patch('/:id/visibility', async (req, res) => {
  try {
    const { error, value } = transactionVisibilitySchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { isHidden: value.isHidden }
    });

    res.json({
      message: value.isHidden ? 'Transaction hidden successfully' : 'Transaction visibility restored',
      transaction: normalizeTransaction(updatedTransaction)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await prisma.transaction.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import transactions from CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const csvText = req.file.buffer.toString('utf8');
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const imported = [];
    for (const row of records) {
      const normalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = value;
      }

      const type = String(normalizedRow.type || '').toUpperCase();
      const amount = Number(normalizedRow.amount);
      if (!type || !['INCOME', 'EXPENSE'].includes(type) || !amount) {
        continue;
      }

      const dateValue = normalizedRow.date;
      const date = dateValue ? new Date(dateValue) : new Date();

      const tags = String(normalizedRow.tags || '')
        .split(';')
        .map(t => t.trim())
        .filter(Boolean);

      const data = {
        type,
        amount,
        category: normalizedRow.category || 'Other',
        subcategory: normalizedRow.subcategory || null,
        description: normalizedRow.description || 'Imported transaction',
        date: new Date(date.toString().includes('T') ? date : date.toISOString()),
        paymentMethod: normalizedRow.payment_method || normalizedRow.paymentmethod || 'Other',
        location: normalizedRow.location || null,
        notes: normalizedRow.notes || null,
        tags,
        attachments: []
      };

      const { error } = transactionSchema.validate(data);
      if (error) {
        continue;
      }

      const created = await prisma.transaction.create({
        data: {
          ...data,
          userId: req.user.id
        }
      });
      imported.push(created);
    }

    res.json({ message: 'Import completed', imported: imported.length, transactions: imported });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get categories
router.get('/categories', (req, res) => {
  res.json({
    income: INCOME_CATEGORIES,
    expense: EXPENSE_CATEGORIES
  });
});

module.exports = router;
