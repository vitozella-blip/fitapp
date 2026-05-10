import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = { title: string; subtitle?: string; icon?: LucideIcon; accent?: 'primary' | 'food' | 'training'; action?: React.ReactNode }

const iconStyle = {
  primary: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  food: 'bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400',
  training: 'bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400',
}

export function PageHeader({ title, subtitle, icon: Icon, accent = 'primary', action }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', iconStyle[accent])}>
            <Icon size={18} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
