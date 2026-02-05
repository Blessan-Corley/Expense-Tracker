// Currency utility functions for INR

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '\u20B90.00';
  }

  const numAmount = Number(amount);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

export const formatAmount = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '\u20B90';
  }

  const numAmount = Number(amount);

  // Format as plain number with INR symbol
  if (numAmount >= 10000000) { // 1 crore
    return `\u20B9${(numAmount / 10000000).toFixed(1)}Cr`;
  } else if (numAmount >= 100000) { // 1 lakh
    return `\u20B9${(numAmount / 100000).toFixed(1)}L`;
  } else if (numAmount >= 1000) { // thousands
    return `\u20B9${(numAmount / 1000).toFixed(1)}K`;
  } else {
    return `\u20B9${numAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};

export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols and whitespace, parse as number
    const cleaned = value.replace(/\u20B9|INR|Rs|,|\s/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

export const CURRENCY_SYMBOL = '\u20B9';
export const CURRENCY_CODE = 'INR';
