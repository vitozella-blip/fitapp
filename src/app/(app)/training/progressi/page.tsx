'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, TrendingUp, Dumbbell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

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

type Step = 'template' | 'exercise' | 'detail'

export default function ProgressiPage() {
  const userId = useAppStore(s => s.userId)
  const router = useRouter()

  const [step, setStep]               = useState<Step>('template')
  const [templates, setTemplates]     = useState<WorkoutTemplate[]>([])
  const [selTemplate, setSelTemplate] = useState<WorkoutTemplate | null>(null)
  const [exercises, setExercises]     = useState<ExerciseSummary[]>([])
  const [selEx, setSelEx]             = useState<ExerciseSummary | null>(null)
  const [q, setQ]                     = useState('')
  const [routineWeeks, setRoutineWeeks] = useState<WorkoutWeek[]>([])
  const [selWeekIds, setSelWeekIds]   = useState<Set<string>>(new Set())
  const [sessions, setSessions]       = useState<SessionData[]>([])
  const [loading, setLoading]         = useState(false)

  // Load templates on mount
  useEffect(() => {
    if (!userId) return
    fetch(`/api/training/progress?userId=${userId}&templates=1`)
      .then(r => r.json())
      .then(data => setTemplates(Array.isArray(data) ? data : []))
  }, [userId])

  // Load exercises + routine weeks when template selected
  useEffect(() => {
    if (!selTemplate) return
    setLoading(true)
    setSelWeekIds(new Set())
    Promise.all([
      fetch(`/api/training/progress?userId=${userId}&templateId=${selTemplate.id}`).then(r => r.json()),
      fetch(`/api/workout-weeks?templateId=${selTemplate.id}`).then(r => r.json()),
    ]).then(([exData, wkData]) => {
      setExercises(Array.isArray(exData) ? exData : [])
      setRoutineWeeks(Array.isArray(wkData) ? wkData : [])
    }).finally(() => setLoading(false))
  }, [selTemplate, userId])

  // Load sessions when exercise or week-filter changes
  const loadSessions = useCallback(async (ex: ExerciseSummary, weekIds: Set<string>) => {
    setLoading(true)
    const p = new URLSearchParams({ userId, exerciseId: ex.id })
    if (weekIds.size > 0) p.set('weekIds', [...weekIds].join(','))
    const data = await fetch(`/api/training/progress?${p}`).then(r => r.json()).catch(() => [])
    setSessions(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (selEx) loadSessions(selEx, selWeekIds)
  }, [selEx, selWeekIds, loadSessions])

  function goBack() {
    if (step === 'detail')   { setSelEx(null); setSelWeekIds(new Set()); setStep('exercise') }
    else if (step === 'exercise') { setSelTemplate(null); setExercises([]); setRoutineWeeks([]); setStep('template') }
    else router.push('/training')
  }

  const title = step === 'template' ? 'Progressi'
    : step === 'exercise' ? selTemplate!.name
    : selEx!.name

  const filtered = exercises.filter(e =>
    !q || e.name.toLowerCase().includes(q.toLowerCase())
  )

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

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={goBack}
          className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp size={20} style={{ color: C.training }} className="shrink-0" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
        </div>
      </div>

      {/* ── STEP 0: TEMPLATE PICKER ── */}
      {step === 'template' && (
        templates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Nessun piano di allenamento trovato</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {templates.map((t, i) => (
              <button key={t.id}
                onClick={() => { setSelTemplate(t); setStep('exercise') }}
                className={cn('w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors', i > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                  style={{ backgroundColor: C.training + '22', color: C.training }}>
                  {t.order}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 truncate">{t.planName}</p>
                </div>
                <ChevronLeft size={14} className="text-gray-300 rotate-180 shrink-0" />
              </button>
            ))}
          </div>
        )
      )}

      {/* ── STEP 1: EXERCISE LIST ── */}
      {step === 'exercise' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Cerca esercizio..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Nessun esercizio in questa scheda</p>
              <p className="text-xs text-gray-400">Aggiungi esercizi dal <span className="font-semibold">Piano Allenamento</span></p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Nessun esercizio trovato</p>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              {filtered.map((ex, i) => (
                <button key={ex.id}
                  onClick={() => { setSelEx(ex); setStep('detail') }}
                  className={cn('w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors', i > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: C.training + '22' }}>
                    <Dumbbell size={14} style={{ color: C.training }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.name}</p>
                    {ex.muscleGroup && <p className="text-xs text-gray-400 truncate">{ex.muscleGroup}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {ex.sessions > 0 ? (
                      <>
                        <p className="text-xs font-bold" style={{ color: C.training }}>{ex.sessions} sess.</p>
                        {ex.isDuration
                          ? ex.maxDuration && <p className="text-xs text-gray-400">{fmtMin(ex.maxDuration)}</p>
                          : ex.maxWeight && <p className="text-xs text-gray-400">max {ex.maxWeight} kg</p>}
                      </>
                    ) : (
                      <p className="text-xs text-gray-300">nessuna</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: CHARTS ── */}
      {step === 'detail' && (
        <>
          {/* Routine filter pills (multi-select) */}
          <div className="flex gap-1.5 flex-wrap">
            {/* "Tutto" pill — deselects all */}
            <button
              onClick={() => setSelWeekIds(new Set())}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                selWeekIds.size === 0
                  ? 'text-white border-transparent'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900'
              )}
              style={selWeekIds.size === 0 ? { backgroundColor: C.training } : {}}>
              Tutto
            </button>
            {routineWeeks.map(w => {
              const active = selWeekIds.has(w.id)
              return (
                <button key={w.id}
                  onClick={() => setSelWeekIds(prev => {
                    const next = new Set(prev)
                    active ? next.delete(w.id) : next.add(w.id)
                    return next
                  })}
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

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.training, borderTopColor: 'transparent' }} />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Nessuna sessione nel periodo selezionato</p>
          ) : (
            <>
              {/* PR + sessions */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Record personale</p>
                  <p className="text-2xl font-bold" style={{ color: C.training }}>
                    {isDuration ? fmtMin(pr) : `${pr} kg`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Sessioni</p>
                  <p className="text-2xl font-bold" style={{ color: C.accent }}>{sessions.length}</p>
                </div>
              </div>

              {/* Session history */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Storico sessioni</p>
                </div>
                {[...sessions].reverse().map((s, i) => (
                  <div key={s.date} className={cn('px-4 py-3', i > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {new Date(s.date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {isDuration
                        ? <p className="text-xs font-semibold" style={{ color: C.training }}>{fmtMin(s.totalDuration)}</p>
                        : <p className="text-xs font-semibold" style={{ color: C.training }}>max {s.maxWeight ?? '—'} kg</p>
                      }
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.sets.map((set, j) => (
                        <span key={j} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: C.training + '18', color: C.training }}>
                          {isDuration ? fmtMin(set.duration) : `${set.reps ?? '?'} × ${set.weight ?? '?'} kg`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Line chart */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.training }}>
                  {isDuration ? 'Durata per sessione (min)' : 'Peso massimo per sessione (kg)'}
                </p>
                <ResponsiveContainer width="100%" height={160}>
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

              {/* Volume bar chart (weight exercises only) */}
              {!isDuration && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.bar }}>
                    Volume per sessione (kg × reps)
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
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
        </>
      )}
    </div>
  )
}
