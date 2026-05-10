'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

export function Header() {
  const { theme, setTheme } = useTheme()
  const profile = useAppStore((s) => s.userProfile)
  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 flex items-center justify-between sticky top-0 z-10">
      <div>
        <p className="text-xs text-gray-400 capitalize">{formatDate(new Date())}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ciao, {profile.name} 👋</p>
      </div>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  )
}
