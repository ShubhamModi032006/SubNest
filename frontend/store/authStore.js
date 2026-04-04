import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchApi } from '@/lib/api'

const getPayload = (response) => response?.data ?? response

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setAuth: (user, token) => set({ user, token, isAuthenticated: !!token, error: null }),
      
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          const data = getPayload(response);
          set({ user: data.user ?? null, token: data.token ?? null, isAuthenticated: true, loading: false });
          return data;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },
      
      signup: async (name, email, password, role = 'user') => {
        set({ loading: true, error: null });
        try {
          const response = await fetchApi('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role }),
          });
          const data = getPayload(response);
          if (data.user && data.token) {
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
          } else {
            set({ loading: false });
          }
          return data;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      hydrateUser: async () => {
        const currentToken = get().token;
        if (!currentToken) return null;
        
        set({ loading: true, error: null });
        try {
          const response = await fetchApi('/auth/me', { method: 'GET' });
          const data = getPayload(response);
          // Update user but keep token intact
          set({ user: data.user ?? data, isAuthenticated: true, loading: false });
          return data;
        } catch (err) {
          // If token is invalid, log out
          set({ user: null, token: null, isAuthenticated: false, error: 'Session expired', loading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null });
        if (typeof window !== 'undefined') {
          // Clear any extra local storage if needed beyond persist middleware
          window.location.href = '/login';
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
