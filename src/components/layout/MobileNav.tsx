'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Apple, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, match: '/dashboard' },
  { label: 'Alimentazione', href: '/food', icon: Apple, match: '/food' },
  { label: 'Allenamento', href: '/training', icon: Dumbbell, match: '/training' },
]

const colors = {
  '/dashboard': 'text-emerald-500',
  '/food': 'text-orange-500',
  '/training': 'text-blue-500',
}

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="flex">
        {TABS.map(tab => {
          const active = pathname === tab.match || (tab.match !== '/dashboard' && pathname.startsWith(tab.match))
          return (
            <Link key={tab.href} href={tab.href}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors',
                active ? colors[tab.match as keyof typeof colors] : 'text-gray-400'
              )}>
              <tab.icon size={22} />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
