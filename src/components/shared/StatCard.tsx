'use client'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

type Props = { label: string; value: string | number; unit?: string; icon: LucideIcon; accent?: 'primary' | 'food' | 'training'; sub?: string }

const iconBg = {
  primary: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  food: 'bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400',
  training: 'bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400',
}

export function StatCard({ label, value, unit, icon: Icon, accent = 'primary', sub }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', iconBg[accent])}>
          <Icon size={15} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
        </div>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
