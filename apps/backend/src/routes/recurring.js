const express = require('express');
const Joi = require('joi');
const prisma = require('../lib/prisma');
const { normalizeRecurring, normalizeTransaction } = require('../lib/normalize');
const { processDueRecurring } = require('../lib/recurring');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const recurringSchema = Joi.object({
  type: Joi.string().valid('INCOME', 'EXPENSE').required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().min(1).max(50).required(),
  subcategory: Joi.string().max(50).optional().allow('', null),
  description: Joi.string().min(1).max(200).required(),
  paymentMethod: Joi.string().valid(
    'Cash', 'Card', 'Credit Card', 'Debit Card',
    'Bank Transfer', 'UPI', 'Check', 'Digital Wallet', 'Other'
  ).required(),
  frequency: Joi.string().valid('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY').required(),
  nextDate: Joi.date().min('now').required(),
  endDate: Joi.date().min(Joi.ref('nextDate')).optional().allow(null, '')
});

router.use(authMiddleware);

// Get recurring transactions summary
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const upcomingTransactions = await prisma.recurringTransaction.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
        nextDate: {
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      },
      orderBy: { nextDate: 'asc' },
      take: 5
    });

    const totalActiveRecurring = await prisma.recurringTransaction.count({
      where: {
        userId: req.user.id,
        isActive: true
      }
    });

    const monthlyRecurringExpenses = await prisma.recurringTransaction.aggregate({
      where: {
        userId: req.user.id,
        isActive: true,
        type: 'EXPENSE',
        frequency: 'MONTHLY'
      },
      _sum: { amount: true }
    });

    const monthlyRecurringIncome = await prisma.recurringTransaction.aggregate({
      where: {
        userId: req.user.id,
        isActive: true,
        type: 'INCOME',
        frequency: 'MONTHLY'
      },
      _sum: { amount: true }
    });

    res.json({
      upcomingTransactions: upcomingTransactions.map(normalizeRecurring),
      totalActive: totalActiveRecurring,
      monthlyExpenses: Number(monthlyRecurringExpenses._sum.amount || 0),
      monthlyIncome: Number(monthlyRecurringIncome._sum.amount || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all recurring transactions
router.get('/', async (req, res) => {
  try {
    const { type, frequency, active } = req.query;

    const where = { userId: req.user.id };

    if (type) where.type = type;
    if (frequency) where.frequency = frequency;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where,
      orderBy: { nextDate: 'asc' }
    });

    res.json({ recurringTransactions: recurringTransactions.map(normalizeRecurring) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new recurring transaction
router.post('/', async (req, res) => {
  try {
    const { error, value } = recurringSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const recurringTransaction = await prisma.recurringTransaction.create({
      data: {
        ...value,
        subcategory: value.subcategory || null,
        nextDate: new Date(value.nextDate),
        endDate: value.endDate ? new Date(value.endDate) : null,
        userId: req.user.id
      }
    });

    res.status(201).json({
      message: 'Recurring transaction created successfully',
      recurringTransaction: normalizeRecurring(recurringTransaction)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update recurring transaction
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = recurringSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const recurringTransaction = await prisma.recurringTransaction.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }

    const updatedRecurring = await prisma.recurringTransaction.update({
      where: { id: req.params.id },
      data: {
        ...value,
        subcategory: value.subcategory || null,
        nextDate: new Date(value.nextDate),
        endDate: value.endDate ? new Date(value.endDate) : null
      }
    });

    res.json({
      message: 'Recurring transaction updated successfully',
      recurringTransaction: normalizeRecurring(updatedRecurring)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const recurringTransaction = await prisma.recurringTransaction.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id: req.params.id },
      data: { isActive: !recurringTransaction.isActive }
    });

    res.json({
      message: `Recurring transaction ${updated.isActive ? 'activated' : 'deactivated'}`,
      recurringTransaction: normalizeRecurring(updated)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Process due recurring transactions
router.post('/process', async (req, res) => {
  try {
    const processedTransactions = await processDueRecurring(prisma, { userId: req.user.id });

    res.json({
      message: `Processed ${processedTransactions.length} recurring transactions`,
      transactions: processedTransactions.map(normalizeTransaction)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming recurring transactions
router.get('/upcoming', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + parseInt(days));

    const upcomingRecurring = await prisma.recurringTransaction.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
        nextDate: {
          gte: now,
          lte: futureDate
        }
      },
      orderBy: { nextDate: 'asc' }
    });

    res.json({ upcomingRecurring: upcomingRecurring.map(normalizeRecurring) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete recurring transaction
router.delete('/:id', async (req, res) => {
  try {
    const recurringTransaction = await prisma.recurringTransaction.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }

    // Also delete associated transactions if requested
    const { deleteTransactions } = req.query;

    if (deleteTransactions === 'true') {
      await prisma.transaction.deleteMany({
        where: { recurringId: req.params.id }
      });
    }

    await prisma.recurringTransaction.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Recurring transaction deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
