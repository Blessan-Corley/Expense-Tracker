import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axiosInstance from '../utils/axios';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      setCredentials: (user, token) => {
        set({ user, token, error: null, isAuthenticated: true });
        // Token is handled by axiosInstance interceptor
      },

      clearCredentials: () => {
        set({ user: null, token: null, error: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
      },

      // Validate token and check if user is still authenticated
      validateToken: async () => {
        const { token } = get();
        if (!token) {
          return false;
        }

        try {
          // Try to make an authenticated request to validate token
          const response = await axiosInstance.get('/auth/me');
          const { user } = response.data;
          set({ user, isAuthenticated: true });
          return true;
        } catch {
          // Token is invalid or expired
          get().clearCredentials();
          return false;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axiosInstance.post('/auth/login', {
            email,
            password,
          });
          
          const { user, token } = response.data;
          get().setCredentials(user, token);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axiosInstance.post('/auth/register', {
            name,
            email,
            password,
          });
          
          const { user, token } = response.data;
          get().setCredentials(user, token);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      logout: () => {
        get().clearCredentials();
      },

      updateBudget: async (monthlyBudget) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axiosInstance.put('/transactions/budget', { monthlyBudget });
          const { user } = response.data;
          set({ user, isLoading: false });
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Budget update failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          // Validate token on app restart
          setTimeout(() => {
            const { validateToken } = useAuthStore.getState();
            validateToken();
          }, 100);
        }
      },
    }
  )
);