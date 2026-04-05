import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  session: any | null
  setUser: (user: User | null) => void
  setSession: (session: any | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
}))
