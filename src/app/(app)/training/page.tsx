'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { Dumbbell, TrendingUp, History, ClipboardList, Scale } from 'lucide-react'
import { WorkoutBadge, SCHEDA_COLORS } from '@/components/training/WorkoutBadge'
import { cn } from '@/lib/utils'

const COLOR = '#7aafc8'

const DIARY = { label: 'Diario Allenamenti', href: '/training/diary', icon: Dumbbell }
const SECTIONS = [
  { label: 'Progressi',         href: '/training/progressi', icon: TrendingUp },
  { label: 'Storico',           href: '/training/history',   icon: History },
  { label: 'Peso',              href: '/training/peso',      icon: Scale },
  { label: 'Piano Allenamento', href: '/training/plan',      icon: ClipboardList },
]

type Period = 'settimana' | 'mese' | 'mese_scorso' | 'custom'

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
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
  const [period, setPeriod] = useState<Period>('mese')
  const [from, setFrom] = useState(today.slice(0, 8) + '01')
  const [to, setTo]     = useState(today)

  function applyPeriod(p: Period) {
    setPeriod(p)
    const d = new Date(today + 'T00:00:00')
    if (p === 'settimana') {
      const f = new Date(d); f.setDate(d.getDate() - 6)
      setFrom(toIso(f)); setTo(today)
    } else if (p === 'mese') {
      setFrom(today.slice(0, 8) + '01'); setTo(today)
    } else if (p === 'mese_scorso') {
      const first = new Date(d.getFullYear(), d.getMonth() - 1, 1)
      const last  = new Date(d.getFullYear(), d.getMonth(), 0)
      setFrom(toIso(first)); setTo(toIso(last))
    }
  }

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
    <div className="max-w-2xl mx-auto md:max-w-none flex flex-col gap-2 md:gap-4 h-full min-h-0">

      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <img src="/icon-training.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Allenamento</h1>
      </div>

      {/* Body */}
      <div className="grid gap-2 md:gap-4 flex-1 min-h-0" style={{ gridTemplateRows: '1fr 0.75fr' }}>

        {/* TOP — calendario allenamenti */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="px-2 py-2 shrink-0 border-b border-gray-100 dark:border-gray-800"
            style={{ backgroundColor: COLOR + '12' }}>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: COLOR }}>Allenamenti</p>
              <div className="flex items-center gap-1 flex-1">
                {(['settimana', 'mese', 'mese_scorso', 'custom'] as const).map(p => (
                  <button key={p} onClick={() => applyPeriod(p)}
                    className={cn(
                      'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors',
                      period === p
                        ? 'text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700'
                    )}
                    style={period === p ? { backgroundColor: COLOR } : undefined}>
                    {p === 'settimana' ? 'Sett.' : p === 'mese' ? 'Mese' : p === 'mese_scorso' ? 'Prec.' : 'Custom'}
                  </button>
                ))}
              </div>
              {from && to && from <= to && (
                <span className="text-[10px] font-semibold shrink-0" style={{ color: COLOR }}>
                  {Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1}g
                </span>
              )}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-300"
                  style={{ width: 110 }} />
                <span className="text-[10px] text-gray-400 shrink-0">→</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-300"
                  style={{ width: 110 }} />
              </div>
            )}
          </div>

          {/* Riga statistiche: WO + Tennis */}
          <div className="px-3 py-1.5 shrink-0 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold leading-none" style={{ color: COLOR }}>{totalDates}</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">wo</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold leading-none" style={{ color: COLOR }}>{totalTennis}</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">tennis</span>
            </div>
          </div>

          {templates.length === 0 && tennisDates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Nessun allenamento nel periodo
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 grid divide-x divide-gray-100 dark:divide-gray-800"
              style={{ gridTemplateColumns: `repeat(${templates.length + 1}, minmax(0, 1fr))` }}
            >
              {/* Tennis column */}
              <div className="flex flex-col min-h-0">
                <div className="px-2 h-[32px] border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-center">
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
              {templates.map((t, tArrIdx) => {
                const tColor = SCHEDA_COLORS[tArrIdx % SCHEDA_COLORS.length]
                return (
                  <div key={t.id} className="flex flex-col min-h-0">
                    <div className="px-2 h-[32px] border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-center">
                      <WorkoutBadge color={tColor} shapeIdx={tArrIdx} size={12} />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {t.dates.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-gray-400">—</p>
                      ) : (
                        [...t.dates].sort().map(date => (
                          <Link key={date} href={`/training/diary?date=${date}`}
                            className="flex items-center gap-0.5 px-1 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                            <WorkoutBadge color={tColor} shapeIdx={tArrIdx} size={7} />
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

        {/* BOTTOM — Diario Allenamenti + 2 righe da 2 */}
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <Link href={DIARY.href}
            className="flex items-center justify-center gap-3 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
            style={{ flex: '0 0 25%', backgroundColor: COLOR + '35' }}>
            <DIARY.icon className="!w-6 !h-6" style={{ color: COLOR }} />
            <span className="text-sm font-bold tracking-wide" style={{ color: COLOR }}>{DIARY.label}</span>
          </Link>
          {[SECTIONS.slice(0, 2), SECTIONS.slice(2, 4)].map((row, ri) => (
            <div key={ri} className="flex gap-2 flex-1 min-h-0">
              {row.map(s => (
                <Link key={s.href} href={s.href}
                  className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
                  style={{ backgroundColor: COLOR + '20' }}>
                  <s.icon className="!w-5 !h-5" style={{ color: COLOR }} />
                  <span className="text-xs font-bold text-center leading-tight px-1" style={{ color: COLOR }}>{s.label}</span>
                </Link>
              ))}
            </div>
          ))}
          <div className="flex-1 min-h-0" />
        </div>

      </div>
    </div>
  )
}
