import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchApi } from '@/lib/api'

const getPayload = (response) => response?.data ?? response

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setAuth: (user, token) => set({ user, token, error: null }),
      
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          const data = getPayload(response);
          set({ user: data.user ?? null, token: data.token ?? null, loading: false });
          return data;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },
      
      signup: async (name, email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await fetchApi('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
          });
          const data = getPayload(response);
          set({ loading: false });
          return data;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
        if (typeof window !== 'undefined') {
          // Additional cleanup if necessary, persist middleware handles localStorage state automatically
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
