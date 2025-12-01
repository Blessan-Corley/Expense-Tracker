const toNumber = (value) => (value === null || value === undefined ? value : Number(value));

const normalizeUser = (user) => {
  if (!user) return user;
  return { ...user, monthlyBudget: toNumber(user.monthlyBudget) };
};

const normalizeTransaction = (tx) => {
  if (!tx) return tx;
  return { ...tx, amount: toNumber(tx.amount) };
};

const normalizeGoal = (goal) => {
  if (!goal) return goal;
  return {
    ...goal,
    targetAmount: toNumber(goal.targetAmount),
    currentAmount: toNumber(goal.currentAmount)
  };
};

const normalizeRecurring = (recurring) => {
  if (!recurring) return recurring;
  return { ...recurring, amount: toNumber(recurring.amount) };
};

module.exports = {
  toNumber,
  normalizeUser,
  normalizeTransaction,
  normalizeGoal,
  normalizeRecurring
};
