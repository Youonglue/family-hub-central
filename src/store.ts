import create from 'zustand'
import { persist } from 'zustand/middleware'

type User = { name?: string; email?: string } | null

interface AppState {
  user: User
  setUser: (u: User) => void
  clearUser: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'family-hub-central-storage', // localStorage key
    }
  )
)
