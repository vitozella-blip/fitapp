import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserProfile = {
  name: string
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

type AppStore = {
  userId: string
  selectedDate: string
  setSelectedDate: (d: string) => void
  userProfile: UserProfile
  setUserProfile: (p: Partial<UserProfile>) => void
}

const defaultProfile: UserProfile = {
  name: 'Utente',
  targetCalories: 2000,
  targetProtein: 150,
  targetCarbs: 220,
  targetFat: 65,
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      userId: crypto.randomUUID(),
      selectedDate: new Date().toISOString().split('T')[0],
      setSelectedDate: (d) => set({ selectedDate: d }),
      userProfile: defaultProfile,
      setUserProfile: (p) => set((s) => ({ userProfile: { ...s.userProfile, ...p } })),
    }),
    { name: 'fitapp-store' }
  )
)
