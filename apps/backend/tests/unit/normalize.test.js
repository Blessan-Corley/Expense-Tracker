const { normalizeUser, normalizeTransaction, normalizeGoal, normalizeRecurring } = require('../../src/lib/normalize');

describe('normalize helpers', () => {
  test('normalizeUser converts Decimal-like values to numbers', () => {
    const user = { id: 'u1', monthlyBudget: '1234.50' };
    const result = normalizeUser(user);
    expect(result.monthlyBudget).toBe(1234.5);
  });

  test('normalizeTransaction converts amount to number', () => {
    const tx = { id: 't1', amount: '99.99' };
    const result = normalizeTransaction(tx);
    expect(result.amount).toBe(99.99);
  });

  test('normalizeGoal converts target/current amounts to numbers', () => {
    const goal = { id: 'g1', targetAmount: '1000', currentAmount: '250' };
    const result = normalizeGoal(goal);
    expect(result.targetAmount).toBe(1000);
    expect(result.currentAmount).toBe(250);
  });

  test('normalizeRecurring converts amount to number', () => {
    const recurring = { id: 'r1', amount: '33.3' };
    const result = normalizeRecurring(recurring);
    expect(result.amount).toBe(33.3);
  });
});
