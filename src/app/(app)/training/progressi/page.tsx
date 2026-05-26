'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, TrendingUp, Dumbbell, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { WorkoutBadge, SCHEDA_COLORS } from '@/components/training/WorkoutBadge'

const C = { training: '#7aafc8', accent: '#9d8fcc', bar: '#f0aa78' }

type WorkoutTemplate = { id: string; name: string; order: number; planName: string; planId: string }
type WorkoutWeek     = { id: string; name: string; order: number }

type ExerciseSummary = {
  id: string; name: string; muscleGroup?: string
  sessions: number; maxWeight?: number; maxDuration?: number; isDuration: boolean
}

type SessionData = {
  date: string; maxWeight?: number; volume?: number
  totalDuration?: number; setCount: number
  sets: { setNumber: number; reps?: number; weight?: number; duration?: number }[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function fmtMin(sec?: number | null) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
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

  const [templates, setTemplates]         = useState<WorkoutTemplate[]>([])
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [exercises, setExercises]         = useState<Record<string, ExerciseSummary[]>>({})
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null)
  const [q, setQ]                         = useState('')
  const [routineWeeks, setRoutineWeeks]   = useState<Record<string, WorkoutWeek[]>>({})
  const [selWeekIds, setSelWeekIds]       = useState<Set<string>>(new Set())
  const [sessions, setSessions]           = useState<SessionData[]>([])
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)
  const [loadingExerciseId, setLoadingExerciseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setError(null)
    fetch(`/api/training/progress?userId=${userId}&templates=1`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setError('Errore nel caricamento dei progressi. Riprova.'))
  }, [userId])

  async function toggleTemplate(t: WorkoutTemplate) {
    if (expandedTemplateId === t.id) {
      setExpandedTemplateId(null)
      setExpandedExerciseId(null)
      return
    }
    setExpandedTemplateId(t.id)
    setExpandedExerciseId(null)
    setSelWeekIds(new Set())
    if (exercises[t.id]) return
    setLoadingTemplateId(t.id)
    try {
      const [exRes, wkRes] = await Promise.all([
        fetch(`/api/training/progress?userId=${userId}&templateId=${t.id}`),
        fetch(`/api/workout-weeks?templateId=${t.id}`),
      ])
      const exData = exRes.ok ? await exRes.json() : []
      const wkData = wkRes.ok ? await wkRes.json() : []
      setExercises(prev => ({ ...prev, [t.id]: Array.isArray(exData) ? exData : [] }))
      setRoutineWeeks(prev => ({ ...prev, [t.id]: Array.isArray(wkData) ? wkData : [] }))
    } catch {
      setExercises(prev => ({ ...prev, [t.id]: [] }))
      setRoutineWeeks(prev => ({ ...prev, [t.id]: [] }))
    } finally {
      setLoadingTemplateId(null)
    }
  }

  const loadSessions = useCallback(async (ex: ExerciseSummary, weekIds: Set<string>) => {
    setLoadingExerciseId(ex.id)
    const p = new URLSearchParams({ userId, exerciseId: ex.id })
    if (weekIds.size > 0) p.set('weekIds', [...weekIds].join(','))
    const data = await fetch(`/api/training/progress?${p}`).then(r => r.json()).catch(() => [])
    setSessions(Array.isArray(data) ? data : [])
    setLoadingExerciseId(null)
  }, [userId])

  async function toggleExercise(ex: ExerciseSummary) {
    if (expandedExerciseId === ex.id) {
      setExpandedExerciseId(null)
      return
    }
    setExpandedExerciseId(ex.id)
    setSelWeekIds(new Set())
    await loadSessions(ex, new Set())
  }

  const currentExercises = expandedTemplateId ? (exercises[expandedTemplateId] ?? []) : []
  const currentWeeks     = expandedTemplateId ? (routineWeeks[expandedTemplateId] ?? []) : []
  const filtered = currentExercises.filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()))

  const selEx = expandedExerciseId
    ? currentExercises.find(e => e.id === expandedExerciseId) ?? null
    : null
  const isDuration = selEx?.isDuration ?? false
  const chartData = sessions.map(s => ({
    date: s.date,
    main: isDuration ? Math.round((s.totalDuration ?? 0) / 60) : Number(s.maxWeight ?? 0),
    vol: Math.round(s.volume ?? 0),
  }))
  const pr = isDuration
    ? Math.max(0, ...sessions.map(s => s.totalDuration ?? 0))
    : Math.max(0, ...sessions.map(s => Number(s.maxWeight ?? 0)))

  return (
    <div className="max-w-2xl mx-auto md:max-w-none space-y-3">

      <PageHeader title="Progressi" icon={TrendingUp} accent="training" />

      {error ? (
        <div className="text-center py-10 space-y-3">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => {
              setError(null)
              fetch(`/api/training/progress?userId=${userId}&templates=1`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setTemplates(Array.isArray(data) ? data : []))
                .catch(() => setError('Errore nel caricamento dei progressi. Riprova.'))
            }}
            className="text-xs px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Riprova
          </button>
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Nessun piano di allenamento trovato</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => {
            const isOpen = expandedTemplateId === t.id
            const shapeIdx = t.order
            const color = SCHEDA_COLORS[shapeIdx % SCHEDA_COLORS.length]
            return (
              <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">

                {/* Template row */}
                <button
                  onClick={() => toggleTemplate(t)}
                  className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <WorkoutBadge color={color} shapeIdx={shapeIdx} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
                    <p className="text-xs text-gray-400 truncate">{t.planName}</p>
                  </div>
                  {isOpen
                    ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  }
                </button>

                {/* Expanded exercise list */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">

                    {/* Search */}
                    <div className="px-4 py-2.5">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={q} onChange={e => setQ(e.target.value)}
                          placeholder="Cerca esercizio..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                      </div>
                    </div>

                    {loadingTemplateId === t.id ? (
                      <div className="flex justify-center py-6">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
                      </div>
                    ) : filtered.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6 px-4">
                        {currentExercises.length === 0 ? 'Nessun esercizio in questa scheda' : 'Nessun esercizio trovato'}
                      </p>
                    ) : (
                      filtered.map((ex, j) => {
                        const exOpen = expandedExerciseId === ex.id
                        return (
                          <div key={ex.id} className={cn(j > 0 && 'border-t border-gray-100 dark:border-gray-800')}>

                            {/* Exercise row */}
                            <button
                              onClick={() => toggleExercise(ex)}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: C.training + '22' }}>
                                <Dumbbell size={12} style={{ color: C.training }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.name}</p>
                                {ex.muscleGroup && <p className="text-xs text-gray-400 truncate">{ex.muscleGroup}</p>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {ex.sessions > 0 ? (
                                  <div className="text-right">
                                    <p className="text-xs font-bold" style={{ color: C.training }}>{ex.sessions} sess.</p>
                                    {ex.isDuration
                                      ? ex.maxDuration && <p className="text-xs text-gray-400">{fmtMin(ex.maxDuration)}</p>
                                      : ex.maxWeight && <p className="text-xs text-gray-400">max {ex.maxWeight} kg</p>}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-300">nessuna</p>
                                )}
                                {exOpen
                                  ? <ChevronDown size={13} className="text-gray-400" />
                                  : <ChevronRight size={13} className="text-gray-300" />
                                }
                              </div>
                            </button>

                            {/* Exercise detail */}
                            {exOpen && (
                              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">

                                {/* Routine filter pills */}
                                {currentWeeks.length > 0 && (
                                  <div className="flex gap-1.5 flex-wrap pt-3">
                                    <button
                                      onClick={() => { setSelWeekIds(new Set()); loadSessions(ex, new Set()) }}
                                      className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                                        selWeekIds.size === 0
                                          ? 'text-white border-transparent'
                                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900'
                                      )}
                                      style={selWeekIds.size === 0 ? { backgroundColor: C.training } : {}}>
                                      Tutto
                                    </button>
                                    {currentWeeks.map(w => {
                                      const active = selWeekIds.has(w.id)
                                      return (
                                        <button key={w.id}
                                          onClick={() => {
                                            const next = new Set(selWeekIds)
                                            active ? next.delete(w.id) : next.add(w.id)
                                            setSelWeekIds(next)
                                            loadSessions(ex, next)
                                          }}
                                          className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                                            active
                                              ? 'text-white border-transparent'
                                              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900'
                                          )}
                                          style={active ? { backgroundColor: C.accent } : {}}>
                                          {w.name}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}

                                {loadingExerciseId === ex.id ? (
                                  <div className="flex justify-center py-6">
                                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
                                  </div>
                                ) : sessions.length === 0 ? (
                                  <p className="text-xs text-gray-400 text-center py-4">Nessuna sessione nel periodo selezionato</p>
                                ) : (
                                  <>
                                    {/* PR + sessions */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
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
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
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
                                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
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
                      })
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
