import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      logout: () => set({ user: null, token: null, error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }), // only persist token and user
    }
  )
)
