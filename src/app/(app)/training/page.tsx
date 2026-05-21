'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { Dumbbell, TrendingUp, History, ClipboardList } from 'lucide-react'

const COLOR = '#7aafc8'

const SECTIONS = [
  { label: 'Diario Allenamenti', href: '/training/diary',     icon: Dumbbell },
  { label: 'Progressi',          href: '/training/progressi', icon: TrendingUp },
  { label: 'Storico',            href: '/training/history',   icon: History },
  { label: 'Piano Allenamento',  href: '/training/plan',      icon: ClipboardList },
]

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

type Template = { id: string; name: string; order: number; dates: string[] }

export default function TrainingHubPage() {
  const { userId } = useAppStore()
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    const now = new Date()
    fetch(`/api/training-hub?userId=${userId}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []))
      .catch(() => {})
  }, [userId])

  const monthLabel  = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const totalDates  = new Set(templates.flatMap(t => t.dates)).size

  return (
    <div className="max-w-2xl mx-auto md:max-w-none flex flex-col gap-4 md:h-full">

      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/icon-training.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Allenamento</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestisci i tuoi workout</p>
        </div>
      </div>

      {/* Body — 50/50 */}
      <div className="grid gap-4 flex-1 min-h-0" style={{ gridTemplateRows: '1fr 1fr' }}>

        {/* TOP — una colonna per scheda */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest capitalize" style={{ color: COLOR }}>
              {monthLabel} · {totalDates} allenamenti
            </p>
          </div>

          {templates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Nessun piano attivo
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 grid divide-x divide-gray-100 dark:divide-gray-800"
              style={{ gridTemplateColumns: `repeat(${templates.length}, 1fr)` }}
            >
              {templates.map(t => (
                <div key={t.id} className="flex flex-col min-h-0">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <p className="text-xs font-bold truncate" style={{ color: COLOR }}>{t.name}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {t.dates.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-gray-400">—</p>
                    ) : (
                      [...t.dates].sort().reverse().map(date => (
                        <Link key={date} href={`/training/diary?date=${date}`}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR }} />
                          <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{fmtDate(date)}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM — tasti 3 per riga */}
        <div className="grid grid-cols-3 gap-3 min-h-0" style={{ gridTemplateRows: '1fr 1fr' }}>
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
              style={{ backgroundColor: COLOR + '20' }}>
              <s.icon size={28} style={{ color: COLOR }} />
              <span className="text-sm font-semibold text-center leading-tight px-2" style={{ color: COLOR }}>{s.label}</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
