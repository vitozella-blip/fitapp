'use client'
import Link from 'next/link'

const C = {
  kcal:     '#9d8fcc',
  protein:  '#7dbf7d',
  carbs:    '#f0aa78',
  fat:      '#c4a0d6',
  training: '#7aafc8',
} as const

const SECTIONS = [
  { label: 'Diario Pasti',     href: '/food/diary',     e: '📖', color: C.kcal    },
  { label: 'Alimenti',         href: '/food/database',  e: '🥚', color: C.carbs   },
  { label: 'Ricette',          href: '/food/recipes',   e: '👨🏻‍🍳', color: C.fat    },
  { label: 'Completa Macro',   href: '/food/macros',    e: '🎯', color: '#e07070' },
  { label: 'Piano Alimentare', href: '/food/plan',      e: '🗓️', color: C.protein },
]

export default function FoodHubPage() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alimentazione</h1>
        <p className="text-sm text-gray-400 mt-1">Gestisci la tua nutrizione</p>
      </div>
      <div className="space-y-2">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href}
            className="flex items-center justify-center gap-1.5 py-2 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ backgroundColor: s.color + '28' }}>
            <span style={{ fontSize: 20, lineHeight: 1, display: 'inline-block', userSelect: 'none' }}>{s.e}</span>
            <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
