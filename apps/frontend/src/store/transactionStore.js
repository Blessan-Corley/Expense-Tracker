import { create } from 'zustand';
import axiosInstance from '../utils/axios';

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
      const errorMessage = error.response?.data?.message || 'Failed to fetch period analytics';
      set({ error: errorMessage });
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
