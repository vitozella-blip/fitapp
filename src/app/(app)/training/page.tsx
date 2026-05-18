'use client'
import Link from 'next/link'

const COLOR = '#7aafc8'

const SECTIONS = [
  { label: 'Diario Allenamenti', href: '/training/diary',   e: '📖' },
  { label: 'Storico',            href: '/training/history', e: '📈' },
  { label: 'Piano Allenamento',  href: '/training/plan',    e: '🗓️' },
]

export default function TrainingHubPage() {
  return (
    <div className="max-w-2xl mx-auto md:max-w-none">
      <div className="mb-6 flex items-center gap-3">
        <img src="/icon-training.png" alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Allenamento</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestisci i tuoi workout</p>
        </div>
      </div>
      <div className="space-y-2">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ backgroundColor: COLOR + '28' }}>
            <span style={{ fontSize: 24, lineHeight: 1, display: 'inline-block', userSelect: 'none' }}>{s.e}</span>
            <span className="text-sm font-bold" style={{ color: COLOR }}>{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
