'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MOBILE_NAV } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="flex">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href
          const color = active
            ? item.section === 'food' ? 'text-orange-500'
              : item.section === 'training' ? 'text-blue-500'
              : 'text-emerald-500'
            : 'text-gray-400'
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors', color)}>
              <item.icon size={20} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
