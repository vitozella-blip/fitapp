'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Dumbbell, Check, Flame, Calendar, X, Loader2, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const CT       = '#7aafc8'
const C_WARM   = '#f0aa78'
const C_TENNIS = '#a8d8a8'
const TENNIS_NAME      = 'Tennis'
const DEFAULT_PLAN_NAME = '__default__'
const SCHEDA_COLORS = ['#7aafc8', '#9d8fcc', '#f0aa78', '#7dbf7d', '#c4a0d6', '#e8a5a5']
const WARMUP_KEY    = 'workout_warmup_v1'
const COMPLETED_KEY = 'workout_completed_v1'

type Exercise    = { id: string; name: string; muscleGroup: string }
type TemplateEx  = { id: string; exercise: Exercise; sets: number; reps: string | null; restSeconds: number | null; noteScheda: string | null }
type SchedaInfo  = { id: string; name: string; exercises: TemplateEx[] }
type WorkoutSet  = { id: string; setNumber: number; reps: number; weight: number | null; exerciseId: string; exercise: Exercise }
type Workout     = { id: string; sets: WorkoutSet[] }
type Template    = { id: string; name: string; exercises: TemplateEx[] }

function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) }
  catch { return new Set() }
}
function saveSet(key: string, s: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify([...s]))
}
function getSchedaColor(date: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`workout_scheda_${date}`)
    if (!raw) return null
    const info = JSON.parse(raw)
    if (info.color) return info.color
    if (info.order) return SCHEDA_COLORS[(info.order - 1) % SCHEDA_COLORS.length]
    return CT
  } catch { return null }
}

// ── Scheda picker (bottom sheet) ──────────────────────────────────────────────
function SchedaPickerPanel({ userId, date, onPick, onClose }: {
  userId: string; date: string
  onPick: (t: Template, idx: number) => void
  onClose: () => void
}) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const pr = await fetch(`/api/workout-plans?userId=${userId}`)
        const plans: { id: string; name: string }[] = await pr.json()
        const def = plans.find(p => p.name === DEFAULT_PLAN_NAME)
        if (def) {
          const tr = await fetch(`/api/workout-templates?planId=${def.id}`)
          setTemplates(await tr.json())
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-h-[70vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">Scegli scheda</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: CT }} />
            </div>
          )}
          {!loading && templates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Nessuna scheda. Creala nella sezione Piano.</p>
          )}
          {templates.map((t, i) => {
            const color = SCHEDA_COLORS[i % SCHEDA_COLORS.length]
            return (
              <button key={t.id} onClick={() => onPick(t, i)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: color }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
                  <p className="text-[10px] text-gray-400">{t.exercises?.length ?? 0} esercizi</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Mini calendar ─────────────────────────────────────────────────────────────
function WorkoutCalendar({ userId, selectedDate, onSelect, onClose }: {
  userId: string; selectedDate: string
  onSelect: (d: string) => void; onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const initDate = new Date(selectedDate + 'T12:00:00')
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth() + 1)
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/workout-dates?userId=${userId}&year=${viewYear}&month=${viewMonth}`)
      .then(r => r.json()).then((dates: string[]) => setWorkoutDates(new Set(dates))).catch(() => {})
  }, [userId, viewYear, viewMonth])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    const ym = `${viewYear}-${String(viewMonth).padStart(2,'0')}`
    if (ym >= today.slice(0, 7)) return
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const firstDay   = new Date(viewYear, viewMonth - 1, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)
  const isNextDisabled = `${viewYear}-${String(viewMonth).padStart(2,'0')}` >= today.slice(0, 7)

  return (
    <div ref={ref}
      className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400"><ChevronLeft size={15} /></button>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">{monthLabel}</span>
        <button onClick={nextMonth} disabled={isNextDisabled}
          className={cn('w-7 h-7 rounded-lg flex items-center justify-center', isNextDisabled ? 'text-gray-200 dark:text-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400')}>
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['L','M','M','G','V','S','D'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-300 dark:text-gray-600 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = `${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isSelected = iso === selectedDate
          const isToday    = iso === today
          const isFuture   = iso > today
          const dotColor   = workoutDates.has(iso) ? getSchedaColor(iso) : null
          return (
            <button key={i} disabled={isFuture} onClick={() => { onSelect(iso); onClose() }}
              className={cn('flex flex-col items-center py-1 rounded-xl transition-colors', isFuture ? 'opacity-30 cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}
              style={isSelected ? { outline: `2px solid ${CT}`, outlineOffset: '1px' } : {}}>
              <span className={cn('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full', isToday ? 'text-white' : isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300')}
                style={isToday ? { backgroundColor: CT } : {}}>{day}</span>
              <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: dotColor ?? 'transparent' }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrainingDiaryPage() {
  const { userId, selectedDate, setSelectedDate, userProfile } = useAppStore()
  const [workout,   setWorkout]   = useState<Workout | null>(null)
  const [schedaInfo, setSchedaInfo] = useState<SchedaInfo | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [warmups,   setWarmups]   = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [tennisLoading, setTennisLoading] = useState(false)
  const [expandedExId, setExpandedExId]   = useState<string | null>(null)
  const [showCal, setShowCal] = useState(false)

  // Per-exercise add-set form state
  const [addExId,    setAddExId]    = useState<string | null>(null)
  const [formReps,   setFormReps]   = useState('')
  const [formWeight, setFormWeight] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  useEffect(() => {
    setWarmups(loadSet(WARMUP_KEY))
    setCompleted(loadSet(COMPLETED_KEY))
  }, [])

  const fetchWorkout = useCallback(async () => {
    await fetch('/api/user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: userProfile.name }),
    })
    const r = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    setWorkout(await r.json())
  }, [userId, selectedDate, userProfile.name])

  useEffect(() => { fetchWorkout() }, [fetchWorkout])

  // Load scheda from localStorage when date changes
  useEffect(() => {
    setSchedaInfo(null)
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(`workout_scheda_${selectedDate}`)
    if (!raw) return
    try {
      const info = JSON.parse(raw)
      if (info.templateId) {
        fetch(`/api/workout-templates/${info.templateId}`)
          .then(r => r.json())
          .then(t => { if (t?.id) setSchedaInfo(t) })
          .catch(() => {})
      }
    } catch {}
  }, [selectedDate])

  function pickScheda(t: Template, idx: number) {
    const color = SCHEDA_COLORS[idx % SCHEDA_COLORS.length]
    localStorage.setItem(`workout_scheda_${selectedDate}`, JSON.stringify({ templateId: t.id, name: t.name, order: idx + 1, color }))
    setSchedaInfo(t)
    setShowPicker(false)
  }

  async function addSet(exId: string, isWarmup: boolean) {
    if (!formReps.trim()) return
    setFormSaving(true)
    await fetch('/api/workout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: selectedDate, exerciseId: exId, sets: 1, reps: Number(formReps), weight: formWeight ? Number(formWeight) : null }),
    })
    const r  = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    const w: Workout = await r.json()
    if (isWarmup) {
      const prevIds = new Set((workout?.sets ?? []).map(s => s.id))
      const newSet  = (w?.sets ?? []).find(s => !prevIds.has(s.id) && s.exerciseId === exId)
      if (newSet) {
        const nw = new Set(warmups); nw.add(newSet.id)
        setWarmups(nw); saveSet(WARMUP_KEY, nw)
      }
    }
    setWorkout(w)
    setFormReps(''); setFormWeight('')
    setFormSaving(false)
  }

  async function deleteSet(id: string) {
    await fetch(`/api/workout/set/${id}`, { method: 'DELETE' })
    setWorkout(w => w ? { ...w, sets: w.sets.filter(s => s.id !== id) } : null)
    if (warmups.has(id)) {
      const nw = new Set(warmups); nw.delete(id); setWarmups(nw); saveSet(WARMUP_KEY, nw)
    }
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate); d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
    setExpandedExId(null); setAddExId(null)
  }

  function toggleCompleted(exerciseId: string) {
    const key = `${selectedDate}_${exerciseId}`
    const nc  = new Set(completed)
    nc.has(key) ? nc.delete(key) : nc.add(key)
    setCompleted(nc); saveSet(COMPLETED_KEY, nc)
  }

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const allSets   = (workout?.sets ?? []).filter(Boolean)
  const tennisSets   = allSets.filter(s => s.exercise?.name === TENNIS_NAME)
  const tennisActive = tennisSets.length > 0
  const workoutSets  = allSets.filter(s => s.exercise?.name !== TENNIS_NAME)

  // Exercises NOT in the current scheda (logged ad-hoc)
  const schedaExIds = new Set((schedaInfo?.exercises ?? []).map(te => te.exercise.id))
  const extraGrouped = workoutSets
    .filter(s => !schedaExIds.has(s.exerciseId))
    .reduce((acc, s) => {
      if (!s?.exercise) return acc
      if (!acc[s.exerciseId]) acc[s.exerciseId] = { name: s.exercise.name, group: s.exercise.muscleGroup, sets: [] }
      acc[s.exerciseId].sets.push(s)
      return acc
    }, {} as Record<string, { name: string; group: string; sets: WorkoutSet[] }>)

  // Tennis helpers
  async function findOrCreateTennis(): Promise<Exercise> {
    const r = await fetch(`/api/exercises?q=${encodeURIComponent(TENNIS_NAME)}&userId=${userId}`)
    const arr: Exercise[] = await r.json()
    const f = arr.find(e => e.name.toLowerCase() === TENNIS_NAME.toLowerCase())
    if (f) return f
    const cr = await fetch('/api/exercises', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: TENNIS_NAME, muscleGroup: 'Cardio', userId }),
    })
    return await cr.json()
  }

  async function toggleTennis() {
    if (tennisLoading) return
    setTennisLoading(true)
    if (tennisActive) {
      for (const s of tennisSets) await fetch(`/api/workout/set/${s.id}`, { method: 'DELETE' })
    } else {
      const ex = await findOrCreateTennis()
      await fetch('/api/workout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: selectedDate, exerciseId: ex.id, sets: 1, reps: 1, weight: null }),
      })
    }
    await fetchWorkout()
    setTennisLoading(false)
  }

  const schedaColor = getSchedaColor(selectedDate) ?? CT
  const hasAny = schedaInfo || Object.keys(extraGrouped).length > 0 || tennisActive

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Diario Workout" icon={Dumbbell} accent="training"
        action={
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTennis} disabled={tennisLoading}
              className={cn('px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50', tennisActive ? 'text-white' : '')}
              style={tennisActive ? { backgroundColor: C_TENNIS } : { backgroundColor: C_TENNIS + '22', color: '#5a8a5a' }}>
              Tennis
            </button>
            <button onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: schedaColor }}>
              {schedaInfo
                ? <><span className="truncate max-w-[80px]">{schedaInfo.name}</span><ChevronDown size={13} /></>
                : <><Plus size={15} /> Scheda</>
              }
            </button>
          </div>
        }
      />

      {/* Date nav */}
      <div className="relative">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors"><ChevronLeft size={17} /></button>
          <button onClick={() => setShowCal(c => !c)} className="flex-1 flex items-center justify-center gap-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Calendar size={13} style={{ color: CT }} className="shrink-0" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">{dateLabel}</span>
          </button>
          <button onClick={() => changeDate(1)} className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors"><ChevronRight size={17} /></button>
        </div>
        {showCal && <WorkoutCalendar userId={userId} selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setShowCal(false)} />}
      </div>

      {/* Empty state */}
      {!hasAny && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
          <Dumbbell size={28} className="mx-auto mb-3" style={{ color: CT + '80' }} />
          <p className="text-gray-500 font-medium text-sm">Nessun allenamento oggi</p>
          <p className="text-xs text-gray-400 mt-1">Scegli una scheda o aggiungi Tennis per iniziare</p>
        </div>
      )}

      {/* Scheda exercises */}
      {schedaInfo && schedaInfo.exercises.map(te => {
        const exId    = te.exercise.id
        const exSets  = workoutSets.filter(s => s.exerciseId === exId)
        const compKey = `${selectedDate}_${exId}`
        const isDone  = completed.has(compKey)
        const isOpen  = expandedExId === exId
        const addOpen = addExId === exId
        let workIdx = 0, warmIdx = 0

        return (
          <div key={te.id}
            className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
              isDone ? 'border-green-200/60 dark:border-green-900/40' : 'border-gray-100 dark:border-gray-800')}>

            {/* Header row */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button onClick={() => toggleCompleted(exId)}
                className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border',
                  isDone ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400')}
                style={isDone ? { backgroundColor: '#7dbf7d' } : {}}>
                {isDone && <Check size={13} />}
              </button>

              <button className="flex-1 min-w-0 text-left"
                onClick={() => { setExpandedExId(id => id === exId ? null : exId); setAddExId(null) }}>
                <p className={cn('font-semibold text-sm truncate', isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>
                  {te.exercise.name}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {te.sets && `${te.sets} set`}{te.reps && ` · ${te.reps}`}
                  {exSets.length > 0 && <span style={{ color: CT }}> · {exSets.length} eseguiti</span>}
                </p>
              </button>

              <button onClick={() => { setAddExId(id => id === exId ? null : exId); setExpandedExId(exId); setFormReps(''); setFormWeight('') }}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors text-white"
                style={{ backgroundColor: addOpen ? CT : CT + '99' }}>
                <Plus size={15} />
              </button>
            </div>

            {/* Expanded: set list */}
            {isOpen && exSets.length > 0 && (
              <div className="border-t border-gray-50 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                {exSets.map(s => {
                  const isW = warmups.has(s.id)
                  const label = isW ? `R${++warmIdx}` : String(++workIdx)
                  return (
                    <div key={s.id} className="flex items-center gap-2 px-4 py-2">
                      <span className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={isW ? { backgroundColor: C_WARM + '20', color: C_WARM } : { backgroundColor: CT + '18', color: CT }}>
                        {label}
                      </span>
                      {isW && <Flame size={10} style={{ color: C_WARM }} className="shrink-0" />}
                      <p className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                        {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ''}
                      </p>
                      <button onClick={() => deleteSet(s.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add set form */}
            {addOpen && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Reps</label>
                    <input type="number" min="0" value={formReps} onChange={e => setFormReps(e.target.value)}
                      placeholder="10" autoFocus
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-blue-300" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Peso (kg)</label>
                    <input type="number" step="0.5" value={formWeight} onChange={e => setFormWeight(e.target.value)}
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-blue-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => addSet(exId, true)} disabled={formSaving || !formReps.trim()}
                    className="py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ backgroundColor: C_WARM + '20', color: C_WARM }}>
                    <Flame size={12} /> Risc.
                  </button>
                  <button onClick={() => addSet(exId, false)} disabled={formSaving || !formReps.trim()}
                    className="py-2 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ backgroundColor: CT }}>
                    {formSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Set
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Extra exercises (not in scheda) */}
      {Object.entries(extraGrouped).map(([exId, { name, group, sets }]) => {
        const compKey = `${selectedDate}_${exId}`
        const isDone  = completed.has(compKey)
        const isOpen  = expandedExId === exId
        const addOpen = addExId === exId
        let workIdx = 0, warmIdx = 0
        return (
          <div key={exId}
            className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
              isDone ? 'border-green-200/60 dark:border-green-900/40' : 'border-gray-100 dark:border-gray-800')}>
            <div className="flex items-center gap-2 px-4 py-3">
              <button onClick={() => toggleCompleted(exId)}
                className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border',
                  isDone ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700')}
                style={isDone ? { backgroundColor: '#7dbf7d' } : {}}>
                {isDone && <Check size={13} />}
              </button>
              <button className="flex-1 min-w-0 text-left"
                onClick={() => setExpandedExId(id => id === exId ? null : exId)}>
                <p className={cn('font-semibold text-sm truncate', isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>{name}</p>
                {group && <p className="text-[10px] text-gray-400 mt-0.5">{group}</p>}
              </button>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0" style={{ color: CT, backgroundColor: CT + '18' }}>
                {sets.length} set
              </span>
            </div>
            {isOpen && (
              <div className="border-t border-gray-50 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                {sets.map(s => {
                  const isW = warmups.has(s.id)
                  const label = isW ? `R${++warmIdx}` : String(++workIdx)
                  return (
                    <div key={s.id} className="flex items-center gap-2 px-4 py-2">
                      <span className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={isW ? { backgroundColor: C_WARM + '20', color: C_WARM } : { backgroundColor: CT + '18', color: CT }}>
                        {label}
                      </span>
                      {isW && <Flame size={10} style={{ color: C_WARM }} className="shrink-0" />}
                      <p className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                        {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ''}
                      </p>
                      <button onClick={() => deleteSet(s.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Scheda picker */}
      {showPicker && (
        <SchedaPickerPanel userId={userId} date={selectedDate} onPick={pickScheda} onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}
