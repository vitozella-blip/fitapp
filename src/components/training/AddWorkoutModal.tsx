'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Loader2, ChevronLeft, ChevronRight, Trash2, Check, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

const CT = '#7aafc8'
const SCHEDA_COLORS = [
  '#7aafc8', '#9d8fcc', '#f0aa78', '#7dbf7d', '#c4a0d6', '#e8a5a5',
]
const C_WARM = '#f0aa78'
const DEFAULT_PLAN_NAME = '__default__'

type Exercise = { id: string; name: string; muscleGroup: string }
type TemplateExercise = { id: string; exercise: Exercise }
type Template = { id: string; name: string; exercises: TemplateExercise[] }

type WorkoutSet = {
  id: string; setNumber: number; reps: number; weight: number | null
  exerciseId: string; exercise: Exercise
}

type Step = 'scheda' | 'exercise' | 'track'

const ABS_SEDUTE = ['Seduta A', 'Seduta B', 'Seduta C']
const ABS_PREFIX = 'Addominali — '

const WARMUP_KEY = 'workout_warmup_v1'
function loadWarmups(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(WARMUP_KEY) ?? '[]')) }
  catch { return new Set() }
}
function persistWarmups(s: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(WARMUP_KEY, JSON.stringify([...s]))
}

export function AddWorkoutModal({
  userId, date, onClose, onChanged,
}: {
  userId: string; date: string
  onClose: () => void
  onChanged: () => void
}) {
  const [step, setStep]                 = useState<Step>('scheda')
  const [templates, setTemplates]       = useState<Template[]>([])
  const [loadingT, setLoadingT]         = useState(true)
  const [scheda, setScheda]             = useState<Template | null>(null)
  const [exercise, setExercise]         = useState<Exercise | null>(null)

  // Load schede from default plan
  useEffect(() => {
    (async () => {
      setLoadingT(true)
      try {
        const pr = await fetch(`/api/workout-plans?userId=${userId}`)
        const plans: { id: string; name: string }[] = await pr.json()
        const def = plans.find(p => p.name === DEFAULT_PLAN_NAME)
        if (def) {
          const tr = await fetch(`/api/workout-templates?planId=${def.id}`)
          setTemplates(await tr.json())
        }
      } catch (e) { console.error(e) }
      setLoadingT(false)
    })()
  }, [userId])

  async function findOrCreateExercise(name: string, muscleGroup: string): Promise<Exercise> {
    const r = await fetch(`/api/exercises?q=${encodeURIComponent(name)}&userId=${userId}`)
    const arr: Exercise[] = await r.json()
    const found = arr.find(e => e.name.toLowerCase() === name.toLowerCase())
    if (found) return found
    const cr = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, muscleGroup, userId }),
    })
    return await cr.json()
  }

  async function pickAbs(seduta: string) {
    const ex = await findOrCreateExercise(ABS_PREFIX + seduta, 'Addominali')
    setExercise(ex)
    setStep('track')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[92vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          {step !== 'scheda' && (
            <button onClick={() => {
              if (step === 'exercise') setStep('scheda')
              else if (step === 'track') { setExercise(null); setStep('exercise') }
            }}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 flex items-center justify-center">
              <ChevronLeft size={15} />
            </button>
          )}
          <p className="font-bold text-gray-900 dark:text-gray-100 flex-1 truncate">
            {step === 'scheda'   && 'Seleziona scheda'}
            {step === 'exercise' && (scheda?.name ?? 'Esercizi')}
            {step === 'track'    && (exercise?.name ?? 'Tracking')}
          </p>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {step === 'scheda' && (
            <SchedeList
              templates={templates} loading={loadingT}
              onPick={(t) => {
                if (typeof window !== 'undefined') {
                  const order = templates.indexOf(t) + 1
                  const color = SCHEDA_COLORS[(order - 1) % SCHEDA_COLORS.length]
                  localStorage.setItem(`workout_scheda_${date}`, JSON.stringify({ templateId: t.id, name: t.name, order, color }))
                }
                setScheda(t); setStep('exercise')
              }}
              onPickAbs={() => { setScheda(null); setStep('exercise') }}
            />
          )}

          {step === 'exercise' && (
            <ExerciseList
              scheda={scheda}
              onPick={(ex) => { setExercise(ex); setStep('track') }}
              onPickAbs={pickAbs}
            />
          )}

          {step === 'track' && exercise && (
            <TrackSets
              userId={userId} date={date} exercise={exercise}
              onChanged={onChanged}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 1: schede list ──────────────────────────────────────────────────────
function SchedeList({ templates, loading, onPick, onPickAbs }: {
  templates: Template[]; loading: boolean
  onPick: (t: Template) => void
  onPickAbs: () => void
}) {
  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin" style={{ color: CT }} />
    </div>
  }

  return (
    <div className="space-y-2">
      {templates.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">
          Nessuna scheda. Creala nella sezione Piano.
        </p>
      )}
      {templates.map((t, i) => {
        const sc = SCHEDA_COLORS[i % SCHEDA_COLORS.length]
        return (
        <button key={t.id} onClick={() => onPick(t)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: sc + 'cc' }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
            <p className="text-[10px] text-gray-400">{t.exercises?.length ?? 0} esercizi</p>
          </div>
        </button>
        )
      })}

      {/* Abs shortcut */}
      <button onClick={onPickAbs}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl border border-dashed transition-colors text-left"
        style={{ borderColor: CT + '60', color: CT }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: CT + '99' }}>
          AB
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Solo addominali</p>
          <p className="text-[10px] opacity-70">Seduta A / B / C indipendente</p>
        </div>
      </button>
    </div>
  )
}

// ── Step 2: exercise list ────────────────────────────────────────────────────
function ExerciseList({ scheda, onPick, onPickAbs }: {
  scheda: Template | null
  onPick: (ex: Exercise) => void
  onPickAbs: (seduta: string) => void
}) {
  return (
    <div className="space-y-3">
      {scheda && (
        <>
          {(scheda.exercises ?? []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">
              Nessun esercizio nella scheda
            </p>
          )}
          <div className="space-y-1.5">
            {(scheda.exercises ?? []).map(te => (
              <button key={te.id} onClick={() => onPick(te.exercise)}
                className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{te.exercise.name}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Abs section — always available */}
      <div className="pt-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Addominali (indipendente)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ABS_SEDUTE.map(seduta => (
            <button key={seduta} onClick={() => onPickAbs(seduta)}
              className="px-2 py-2.5 rounded-xl border text-sm font-bold transition-colors"
              style={{ borderColor: CT + '40', color: CT, backgroundColor: CT + '10' }}>
              {seduta}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: set tracker ──────────────────────────────────────────────────────
function TrackSets({ userId, date, exercise, onChanged }: {
  userId: string; date: string; exercise: Exercise
  onChanged: () => void
}) {
  const [sets, setSets]         = useState<WorkoutSet[]>([])
  const [reps, setReps]         = useState('')
  const [weight, setWeight]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [warmups, setWarmups]   = useState<Set<string>>(loadWarmups())

  const fetchSets = useCallback(async () => {
    const r = await fetch(`/api/workout?userId=${userId}&date=${date}`)
    const w = await r.json()
    const allSets: WorkoutSet[] = (w?.sets ?? []).filter(Boolean)
    setSets(allSets.filter(s => s.exerciseId === exercise.id))
  }, [userId, date, exercise.id])

  useEffect(() => { fetchSets() }, [fetchSets])

  async function addSet(isWarmup: boolean) {
    if (!reps.trim()) return
    setSaving(true)
    await fetch('/api/workout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, date, exerciseId: exercise.id,
        sets: 1, reps: Number(reps), weight: weight ? Number(weight) : null,
      }),
    })
    // Refetch to get the new set ID
    const r = await fetch(`/api/workout?userId=${userId}&date=${date}`)
    const w = await r.json()
    const allSets: WorkoutSet[] = (w?.sets ?? []).filter(Boolean)
    const exSets = allSets.filter(s => s.exerciseId === exercise.id)
    setSets(exSets)
    // The newly added set is the one whose ID isn't in our previous state
    const prevIds = new Set(sets.map(s => s.id))
    const newSet = exSets.find(s => !prevIds.has(s.id))
    if (newSet && isWarmup) {
      const nw = new Set(warmups); nw.add(newSet.id)
      setWarmups(nw); persistWarmups(nw)
    }
    setReps(''); setWeight('')
    setSaving(false)
    onChanged()
  }

  async function delSet(id: string) {
    await fetch(`/api/workout/set/${id}`, { method: 'DELETE' })
    setSets(s => s.filter(x => x.id !== id))
    if (warmups.has(id)) {
      const nw = new Set(warmups); nw.delete(id)
      setWarmups(nw); persistWarmups(nw)
    }
    onChanged()
  }

  let workIdx = 0
  let warmIdx = 0
  const rows = sets.map(s => {
    const isW = warmups.has(s.id)
    const label = isW ? `R${++warmIdx}` : String(++workIdx)
    return { ...s, isWarmup: isW, label }
  })

  return (
    <div className="space-y-3">
      {/* Sets eseguiti */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 px-1">
          Set eseguiti ({sets.length})
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nessun set ancora</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            {rows.map(s => (
              <div key={s.id}
                className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={s.isWarmup
                    ? { backgroundColor: C_WARM + '20', color: C_WARM }
                    : { backgroundColor: CT + '18', color: CT }}>
                  {s.label}
                </span>
                {s.isWarmup && (
                  <Flame size={11} style={{ color: C_WARM }} className="shrink-0" />
                )}
                <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {s.reps} reps{s.weight ? ` × ${s.weight} kg` : ''}
                </p>
                <button onClick={() => delSet(s.id)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add set form */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 px-1">
          Aggiungi set
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Reps</label>
            <input type="number" min="0" value={reps} onChange={e => setReps(e.target.value)}
              placeholder="10"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Peso (kg)</label>
            <input type="number" step="0.5" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="—"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => addSet(true)} disabled={saving || !reps.trim()}
            className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: C_WARM + '20', color: C_WARM }}>
            <Flame size={13} /> Riscaldamento
          </button>
          <button onClick={() => addSet(false)} disabled={saving || !reps.trim()}
            className="py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: CT }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Set
          </button>
        </div>
      </div>
    </div>
  )
}
