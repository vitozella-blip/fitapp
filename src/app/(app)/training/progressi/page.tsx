'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, TrendingUp, ChevronDown, ChevronRight, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const C = { training: '#7aafc8', accent: '#9d8fcc', bar: '#f0aa78' }

type ExerciseSummary = {
  id: string; ids: string[]; name: string
  sessions: number; maxWeight?: number; maxDuration?: number
  isDuration: boolean; planNames?: string[]
}

type SessionData = {
  date: string; maxWeight?: number; volume?: number
  totalDuration?: number; setCount: number
  sets: { setNumber: number; reps?: number; weight?: number; duration?: number }[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}
/** "Programma 19" → "19", "Piano A" → "A", fallback → nome intero */
function planLabel(name: string) {
  const m = name.match(/(\d+)\s*$/) ?? name.match(/(\S+)\s*$/)
  return m ? m[1] : name
}

function fmtMin(sec?: number | null) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60), s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, isDuration }: any) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-gray-600 dark:text-gray-300 mb-1">{fmtDate(label)}</p>
      <p className="font-semibold" style={{ color: payload[0].color }}>
        {isDuration ? fmtMin(v * 60) : `${v} kg`}
      </p>
    </div>
  )
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-gray-600 dark:text-gray-300 mb-1">{fmtDate(label)}</p>
      <p className="font-semibold" style={{ color: C.bar }}>{payload[0].value} kg·reps</p>
    </div>
  )
}

export default function ProgressiPage() {
  const userId = useAppStore(s => s.userId)

  const [allExercises, setAllExercises] = useState<ExerciseSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [q, setQ]                       = useState('')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [sessions, setSessions]         = useState<SessionData[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/training/progress?userId=${userId}&templates=exercises`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllExercises(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const filtered = useMemo(() => {
    if (!q.trim()) return allExercises
    const lower = q.toLowerCase()
    return allExercises.filter(e =>
      e.name.toLowerCase().includes(lower) ||
      (e.planNames?.some(p => p.toLowerCase().includes(lower)) ?? false)
    )
  }, [allExercises, q])

  const loadSessions = useCallback(async (ids: string[]) => {
    setLoadingSessions(true)
    setSessions([])
    const data = await fetch(`/api/training/progress?userId=${userId}&exerciseId=${ids.join(',')}`)
      .then(r => r.json()).catch(() => [])
    setSessions(Array.isArray(data) ? data : [])
    setLoadingSessions(false)
  }, [userId])

  async function toggleExercise(ex: ExerciseSummary) {
    if (expandedId === ex.id) { setExpandedId(null); return }
    setExpandedId(ex.id)
    await loadSessions(ex.ids ?? [ex.id])
  }

  const selEx = expandedId ? allExercises.find(e => e.id === expandedId) ?? null : null
  const isDuration = selEx?.isDuration ?? false
  const chartData = sessions.map(s => ({
    date: s.date,
    main: isDuration ? Math.round((s.totalDuration ?? 0) / 60) : Number(s.maxWeight ?? 0),
    vol:  Math.round(s.volume ?? 0),
  }))
  const pr = isDuration
    ? Math.max(0, ...sessions.map(s => s.totalDuration ?? 0))
    : Math.max(0, ...sessions.map(s => Number(s.maxWeight ?? 0)))

  return (
    <div className="max-w-2xl mx-auto md:max-w-none space-y-3">
      <PageHeader title="Progressi" icon={TrendingUp} accent="training" />

      {/* Search bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-3 py-2.5">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-2 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cerca esercizio o programma..."
            className="w-full pl-7 pr-7 py-1.5 bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400"
          />
          {q && (
            <button onClick={() => { setQ(''); inputRef.current?.focus() }}
              className="absolute right-2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Counter */}
      {!loading && (
        <p className="text-xs text-gray-400 px-1">
          {filtered.length} esercizi{q ? ` su ${allExercises.length}` : ''}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          {allExercises.length === 0 ? 'Nessun esercizio loggato ancora' : 'Nessun esercizio trovato'}
        </p>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map(ex => {
            const isOpen = expandedId === ex.id
            return (
              <div key={ex.id}>
                {/* Row */}
                <button
                  onClick={() => toggleExercise(ex)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.name}</p>
                    {ex.planNames && ex.planNames.length > 0 && (
                      <p className="text-[11px] truncate" style={{ color: C.training + 'bb' }}>
                        {ex.planNames.map(p => `PR ${planLabel(p)}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: C.training }}>
                        {ex.sessions} sess.
                      </p>
                      {ex.isDuration
                        ? ex.maxDuration && <p className="text-[11px] text-gray-400">{fmtMin(ex.maxDuration)}</p>
                        : ex.maxWeight   && <p className="text-[11px] text-gray-400">max {ex.maxWeight} kg</p>
                      }
                    </div>
                    {isOpen
                      ? <ChevronDown size={13} className="text-gray-400" />
                      : <ChevronRight size={13} className="text-gray-300" />
                    }
                  </div>
                </button>

                {/* Detail panel */}
                {isOpen && (
                  <div className={cn(
                    'px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800',
                    'bg-gray-50/60 dark:bg-gray-800/30'
                  )}>
                    {loadingSessions ? (
                      <div className="flex justify-center py-6">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
                      </div>
                    ) : sessions.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Nessuna sessione trovata</p>
                    ) : (
                      <>
                        {/* PR + sessioni */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between mt-3">
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Record personale</p>
                            <p className="text-xl font-bold" style={{ color: C.training }}>
                              {isDuration ? fmtMin(pr) : `${pr} kg`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400 mb-0.5">Sessioni</p>
                            <p className="text-xl font-bold" style={{ color: C.accent }}>{sessions.length}</p>
                          </div>
                        </div>

                        {/* Line chart */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
                          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.training }}>
                            {isDuration ? 'Durata per sessione (min)' : 'Peso massimo per sessione (kg)'}
                          </p>
                          <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                              <Tooltip content={<CustomTooltip isDuration={isDuration} />} />
                              <Line type="monotone" dataKey="main" stroke={C.training} strokeWidth={2.5}
                                dot={{ r: 3, fill: C.training }} activeDot={{ r: 5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Volume bar chart */}
                        {!isDuration && (
                          <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
                            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.bar }}>
                              Volume per sessione (kg × reps)
                            </p>
                            <ResponsiveContainer width="100%" height={120}>
                              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<VolumeTooltip />} />
                                <Bar dataKey="vol" fill={C.bar} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </>
                    )}
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
