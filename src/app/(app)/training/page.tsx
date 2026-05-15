'use client'
import Link from 'next/link'

const C = {
  kcal:     '#9d8fcc',
  protein:  '#7dbf7d',
  training: '#7aafc8',
} as const

const SECTIONS = [
  { label: 'Piano Allenamento',   href: '/training/plan',    e: '🗓️', color: C.training },
  { label: 'Diario Allenamenti',  href: '/training/diary',   e: '📖', color: C.kcal     },
  { label: 'Storico',             href: '/training/history', e: '📈', color: C.protein  },
]

export default function TrainingHubPage() {
  return (
    <div className="max-w-2xl mx-auto md:max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Allenamento</h1>
        <p className="text-sm text-gray-400 mt-1">Gestisci i tuoi workout</p>
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
