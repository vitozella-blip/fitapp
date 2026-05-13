import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = { title: string; subtitle?: string; icon?: LucideIcon; accent?: 'primary' | 'food' | 'training'; action?: React.ReactNode }

const iconStyle = {
  primary:  { bg: '#9d8fcc18', color: '#9d8fcc' },
  food:     { bg: '#f0aa7818', color: '#f0aa78' },
  training: { bg: '#7aafc818', color: '#7aafc8' },
}

export function PageHeader({ title, subtitle, icon: Icon, accent = 'primary', action }: Props) {
  const s = iconStyle[accent]
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>
            <Icon size={17} />
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
