'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { Dumbbell, TrendingUp, History, ClipboardList } from 'lucide-react'
import { WorkoutBadge, SCHEDA_COLORS } from '@/components/training/WorkoutBadge'

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

function abbrevTemplate(name: string) {
  const m = name.match(/(?:workout|wo)\s*(\d+)\s*[—–\-]+\s*(.+)/i)
  if (!m) return name
  const abbrev = m[2].trim().split(/[\s+&,]+/).filter(Boolean).map((w: string) => w[0].toUpperCase()).join('')
  return `WO ${m[1]} — ${abbrev}`
}

type Template = { id: string; name: string; order: number; dates: string[] }

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TrainingHubPage() {
  const { userId } = useAppStore()
  const [templates, setTemplates] = useState<Template[]>([])
  const [tennisDates, setTennisDates] = useState<string[]>([])

  const today = toIso(new Date())
  const firstOfMonth = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo]     = useState(today)

  useEffect(() => {
    if (!from || !to || from > to) return
    fetch(`/api/training-hub?userId=${userId}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? []); setTennisDates(d.tennisDates ?? []) })
      .catch(() => {})
  }, [userId, from, to])

  const totalDates  = new Set(templates.flatMap(t => t.dates)).size
  const totalTennis = tennisDates.length

  return (
    <div className="max-w-2xl mx-auto md:max-w-none flex flex-col gap-2 md:gap-4 h-full">

      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/icon-training.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Allenamento</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestisci i tuoi workout</p>
        </div>
      </div>

      {/* Body — 50/50 */}
      <div className="grid gap-2 md:gap-4 flex-1 min-h-0" style={{ gridTemplateRows: '1fr 0.75fr' }}>

        {/* TOP — una colonna per scheda */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="px-4 pt-3 pb-2 shrink-0 border-b border-gray-100 dark:border-gray-800"
            style={{ backgroundColor: COLOR + '12' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: COLOR }}>
                Allenamenti · {totalDates} wo · {totalTennis} tennis
              </p>
              <div className="flex items-center gap-1.5 flex-1">
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none"
                  style={{ width: 110 }} />
                <span className="text-[10px] text-gray-400 shrink-0">→</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none"
                  style={{ width: 110 }} />
                {from && to && from <= to && (
                  <span className="text-[10px] font-semibold shrink-0" style={{ color: COLOR }}>
                    {Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1} giorni
                  </span>
                )}
              </div>
            </div>
          </div>

          {templates.length === 0 && tennisDates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Nessun piano attivo
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 grid divide-x divide-gray-100 dark:divide-gray-800"
              style={{ gridTemplateColumns: `repeat(${templates.length + 1}, 1fr)` }}
            >
              {/* Tennis column */}
              <div className="flex flex-col min-h-0">
                <div className="px-2 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-center">
                  <span style={{ fontSize: 13, lineHeight: 1 }}>🎾</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {tennisDates.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-gray-400">—</p>
                  ) : (
                    [...tennisDates].sort().map(date => (
                      <Link key={date} href={`/training/diary?date=${date}`}
                        className="flex items-center gap-0.5 px-1 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: COLOR }} />
                        <span className="text-[9px] text-gray-600 dark:text-gray-300 capitalize leading-tight whitespace-nowrap">{fmtDate(date)}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Workout template columns */}
              {templates.map(t => {
                const tColor = SCHEDA_COLORS[t.order % SCHEDA_COLORS.length]
                return (
                  <div key={t.id} className="flex flex-col min-h-0">
                    <div className="px-2 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-center gap-1.5">
                      <WorkoutBadge color={tColor} shapeIdx={t.order} size={14} />
                      <p className="text-[10px] font-bold truncate" style={{ color: tColor }}>{abbrevTemplate(t.name)}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {t.dates.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-gray-400">—</p>
                      ) : (
                        [...t.dates].sort().map(date => (
                          <Link key={date} href={`/training/diary?date=${date}`}
                            className="flex items-center gap-0.5 px-1 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                            <WorkoutBadge color={tColor} shapeIdx={t.order} size={7} />
                            <span className="text-[9px] text-gray-600 dark:text-gray-300 capitalize leading-tight whitespace-nowrap">{fmtDate(date)}</span>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* BOTTOM — tasti 3 per riga */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 min-h-0" style={{ gridTemplateRows: '1fr 1fr' }}>
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}
              className="flex flex-col items-center justify-center gap-1.5 md:gap-3 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
              style={{ backgroundColor: COLOR + '20' }}>
              <s.icon className="!w-5 !h-5 md:!w-7 md:!h-7" style={{ color: COLOR }} />
              <span className="text-xs md:text-sm font-semibold text-center leading-tight px-1 md:px-2" style={{ color: COLOR }}>{s.label}</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
