import { create } from 'zustand';
import axiosInstance from '../utils/axios';

export const useGoalsStore = create((set, get) => ({
  goals: [],
  summary: null,
  isLoading: false,
  error: null,

  fetchGoals: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axiosInstance.get(`/goals?${params.toString()}`);
      set({ goals: response.data.goals, isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch goals';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  addGoal: async (goalData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.post('/goals', goalData);
      const newGoal = response.data.goal;
      
      set({ 
        goals: [newGoal, ...get().goals], 
        isLoading: false 
      });
      
      get().fetchSummary();
      return { success: true, goal: newGoal };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create goal';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateGoal: async (id, goalData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.put(`/goals/${id}`, goalData);
      const updatedGoal = response.data.goal;
      
      set({ 
        goals: get().goals.map(g => g.id === id ? updatedGoal : g), 
        isLoading: false 
      });
      
      get().fetchSummary();
      return { success: true, goal: updatedGoal };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update goal';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  contributeToGoal: async (id, amount) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.post(`/goals/${id}/contribute`, { amount });
      const updatedGoal = response.data.goal;
      
      set({ 
        goals: get().goals.map(g => g.id === id ? updatedGoal : g), 
        isLoading: false 
      });
      
      get().fetchSummary();
      return { success: true, goal: updatedGoal, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to contribute to goal';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  deleteGoal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/goals/${id}`);
      
      set({ 
        goals: get().goals.filter(g => g.id !== id), 
        isLoading: false 
      });
      
      get().fetchSummary();
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete goal';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  fetchSummary: async () => {
    try {
      const response = await axiosInstance.get('/goals/summary');
      set({ summary: response.data });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch goals summary';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Helper functions
  getGoalsByCategory: (category) => {
    return get().goals.filter(goal => goal.category === category);
  },

  getActiveGoals: () => {
    return get().goals.filter(goal => !goal.isCompleted);
  },

  getCompletedGoals: () => {
    return get().goals.filter(goal => goal.isCompleted);
  },

  getTotalProgress: () => {
    const goals = get().goals;
    if (goals.length === 0) return 0;
    
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    
    return totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  }
}));