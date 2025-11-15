const express = require('express');
const Joi = require('joi');
const prisma = require('../lib/prisma');
const { normalizeGoal, toNumber } = require('../lib/normalize');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const goalSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow('', null),
  targetAmount: Joi.number().positive().required(),
  targetDate: Joi.date().min('now').required(),
  category: Joi.string().valid(
    'EMERGENCY_FUND', 'VACATION', 'HOME_PURCHASE', 'CAR_PURCHASE',
    'INVESTMENT', 'DEBT_PAYOFF', 'EDUCATION', 'RETIREMENT', 'OTHER'
  ).required(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM')
});

const updateGoalSchema = goalSchema.keys({
  currentAmount: Joi.number().min(0).optional(),
  isCompleted: Joi.boolean().optional()
});

router.use(authMiddleware);

// Get all goals
router.get('/', async (req, res) => {
  try {
    const { status, category, priority } = req.query;

    const where = { userId: req.user.id };

    if (status === 'completed') where.isCompleted = true;
    if (status === 'active') where.isCompleted = false;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const goals = await prisma.goal.findMany({
      where,
      orderBy: [
        { isCompleted: 'asc' },
        { priority: 'desc' },
        { targetDate: 'asc' }
      ]
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map(goal => {
      const normalized = normalizeGoal(goal);
      const targetAmount = toNumber(normalized.targetAmount) || 0;
      const currentAmount = toNumber(normalized.currentAmount) || 0;
      return {
        ...normalized,
        progress: targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0,
        remainingAmount: Math.max(0, targetAmount - currentAmount),
        daysRemaining: Math.ceil((new Date(normalized.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
      };
    });

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new goal
router.post('/', async (req, res) => {
  try {
    const { error, value } = goalSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const goal = await prisma.goal.create({
      data: {
        ...value,
        description: value.description?.trim() ? value.description.trim() : null,
        targetDate: new Date(value.targetDate),
        userId: req.user.id
      }
    });

    res.status(201).json({ message: 'Goal created successfully', goal: normalizeGoal(goal) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update goal
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateGoalSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const currentAmountValue = value.currentAmount !== undefined ? Number(value.currentAmount) : undefined;
    const targetAmountValue = Number(goal.targetAmount);

    const updatedGoal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        ...value,
        description: value.description === undefined
          ? undefined
          : (value.description?.trim() ? value.description.trim() : null),
        targetDate: value.targetDate ? new Date(value.targetDate) : undefined,
        currentAmount: currentAmountValue,
        isCompleted: currentAmountValue !== undefined
          ? currentAmountValue >= targetAmountValue
          : value.isCompleted
      }
    });

    res.json({ message: 'Goal updated successfully', goal: normalizeGoal(updatedGoal) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add money to goal
router.post('/:id/contribute', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid contribution amount required' });
    }

    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const newAmount = Number(goal.currentAmount) + Number(amount);
    const isCompleted = newAmount >= Number(goal.targetAmount);

    const updatedGoal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        currentAmount: newAmount,
        isCompleted
      }
    });

    res.json({
      message: isCompleted ? 'Congratulations! Goal completed!' : 'Contribution added successfully',
      goal: normalizeGoal(updatedGoal)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get goals summary
router.get('/summary', async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id }
    });

    const summary = {
      total: goals.length,
      completed: goals.filter(g => g.isCompleted).length,
      active: goals.filter(g => !g.isCompleted).length,
      totalTargetAmount: goals.reduce((sum, g) => sum + (toNumber(g.targetAmount) || 0), 0),
      totalSavedAmount: goals.reduce((sum, g) => sum + (toNumber(g.currentAmount) || 0), 0),
      overallProgress: 0
    };

    if (summary.totalTargetAmount > 0) {
      summary.overallProgress = Math.round((summary.totalSavedAmount / summary.totalTargetAmount) * 100);
    }

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
