import { describe, it, expect } from 'vitest';
import { formatCurrency, formatAmount, parseCurrency } from '../utils/currency';

describe('Currency Utility', () => {
  it('formatCurrency formats numbers to INR correctly', () => {
    expect(formatCurrency(100)).toBe('₹100.00');
    expect(formatCurrency(1000)).toBe('₹1,000.00');
    expect(formatCurrency(100000)).toBe('₹1,00,000.00');
  });

  it('formatCurrency handles null/undefined/NaN', () => {
    expect(formatCurrency(null)).toBe('₹0.00');
    expect(formatCurrency(undefined)).toBe('₹0.00');
    expect(formatCurrency(NaN)).toBe('₹0.00');
  });

  it('formatAmount shortens large numbers', () => {
    expect(formatAmount(1500)).toBe('₹1.5K');
    expect(formatAmount(150000)).toBe('₹1.5L');
    expect(formatAmount(15000000)).toBe('₹1.5Cr');
  });

  it('parseCurrency converts strings to numbers', () => {
    expect(parseCurrency('INR 1,000')).toBe(1000);
    expect(parseCurrency('Rs 500')).toBe(500);
    expect(parseCurrency('500')).toBe(500);
  });
});
