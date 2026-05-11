'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Apple, Dumbbell, BookOpen, ChefHat, Target, CalendarDays, ClipboardList, History, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const FOOD_ITEMS = [
  { label: 'Diario', href: '/food/diary', icon: BookOpen },
  { label: 'Alimenti', href: '/food/database', icon: Apple },
  { label: 'Ricette', href: '/food/recipes', icon: ChefHat },
  { label: 'Completa Macro', href: '/food/macros', icon: Target },
  { label: 'Piano Alimentare', href: '/food/plan', icon: CalendarDays },
]

const TRAINING_ITEMS = [
  { label: 'Diario Allenamento', href: '/training/diary', icon: Dumbbell },
  { label: 'Storico', href: '/training/history', icon: History },
  { label: 'Piano Allenamento', href: '/training/plan', icon: ClipboardList },
]

type Sheet = 'food' | 'training' | null

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [sheet, setSheet] = useState<Sheet>(null)

  const isFoodActive = pathname.startsWith('/food')
  const isTrainingActive = pathname.startsWith('/training')
  const isDashboardActive = pathname === '/dashboard'

  function handleFood() { setSheet(s => s === 'food' ? null : 'food') }
  function handleTraining() { setSheet(s => s === 'training' ? null : 'training') }

  const items = sheet === 'food' ? FOOD_ITEMS : TRAINING_ITEMS
  const sheetTitle = sheet === 'food' ? 'Alimentazione' : 'Allenamento'
  const sheetColor = sheet === 'food' ? 'text-orange-500' : 'text-blue-500'

  return (
    <>
      {/* Bottom Sheet Overlay */}
      {sheet && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-gray-700 p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className={cn('font-bold text-base', sheetColor)}>{sheetTitle}</p>
              <button onClick={() => setSheet(null)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {items.map(item => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSheet(null)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium',
                      active
                        ? sheet === 'food' ? 'bg-orange-50 dark:bg-orange-950 text-orange-500' : 'bg-blue-50 dark:bg-blue-950 text-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}>
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center',
                      active
                        ? sheet === 'food' ? 'bg-orange-100 dark:bg-orange-900' : 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-gray-100 dark:bg-gray-800'
                    )}>
                      <item.icon size={16} />
                    </div>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
        <div className="flex">
          {/* Dashboard */}
          <Link href="/dashboard" className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors',
            isDashboardActive ? 'text-emerald-500' : 'text-gray-400'
          )}>
            <LayoutDashboard size={22} />
            Dashboard
          </Link>

          {/* Alimentazione */}
          <button onClick={handleFood} className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors',
            isFoodActive || sheet === 'food' ? 'text-orange-500' : 'text-gray-400'
          )}>
            <Apple size={22} />
            Alimentazione
          </button>

          {/* Allenamento */}
          <button onClick={handleTraining} className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors',
            isTrainingActive || sheet === 'training' ? 'text-blue-500' : 'text-gray-400'
          )}>
            <Dumbbell size={22} />
            Allenamento
          </button>
        </div>
      </nav>
    </>
  )
}
