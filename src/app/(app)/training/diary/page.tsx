'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Dumbbell, Check, Flame, X, Loader2, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateNav } from '@/components/shared/DateNav'
import { cn } from '@/lib/utils'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'

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
  useRefreshOnFocus(fetchWorkout)

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

  function handleDateChange(d: string) {
    setSelectedDate(d)
    setExpandedExId(null); setAddExId(null)
  }

  function toggleCompleted(exerciseId: string) {
    const key = `${selectedDate}_${exerciseId}`
    const nc  = new Set(completed)
    nc.has(key) ? nc.delete(key) : nc.add(key)
    setCompleted(nc); saveSet(COMPLETED_KEY, nc)
  }

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

      <DateNav selectedDate={selectedDate} onChange={handleDateChange} accent={CT} />

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
