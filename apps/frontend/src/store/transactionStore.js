import { create } from 'zustand';
import axiosInstance from '../utils/axios';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRangeText = (start, end) => {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getFallbackRange = (period, params = {}) => {
  const now = new Date();
  let start;
  let end;
  let label;
  let comparisonLabel;

  if (period === 'weekly') {
    const weekMode = String(params.week || 'current').toLowerCase();
    const day = (now.getDay() + 6) % 7;
    start = startOfDay(new Date(now));
    start.setDate(start.getDate() - day);
    if (weekMode === 'previous') {
      start.setDate(start.getDate() - 7);
      label = 'Previous Week';
      comparisonLabel = 'Two Weeks Ago';
    } else {
      label = 'Current Week';
      comparisonLabel = 'Previous Week';
    }
    end = endOfDay(new Date(start));
    end.setDate(end.getDate() + 6);
  } else if (period === 'quarterly') {
    const selectedYear = Number(params.year) || now.getFullYear();
    const selectedQuarter = Number(params.quarter) || Math.floor(now.getMonth() / 3) + 1;
    const quarterStartMonth = (selectedQuarter - 1) * 3;
    start = new Date(selectedYear, quarterStartMonth, 1);
    end = endOfDay(new Date(selectedYear, quarterStartMonth + 3, 0));
    label = `Q${selectedQuarter} ${selectedYear}`;
    const prevQuarterDate = new Date(selectedYear, quarterStartMonth - 3, 1);
    comparisonLabel = `Q${Math.floor(prevQuarterDate.getMonth() / 3) + 1} ${prevQuarterDate.getFullYear()}`;
  } else if (period === 'yearly') {
    const selectedYear = Number(params.year) || now.getFullYear();
    start = new Date(selectedYear, 0, 1);
    end = endOfDay(new Date(selectedYear, 11, 31));
    label = `Year ${selectedYear}`;
    comparisonLabel = `Year ${selectedYear - 1}`;
  } else if (period === 'custom' && params.startDate && params.endDate) {
    const parsedStart = new Date(String(params.startDate));
    const parsedEnd = new Date(String(params.endDate));
    if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd) {
      start = startOfDay(parsedStart);
      end = endOfDay(parsedEnd);
      label = `Custom (${formatRangeText(start, end)})`;
      comparisonLabel = 'Previous Range';
    }
  }

  if (!start || !end) {
    const monthInput = params.month ? String(params.month) : '';
    const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthInput);
    const selectedYear = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
    const selectedMonth = monthMatch ? Number(monthMatch[2]) : now.getMonth() + 1;
    start = new Date(selectedYear, selectedMonth - 1, 1);
    end = endOfDay(new Date(selectedYear, selectedMonth, 0));
    label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    comparisonLabel = new Date(selectedYear, selectedMonth - 2, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const durationMs = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs + 1);

  return {
    start,
    end,
    previousStart,
    previousEnd,
    label,
    comparisonLabel,
    rangeText: formatRangeText(start, end),
    previousRangeText: formatRangeText(previousStart, previousEnd)
  };
};

const getLegacyPeriodAnalytics = (legacyAnalytics, params = {}) => {
  const period = params.period || 'monthly';
  const fallbackRange = getFallbackRange(period, params);
  const legacyPeriodMap = {
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly'
  };
  const legacyKey = legacyPeriodMap[period] || 'monthly';
  const periodMetrics = legacyAnalytics?.[legacyKey] || legacyAnalytics?.monthly || {};

  const categoryBreakdown = legacyKey === 'monthly'
    ? (legacyAnalytics?.categoryBreakdown || { expenses: [], income: [] })
    : (legacyAnalytics?.[legacyKey]?.categoryBreakdown || { expenses: [], income: [] });

  const trendKey = legacyKey === 'monthly'
    ? 'monthlyTrends'
    : legacyKey === 'quarterly'
      ? 'quarterlyTrends'
      : 'yearlyTrends';

  const trend = Array.isArray(legacyAnalytics?.[trendKey])
    ? legacyAnalytics[trendKey].map((point) => ({
      period: point.period || point.month || '',
      income: toNumber(point.income),
      expenses: toNumber(point.expenses),
      netIncome: toNumber(point.netIncome)
    }))
    : [];

  return {
    period,
    label: fallbackRange.label,
    comparisonLabel: fallbackRange.comparisonLabel,
    range: {
      start: fallbackRange.start.toISOString(),
      end: fallbackRange.end.toISOString(),
      text: fallbackRange.rangeText
    },
    previousRange: {
      start: fallbackRange.previousStart.toISOString(),
      end: fallbackRange.previousEnd.toISOString(),
      text: fallbackRange.previousRangeText
    },
    metrics: {
      income: toNumber(periodMetrics.income),
      expenses: toNumber(periodMetrics.expenses),
      netIncome: toNumber(periodMetrics.netIncome),
      savingsRate: toNumber(periodMetrics.savingsRate),
      prevIncome: toNumber(periodMetrics.prevIncome),
      prevExpenses: toNumber(periodMetrics.prevExpenses),
      prevNetIncome: toNumber(periodMetrics.prevNetIncome),
      prevSavingsRate: toNumber(periodMetrics.prevSavingsRate)
    },
    categoryBreakdown: {
      expenses: categoryBreakdown?.expenses || [],
      income: categoryBreakdown?.income || []
    },
    trend,
    compatibilityMode: true,
    compatibilityMessage: 'Backend is running an older analytics API. Redeploy backend to enable full week/custom period analytics.'
  };
};

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  analytics: null,
  periodAnalytics: null,
  categories: {
    income: [],
    expense: []
  },
  isLoading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  filters: {
    type: '',
    category: '',
    subcategory: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
    search: '',
    tags: '',
    location: '',
    minAmount: '',
    maxAmount: '',
    visibility: 'all'
  },

  setFilters: (newFilters) => {
    set({
      filters: { ...get().filters, ...newFilters },
      currentPage: 1
    });
  },

  clearFilters: () => {
    set({
      filters: {
        type: '',
        category: '',
        subcategory: '',
        paymentMethod: '',
        startDate: '',
        endDate: '',
        search: '',
        tags: '',
        location: '',
        minAmount: '',
        maxAmount: '',
        visibility: 'all'
      },
      currentPage: 1
    });
  },

  fetchTransactions: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const queryParams = new URLSearchParams();
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      // Add additional params (sorting, pagination, etc.)
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axiosInstance.get(`/transactions?${queryParams.toString()}`);
      const data = response.data || {};
      const pagination = data.pagination || {};
      set({ 
        transactions: data.transactions || data,
        totalPages: data.totalPages || pagination.total || 1,
        currentPage: data.currentPage || pagination.current || 1,
        isLoading: false 
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch transactions';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  addTransaction: async (transactionData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.post(`/transactions`, transactionData);
      const newTransaction = response.data.transaction;
      
      set({ 
        transactions: [newTransaction, ...get().transactions], 
        isLoading: false 
      });
      
      get().fetchAnalytics();
      return { success: true, transaction: newTransaction };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add transaction';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateTransaction: async (id, transactionData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.put(`/transactions/${id}`, transactionData);
      const updatedTransaction = response.data.transaction;
      
      set({ 
        transactions: get().transactions.map(t => 
          t.id === id ? updatedTransaction : t
        ), 
        isLoading: false 
      });
      
      get().fetchAnalytics();
      return { success: true, transaction: updatedTransaction };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update transaction';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/transactions/${id}`);
      
      set({ 
        transactions: get().transactions.filter(t => t.id !== id), 
        isLoading: false 
      });
      
      get().fetchAnalytics();
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete transaction';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  setTransactionVisibility: async (id, isHidden) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.patch(`/transactions/${id}/visibility`, { isHidden });
      const updatedTransaction = response.data.transaction;

      set({
        transactions: get().transactions.map((t) =>
          t.id === id ? updatedTransaction : t
        ),
        isLoading: false
      });

      get().fetchAnalytics();
      return { success: true, transaction: updatedTransaction };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update visibility';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  fetchAnalytics: async () => {
    try {
      const response = await axiosInstance.get(`/transactions/analytics`);
      set({ analytics: response.data });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch analytics';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  fetchPeriodAnalytics: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await axiosInstance.get(`/transactions/analytics/period?${queryParams.toString()}`);
      set({ periodAnalytics: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        try {
          const legacyResponse = await axiosInstance.get('/transactions/analytics');
          const compatibilityPayload = getLegacyPeriodAnalytics(legacyResponse.data, params);
          set({
            periodAnalytics: compatibilityPayload,
            error: compatibilityPayload.compatibilityMessage
          });
          return { success: true, data: compatibilityPayload, compatibilityMode: true };
        } catch (legacyError) {
          const legacyErrorMessage = legacyError.response?.data?.message || 'Failed to fetch legacy analytics';
          const currentPeriodAnalytics = get().periodAnalytics;
          if (!currentPeriodAnalytics) {
            set({
              periodAnalytics: getLegacyPeriodAnalytics({}, params),
              error: legacyErrorMessage
            });
          } else {
            set({ error: legacyErrorMessage });
          }
          return { success: false, error: legacyErrorMessage };
        }
      }

      const errorMessage = error.response?.data?.message || 'Failed to fetch period analytics';
      const currentPeriodAnalytics = get().periodAnalytics;
      if (!currentPeriodAnalytics) {
        set({
          periodAnalytics: getLegacyPeriodAnalytics({}, params),
          error: errorMessage
        });
      } else {
        set({ error: errorMessage });
      }
      return { success: false, error: errorMessage };
    }
  },

  fetchCategories: async () => {
    try {
      const response = await axiosInstance.get(`/transactions/categories`);
      set({ categories: response.data });
      return { success: true };
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fallback categories if API fails
      set({
        categories: {
          income: ['Salary', 'Freelance', 'Business', 'Investments', 'Other Income'],
          expense: ['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Other Expenses']
        }
      });
      return { success: false };
    }
  },

  // Bulk operations
  exportTransactions: async (filters = {}) => {
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const queryParams = new URLSearchParams();
      Object.entries(mergedFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      queryParams.append('limit', '10000');

      const response = await axiosInstance.get(`/transactions?${queryParams.toString()}`);
      const data = response.data || {};
      const transactions = data.transactions || [];
      const csvContent = [
        ['Date', 'Type', 'Description', 'Category', 'Subcategory', 'Amount', 'Payment Method', 'Location', 'Tags', 'Notes'].join(','),
        ...transactions.map(t => [
          t.date,
          t.type,
          `"${t.description}"`,
          t.category,
          t.subcategory || '',
          t.amount,
          t.paymentMethod || '',
          t.location || '',
          (t.tags || []).join(';'),
          `"${t.notes || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch {
      const errorMessage = 'Failed to export transactions';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  importTransactions: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axiosInstance.post(`/transactions/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      set({ isLoading: false });
      get().fetchTransactions();
      return { success: true, imported: response.data.imported };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to import transactions';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  downloadReport: async (options = 'monthly') => {
    try {
      const params = typeof options === 'string' ? { timeframe: options } : options;
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const timeframe = params.timeframe || 'monthly';
      const response = await axiosInstance.get(`/transactions/report?${queryParams.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expense-tracker-${timeframe}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch {
      const errorMessage = 'Failed to download report';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }
}));
