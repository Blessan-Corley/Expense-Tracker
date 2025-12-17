const { calculateNextDate } = require('../../src/lib/recurring');

describe('recurring date calculations', () => {
  test('daily', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const next = calculateNextDate(base, 'DAILY');
    expect(next.toISOString().startsWith('2025-01-02')).toBe(true);
  });

  test('weekly', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const next = calculateNextDate(base, 'WEEKLY');
    expect(next.toISOString().startsWith('2025-01-08')).toBe(true);
  });

  test('biweekly', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const next = calculateNextDate(base, 'BIWEEKLY');
    expect(next.toISOString().startsWith('2025-01-15')).toBe(true);
  });

  test('monthly', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const next = calculateNextDate(base, 'MONTHLY');
    expect(next.toISOString().startsWith('2025-02-01')).toBe(true);
  });

  test('quarterly', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const next = calculateNextDate(base, 'QUARTERLY');
    expect(next.toISOString().startsWith('2025-04-01')).toBe(true);
  });

  test('yearly', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const next = calculateNextDate(base, 'YEARLY');
    expect(next.toISOString().startsWith('2026-01-01')).toBe(true);
  });
});
