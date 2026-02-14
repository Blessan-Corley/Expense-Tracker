const { toNumber } = require('./normalize');

function calculateNextDate(currentDate, frequency) {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'BIWEEKLY':
      date.setDate(date.getDate() + 14);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'QUARTERLY':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'YEARLY':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}

async function processDueRecurring(prisma, options = {}) {
  const { userId } = options;
  const now = new Date();

  const where = {
    isActive: true,
    nextDate: { lte: now },
    OR: [
      { endDate: null },
      { endDate: { gte: now } }
    ]
  };

  if (userId) {
    where.userId = userId;
  }

  const dueRecurring = await prisma.recurringTransaction.findMany({ where });
  const processedTransactions = [];

  for (const recurring of dueRecurring) {
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          type: recurring.type,
          amount: toNumber(recurring.amount),
          category: recurring.category,
          subcategory: recurring.subcategory,
          description: recurring.description,
          date: recurring.nextDate,
          paymentMethod: recurring.paymentMethod,
          isRecurring: true,
          recurringId: recurring.id,
          userId: recurring.userId,
          tags: [],
          attachments: []
        }
      });

      const nextDate = calculateNextDate(recurring.nextDate, recurring.frequency);
      const shouldDeactivate = recurring.endDate && nextDate > recurring.endDate;

      await tx.recurringTransaction.update({
        where: { id: recurring.id },
        data: {
          nextDate: shouldDeactivate ? recurring.nextDate : nextDate,
          isActive: !shouldDeactivate
        }
      });

      return created;
    });

    processedTransactions.push(transaction);
  }

  return processedTransactions;
}

module.exports = {
  calculateNextDate,
  processDueRecurring
};
