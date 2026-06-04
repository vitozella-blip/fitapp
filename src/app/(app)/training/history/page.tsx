'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { History, Dumbbell, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SCHEDA_COLORS } from '@/components/training/WorkoutBadge'
import { SchedaBadge, TennisBadge } from '@/components/shared/icons'
import { schedaAbbrev } from '@/lib/theme'

const C = { training: '#7aafc8', accent: '#9d8fcc' }

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type WorkoutSummary = {
  id: string; date: string; setCount: number; exerciseCount: number
  templateName?: string; templateOrder?: number
  isTennis?: boolean; tennisHours?: number; tennisTag?: string
}

type WorkoutSet = {
  id: string; setNumber: number; reps?: number; weight?: number; isWarmup: boolean; tag?: string
  exercise: { id: string; name: string; muscleGroup?: string; isDuration?: boolean } | null
}

type WorkoutDetail = { id: string; date: string; sets: WorkoutSet[] }

function groupByExercise(sets: WorkoutSet[]) {
  const map = new Map<string, { name: string; muscleGroup?: string; isDuration: boolean; sets: WorkoutSet[] }>()
  for (const s of sets) {
    if (!s.exercise) continue
    const key = s.exercise.id
    if (!map.has(key)) map.set(key, { name: s.exercise.name, muscleGroup: s.exercise.muscleGroup, isDuration: !!s.exercise.isDuration, sets: [] })
    map.get(key)!.sets.push(s)
  }
  return [...map.values()]
}

const C_WARM = '#f0aa78'

function fmtSet(s: WorkoutSet, isDuration: boolean) {
  if (isDuration) return s.reps ? `${s.reps}s` : '—'
  // Warmup sets with no weight → 0 (done bodyweight / no load)
  const w = s.weight ?? (s.isWarmup ? 0 : '?')
  return `${s.reps ?? '?'} × ${w} kg`
}

function abbrevTemplate(name: string) {
  const m = name.match(/(?:workout|wo)\s*(\d+)\s*[—–\-]+\s*(.+)/i)
  if (!m) return name
  const abbrev = m[2].trim().split(/[\s+&,]+/).filter(Boolean).map((w: string) => w[0].toUpperCase()).join('')
  return `WO ${m[1]} — ${abbrev}`
}

type Period = 'settimana' | 'mese' | 'mese_scorso' | 'custom'

export default function TrainingHistoryPage() {
  const userId = useAppStore((s) => s.userId)

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

  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails]   = useState<Record<string, WorkoutDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!from || !to || from > to) return
    setLoading(true)
    fetch(`/api/workout?userId=${userId}&all=1&from=${from}&to=${to}`)
      .then(r => r.json()).then(setWorkouts).catch(() => setWorkouts([]))
      .finally(() => setLoading(false))
  }, [userId, from, to])

  async function toggle(w: WorkoutSummary) {
    if (expanded === w.id) { setExpanded(null); return }
    setExpanded(w.id)
    if (details[w.id]) return
    setDetailLoading(w.id)
    const d = await fetch(`/api/workout?userId=${userId}&date=${w.date}`).then(r => r.json()).catch(() => null)
    if (d) setDetails(prev => ({ ...prev, [w.id]: d }))
    setDetailLoading(null)
  }

  const calDays = from && to && from <= to
    ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
    : null

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Storico Allenamenti" icon={History} accent="training" />

      {/* Period filter */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2"
        style={{ backgroundColor: C.training + '0e' }}>
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: C.training }}>Periodo</p>
          <div className="flex items-center gap-1 flex-1">
            {(['settimana', 'mese', 'mese_scorso', 'custom'] as const).map(p => (
              <button key={p} onClick={() => applyPeriod(p)}
                className={cn(
                  'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors',
                  period === p
                    ? 'text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700'
                )}
                style={period === p ? { backgroundColor: C.training } : undefined}>
                {p === 'settimana' ? 'Sett.' : p === 'mese' ? 'Mese' : p === 'mese_scorso' ? 'Prec.' : 'Custom'}
              </button>
            ))}
          </div>
          {calDays && (
            <span className="text-[10px] font-semibold shrink-0" style={{ color: C.training }}>
              {calDays}g
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

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
        </div>
      ) : workouts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <History size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessun allenamento nel periodo selezionato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...workouts].reverse().map(w => {
            const isOpen  = expanded === w.id
            const date    = new Date(w.date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
            const detail  = details[w.id]
            const groups  = detail ? groupByExercise(detail.sets ?? []) : []
            const tplName  = w.templateName ? abbrevTemplate(w.templateName) : null
            const tplIdx   = w.templateOrder ?? 0   // already 0-based from SQL rank
            const tplColor = SCHEDA_COLORS[tplIdx % SCHEDA_COLORS.length]
            const tennis    = !!w.isTennis
            // Giorno con WO reale: ha templateName oppure più di 1 esercizio (esclude puro tennis)
            const hasGym    = !!(w.templateName || (w.exerciseCount ?? 0) > 1)
            const purelyTennis = tennis && !hasGym

            const tennisLabel = w.tennisTag
              ? w.tennisTag.charAt(0).toUpperCase() + w.tennisTag.slice(1)
              : 'Tennis'
            const tennisHoursLabel = w.tennisHours
              ? ` · ${w.tennisHours} ${w.tennisHours === 1 ? 'ora' : 'ore'}`
              : ''

            return (
              <div key={w.id} className="space-y-2">

                {/* ── Riga WO (se presente) ── */}
                {hasGym && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <button onClick={() => toggle(w)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: C.training + '20', color: C.training }}>
                        <Dumbbell size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{date}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <p className="text-xs text-gray-400">{w.exerciseCount} esercizi · {w.setCount} serie</p>
                          {tplName && (
                            <span className="flex items-center gap-1">
                              <SchedaBadge label={schedaAbbrev(w.templateName ?? '')} color={tplColor} size={16} />
                              <span className="text-[10px] font-bold" style={{ color: tplColor }}>{tplName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                        : <ChevronRight size={14} className="text-gray-300 shrink-0" />}
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 dark:border-gray-800">
                        {detailLoading === w.id ? (
                          <div className="flex justify-center py-6">
                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                              style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
                          </div>
                        ) : groups.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">Nessun dato disponibile</p>
                        ) : (
                          <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {groups.map((g, i) => (
                              <div key={i} className="px-4 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: C.training + '20' }}>
                                    <Dumbbell size={11} style={{ color: C.training }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{g.name}</p>
                                    {g.muscleGroup && (
                                      <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                                        style={{ backgroundColor: C.training + '18', color: C.training }}>
                                        {g.muscleGroup}
                                      </span>
                                    )}
                                  </div>
                                  {!g.isDuration && g.sets.some(s => s.weight) && (
                                    <p className="text-xs font-semibold shrink-0" style={{ color: C.training }}>
                                      max {Math.max(...g.sets.map(s => s.weight ?? 0))} kg
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {g.sets.map((s, j) => (
                                    <span key={j} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                      style={s.isWarmup
                                        ? { backgroundColor: C_WARM + '20', color: C_WARM }
                                        : { backgroundColor: C.training + '18', color: C.training }}>
                                      {fmtSet(s, g.isDuration)}{s.tag ? <> <span className="font-bold opacity-80">{s.tag}</span></> : null}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Riga Tennis (se presente, sempre separata) ── */}
                {tennis && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-3">
                      <TennisBadge size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{date}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{tennisLabel}{tennisHoursLabel}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
