import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserProfile = {
  id: string
  name: string
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

type AppStore = {
  userId: string
  users: { id: string; name: string }[]
  selectedDate: string
  setSelectedDate: (d: string) => void
  userProfile: UserProfile
  setUserProfile: (p: Partial<UserProfile>) => void
  addUser: (name: string) => string
  switchUser: (id: string, name: string) => void
  updateCurrentUserName: (name: string) => void
}

const defaultProfile = (id: string, name = 'Utente'): UserProfile => ({
  id, name,
  targetCalories: 2000,
  targetProtein: 150,
  targetCarbs: 220,
  targetFat: 65,
})

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      const initialId = crypto.randomUUID()
      return {
        userId: initialId,
        users: [{ id: initialId, name: 'Utente' }],
        selectedDate: new Date().toISOString().split('T')[0],
        setSelectedDate: (d) => set({ selectedDate: d }),
        userProfile: defaultProfile(initialId),
        setUserProfile: (p) => set((s) => ({ userProfile: { ...s.userProfile, ...p } })),
        addUser: (name) => {
          const id = crypto.randomUUID()
          set(s => ({ users: [...s.users, { id, name }] }))
          return id
        },
        switchUser: (id, name) => {
          set({ userId: id, userProfile: defaultProfile(id, name) })
        },
        updateCurrentUserName: (name) => {
          const { userId } = get()
          set(s => ({
            userProfile: { ...s.userProfile, name },
            users: s.users.map(u => u.id === userId ? { ...u, name } : u),
          }))
        },
      }
    },
    { name: 'fitapp-store' }
  )
)
