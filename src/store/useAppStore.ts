import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserProfile = {
  id: string
  name: string
  email?: string
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
  login: (user: { id: string; name: string; email: string; targetCalories?: number; targetProtein?: number; targetCarbs?: number; targetFat?: number }) => void
  logout: () => void
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
        login: (user) => {
          const profile: UserProfile = {
            id:             user.id,
            name:           user.name,
            email:          user.email,
            targetCalories: user.targetCalories ?? 2000,
            targetProtein:  user.targetProtein  ?? 150,
            targetCarbs:    user.targetCarbs    ?? 220,
            targetFat:      user.targetFat      ?? 65,
          }
          set(s => ({
            userId: user.id,
            userProfile: profile,
            users: s.users.some(u => u.id === user.id)
              ? s.users
              : [...s.users, { id: user.id, name: user.name }],
          }))
        },
        logout: () => {
          const newId = crypto.randomUUID()
          set({
            userId: newId,
            userProfile: defaultProfile(newId),
            users: [{ id: newId, name: 'Utente' }],
          })
        },
      }
    },
    { name: 'fitapp-store' }
  )
)
