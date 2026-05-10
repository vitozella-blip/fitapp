'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Zap } from 'lucide-react'

const accentCls = {
  primary: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950',
  food: 'text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-950',
  training: 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950',
}
const dotCls = {
  primary: 'bg-emerald-500',
  food: 'bg-orange-400',
  training: 'bg-blue-400',
}

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 py-5 px-3">
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-lg text-gray-900 dark:text-gray-100">FitApp</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.label || 'main'}>
            {group.label && (
              <div className="flex items-center gap-2 px-3 mb-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full', dotCls[group.accent])} />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{group.label}</span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}
                    className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      active ? accentCls[group.accent] : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}>
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-400">v1.0 · FitApp</p>
      </div>
    </aside>
  )
}
