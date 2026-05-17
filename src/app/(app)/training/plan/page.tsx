'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Pencil, Copy, ChevronUp, ChevronDown, ChevronRight,
  Check, X, Loader2, Search, MoreVertical,
  ChevronDown as Chevron,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const CT = '#7aafc8'
const SCHEDA_COLORS = ['#7aafc8', '#9d8fcc', '#f0aa78', '#7dbf7d', '#c4a0d6', '#e8a5a5']

// ── Shared types ──────────────────────────────────────────────────────────────
type WeekExercise = { id: string; name: string; sets: number; reps: string; restSeconds: number }
type WeekItem = { name: string; exercises?: WeekExercise[] }
type TemplateExercise = {
  id: string; order: number; sets: number; reps: string
  restSeconds: number; noteScheda?: string; notePersonali?: string
  exercise: { id: string; name: string; muscleGroup: string }
}
type Template = { id: string; planId: string; name: string; order: number; exercises: TemplateExercise[] }
type Exercise = { id: string; name: string; muscleGroup: string }
type Plan = {
  id: string; name: string; order: number
  startDate?: string | null; endDate?: string | null
  weeks?: unknown; isActive?: boolean
}
type Week = { id: string; templateId: string; name: string; order: number }
type WeekParam = {
  weekId: string; templateExId: string
  sets: number; reps: string | null
  restSeconds: number | null; notes: string | null
}

// ── Wizard types ──────────────────────────────────────────────────────────────
type WizExercise = {
  localId: string
  name: string
  sets: number
  reps: string
  restSeconds: number
  noteScheda: string
  notePersonali: string
}
type WizRoutine = {
  localId: string
  id?: string
  name: string
  exercises: WizExercise[]
}
type WizScheda = { id: string; name: string; routineCount: number }

const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none'

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

function parseWeeks(w: unknown): WeekItem[] {
  const normalize = (item: unknown): WeekItem => {
    if (typeof item === 'string') return { name: item }
    if (item && typeof item === 'object' && 'name' in item) return item as WeekItem
    return { name: String(item) }
  }
  if (Array.isArray(w)) return w.map(normalize)
  if (typeof w === 'string' && w.trim()) {
    try { const a = JSON.parse(w); if (Array.isArray(a)) return a.map(normalize) } catch {}
  }
  return []
}

// ── Wizard: step indicator ────────────────────────────────────────────────────
function WizardStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = ['Info', 'Scheda', 'Routine', 'Fine']
  return (
    <div className="flex items-start gap-0 mb-5">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4
        const done = step > n
        const active = step === n
        return (
          <div key={n} className="flex items-start flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                done || active ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              )} style={done || active ? { backgroundColor: CT } : {}}>
                {done ? <Check size={12} /> : n}
              </div>
              <p className={cn('text-[9px] font-semibold mt-1 tracking-wide', active ? '' : 'text-gray-400')}
                style={active ? { color: CT } : {}}>
                {label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-full mt-3.5 transition-colors"
                style={{ backgroundColor: step > n ? CT + '80' : '#e5e7eb' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Wizard: routine editor ────────────────────────────────────────────────────
function RoutineEditor({
  initialRoutine, color, onSave, onCancel,
}: {
  initialRoutine: WizRoutine | null
  color: string
  onSave: (r: WizRoutine) => Promise<void>
  onCancel: () => void
}) {
  const [rName, setRName] = useState(initialRoutine?.name ?? '')
  const [exercises, setExercises] = useState<WizExercise[]>(
    initialRoutine?.exercises.map(e => ({ ...e, localId: e.localId || crypto.randomUUID() })) ?? []
  )
  const [expandedEx, setExpandedEx] = useState<string | null>(
    initialRoutine?.exercises.length === 0 ? null : null
  )
  const [saving, setSaving] = useState(false)

  function addExercise() {
    const localId = crypto.randomUUID()
    setExercises(prev => [...prev, { localId, name: '', sets: 3, reps: '', restSeconds: 90, noteScheda: '', notePersonali: '' }])
    setExpandedEx(localId)
  }

  function updateEx(localId: string, patch: Partial<WizExercise>) {
    setExercises(prev => prev.map(e => e.localId === localId ? { ...e, ...patch } : e))
  }

  function removeEx(localId: string) {
    setExercises(prev => prev.filter(e => e.localId !== localId))
    if (expandedEx === localId) setExpandedEx(null)
  }

  async function handleSave() {
    if (!rName.trim()) return
    setSaving(true)
    await onSave({
      localId: initialRoutine?.localId ?? crypto.randomUUID(),
      id: initialRoutine?.id,
      name: rName.trim(),
      exercises: exercises.filter(e => e.name.trim()),
    })
    setSaving(false)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-2 rounded-2xl overflow-hidden" style={{ borderColor: color + '50' }}>
      <div className="px-4 pt-4 pb-3 space-y-3">
        <input
          autoFocus
          value={rName}
          onChange={e => setRName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && rName.trim() && handleSave()}
          placeholder="Nome routine, es. Volume Week 1..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-base font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400"
        />

        {/* Exercise list */}
        {exercises.length > 0 && (
          <div className="space-y-1.5">
            {exercises.map((ex, i) => (
              <div key={ex.localId} className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[10px] text-gray-400 font-bold w-4 shrink-0">{i + 1}</span>
                  <input
                    value={ex.name}
                    onChange={e => updateEx(ex.localId, { name: e.target.value })}
                    placeholder="Nome esercizio..."
                    className="flex-1 bg-transparent text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400 min-w-0"
                  />
                  <button onClick={() => setExpandedEx(expandedEx === ex.localId ? null : ex.localId)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">
                    <Chevron size={12} className={cn('transition-transform', expandedEx !== ex.localId && '-rotate-90')} />
                  </button>
                  <button onClick={() => removeEx(ex.localId)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <X size={11} />
                  </button>
                </div>

                {expandedEx === ex.localId && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Set', val: ex.sets, key: 'sets', type: 'number', ph: '3' },
                        { label: 'Reps', val: ex.reps, key: 'reps', type: 'text', ph: '10RM' },
                        { label: 'Rec (s)', val: ex.restSeconds, key: 'restSeconds', type: 'number', ph: '90' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block mb-1">{f.label}</label>
                          <input
                            type={f.type} value={f.val}
                            onChange={e => updateEx(ex.localId, { [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                            placeholder={f.ph}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400"
                          />
                        </div>
                      ))}
                    </div>
                    <input
                      value={ex.noteScheda}
                      onChange={e => updateEx(ex.localId, { noteScheda: e.target.value })}
                      placeholder="Note esercizio..."
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-gray-400"
                    />
                    <input
                      value={ex.notePersonali}
                      onChange={e => updateEx(ex.localId, { notePersonali: e.target.value })}
                      placeholder="Note operative..."
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-gray-400"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={addExercise}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed text-xs font-medium transition-colors"
          style={{ borderColor: color + '70', color }}>
          <Plus size={12} /> Aggiungi esercizio
        </button>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">
          Annulla
        </button>
        <button onClick={handleSave} disabled={!rName.trim() || saving}
          className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: color }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salva Routine
        </button>
      </div>
    </div>
  )
}

// ── Wizard: routine card ──────────────────────────────────────────────────────
function RoutineCard({ routine, color, onEdit, onDuplicate, onDelete }: {
  routine: WizRoutine; color: string
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{routine.name}</p>
          {routine.exercises.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {routine.exercises.length} {routine.exercises.length === 1 ? 'esercizio' : 'esercizi'}
            </p>
          )}
        </button>
        <button onClick={() => setOpen(o => !o)} className="w-6 h-6 flex items-center justify-center text-gray-400 shrink-0">
          <Chevron size={12} className={cn('transition-transform', !open && '-rotate-90')} />
        </button>
        <div ref={ref} className="relative shrink-0">
          <button onClick={() => setMenuOpen(o => !o)}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors">
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
              <button onClick={() => { setMenuOpen(false); onEdit() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                <Pencil size={11} className="text-gray-400" /> Modifica
              </button>
              <button onClick={() => { setMenuOpen(false); onDuplicate() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                <Copy size={11} className="text-gray-400" /> Duplica
              </button>
              <button onClick={() => { setMenuOpen(false); onDelete() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 text-left">
                <Trash2 size={11} /> Elimina
              </button>
            </div>
          )}
        </div>
      </div>
      {open && routine.exercises.length > 0 && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-3 py-2 space-y-1">
          {routine.exercises.map((ex, i) => (
            <div key={ex.localId} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-300 w-4 shrink-0">{i + 1}.</span>
              <p className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{ex.name}</p>
              {ex.sets > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: color + '18', color }}>
                  {ex.sets}×{ex.reps || '?'}
                </span>
              )}
              {ex.restSeconds > 0 && (
                <span className="text-[10px] text-gray-400 shrink-0">{ex.restSeconds}s</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Plan creation wizard ──────────────────────────────────────────────────────
function PlanWizard({ userId, onComplete, onClose }: {
  userId: string
  onComplete: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [fromStep4, setFromStep4] = useState(false)

  // Step 1
  const [planId, setPlanId]     = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  const [planStart, setPlanStart] = useState('')
  const [planEnd, setPlanEnd]   = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  // Step 2
  const [schedaName, setSchedaName] = useState('')
  const [savingScheda, setSavingScheda] = useState(false)

  // Step 3
  const [schedaId, setSchedaId]   = useState<string | null>(null)
  const [routines, setRoutines]   = useState<WizRoutine[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editRoutine, setEditRoutine] = useState<WizRoutine | null>(null)

  // Accumulated schede (for step 4)
  const [schede, setSchede] = useState<WizScheda[]>([])

  const color = SCHEDA_COLORS[schede.length % SCHEDA_COLORS.length]

  // ── Step 1 → 2 ──
  async function goStep2() {
    if (!planName.trim()) return
    setSavingPlan(true)
    try {
      if (!planId) {
        const r = await fetch('/api/workout-plans', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name: planName, startDate: planStart || null, endDate: planEnd || null, weeks: [] }),
        })
        const p = await r.json()
        setPlanId(p.id)
      } else {
        await fetch(`/api/workout-plans/${planId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: planName, startDate: planStart || null, endDate: planEnd || null }),
        })
      }
    } catch (e) { console.error(e) }
    setSavingPlan(false)
    setStep(2)
  }

  // ── Step 2 → 3 ──
  async function goStep3() {
    if (!schedaName.trim() || !planId) return
    setSavingScheda(true)
    try {
      const r = await fetch('/api/workout-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId, name: schedaName }),
      })
      const s = await r.json()
      setSchedaId(s.id)
      setRoutines([])
    } catch (e) { console.error(e) }
    setSavingScheda(false)
    setStep(3)
  }

  // ── Step 3 → 4 ──
  function goStep4() {
    setSchede(prev => [...prev, { id: schedaId!, name: schedaName, routineCount: routines.length }])
    setStep(4)
  }

  // ── Step 4 → add scheda ──
  function addAnotherScheda() {
    setSchedaName('')
    setSchedaId(null)
    setRoutines([])
    setFromStep4(true)
    setStep(2)
  }

  // ── Routine CRUD ──
  async function saveRoutine(routine: WizRoutine) {
    if (!schedaId) return
    try {
      if (routine.id) {
        await fetch(`/api/workout-routines/${routine.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: routine.name, templateId: schedaId, userId, exercises: routine.exercises }),
        })
        setRoutines(prev => prev.map(r => r.localId === routine.localId ? routine : r))
      } else {
        const r = await fetch('/api/workout-routines', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: schedaId, userId, name: routine.name, exercises: routine.exercises }),
        })
        const saved = await r.json()
        setRoutines(prev => [...prev, { ...routine, id: saved.id }])
      }
    } catch (e) { console.error(e) }
    setShowEditor(false)
    setEditRoutine(null)
  }

  async function deleteRoutine(routine: WizRoutine) {
    if (routine.id) {
      await fetch(`/api/workout-routines/${routine.id}`, { method: 'DELETE' })
    }
    setRoutines(prev => prev.filter(r => r.localId !== routine.localId))
  }

  async function duplicateRoutine(routine: WizRoutine) {
    if (routine.id && schedaId) {
      try {
        const r = await fetch(`/api/workout-routines/${routine.id}/duplicate`, { method: 'POST' })
        const dup = await r.json()
        // Reload routines from DB to get the duplicated one with exercises
        const all = await fetch(`/api/workout-routines?templateId=${schedaId}`).then(r => r.json())
        const dupData = all.find((x: { id: string }) => x.id === dup.id)
        if (dupData) {
          setRoutines(prev => [...prev, {
            localId: crypto.randomUUID(),
            id: dup.id,
            name: dup.name,
            exercises: (dupData.exercises ?? []).map((e: Record<string, unknown>) => ({
              localId: crypto.randomUUID(),
              name: e.exerciseName as string,
              sets: e.sets as number,
              reps: e.reps as string,
              restSeconds: e.restSeconds as number,
              noteScheda: e.noteScheda as string,
              notePersonali: e.notePersonali as string,
            }))
          }])
        }
      } catch (e) { console.error(e) }
    } else {
      setRoutines(prev => [...prev, { ...routine, localId: crypto.randomUUID(), id: undefined, name: `${routine.name} (copia)` }])
    }
  }

  const canGoStep2 = planName.trim().length > 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: CT }}>Nuovo Piano</p>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── STEP 1: Info Piano ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <input
              autoFocus
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canGoStep2 && goStep2()}
              placeholder="Nome piano..."
              className={inp}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1 font-medium">Inizio</label>
                <input type="date" value={planStart} onChange={e => setPlanStart(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1 font-medium">Fine</label>
                <input type="date" value={planEnd} onChange={e => setPlanEnd(e.target.value)} className={inp} />
              </div>
            </div>
            <button onClick={goStep2} disabled={!canGoStep2 || savingPlan}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: CT }}>
              {savingPlan ? <Loader2 size={15} className="animate-spin" /> : null}
              Continua
            </button>
          </div>
        )}

        {/* ── STEP 2: Scheda ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            {schede.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Schede aggiunte</p>
                {schede.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: SCHEDA_COLORS[i % SCHEDA_COLORS.length] }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <p className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{s.name}</p>
                    <span className="text-[10px] text-gray-400">{s.routineCount} routine</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                {schede.length === 0 ? 'Crea prima scheda' : 'Nuova scheda'}
              </p>
              <input
                autoFocus
                value={schedaName}
                onChange={e => setSchedaName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && schedaName.trim() && goStep3()}
                placeholder='es. Workout 1 – Chest + Back'
                className={inp}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(fromStep4 ? 4 : 1)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">
                Indietro
              </button>
              <button onClick={goStep3} disabled={!schedaName.trim() || savingScheda}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ backgroundColor: CT }}>
                {savingScheda ? <Loader2 size={14} className="animate-spin" /> : null}
                Continua
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Routine ───────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Routine</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color }}>{schedaName}</p>
              </div>
              {routines.length > 0 && !showEditor && (
                <button onClick={() => { setEditRoutine(null); setShowEditor(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
                  style={{ backgroundColor: color }}>
                  <Plus size={12} /> Routine
                </button>
              )}
            </div>

            {/* Routine cards */}
            {routines.length > 0 && !showEditor && (
              <div className="space-y-2">
                {routines.map(r => (
                  <RoutineCard
                    key={r.localId}
                    routine={r}
                    color={color}
                    onEdit={() => { setEditRoutine(r); setShowEditor(true) }}
                    onDuplicate={() => duplicateRoutine(r)}
                    onDelete={() => deleteRoutine(r)}
                  />
                ))}
              </div>
            )}

            {/* Editor or Add button */}
            {showEditor ? (
              <RoutineEditor
                initialRoutine={editRoutine}
                color={color}
                onSave={saveRoutine}
                onCancel={() => { setShowEditor(false); setEditRoutine(null) }}
              />
            ) : routines.length === 0 ? (
              <button onClick={() => { setEditRoutine(null); setShowEditor(true) }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed text-sm font-medium transition-colors"
                style={{ borderColor: color + '60', color }}>
                <Plus size={15} /> Aggiungi prima routine
              </button>
            ) : null}

            {!showEditor && (
              <button onClick={goStep4}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: CT }}>
                Continua
              </button>
            )}
          </div>
        )}

        {/* ── STEP 4: Completa o aggiungi ──────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: CT + '10' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: CT }}>{planName}</p>
              {(planStart || planEnd) && (
                <p className="text-xs text-gray-400">
                  {planStart ? fmtDate(planStart) : '–'} → {planEnd ? fmtDate(planEnd) : '–'}
                </p>
              )}
              <div className="space-y-1 mt-1">
                {schede.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SCHEDA_COLORS[i % SCHEDA_COLORS.length] }} />
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{s.name}</p>
                    <span className="text-[10px] text-gray-400">{s.routineCount} routine</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={addAnotherScheda}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
              style={{ borderColor: CT + '60', color: CT }}>
              <Plus size={14} /> Aggiungi Scheda
            </button>

            <button onClick={() => { onComplete() }}
              className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: CT }}>
              <Check size={15} /> Completa Piano
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Add exercise modal (for existing plan editing) ────────────────────────────
function ExerciseFormModal({
  templateId, userId, onClose, onSaved,
}: {
  templateId: string; userId: string
  onClose: () => void; onSaved: () => void
}) {
  const [q, setQ]               = useState('')
  const [results, setResults]   = useState<Exercise[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const r = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&userId=${userId}`)
      setResults(await r.json())
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, userId])

  async function addToDb() {
    if (!q.trim()) return
    setCreating(true)
    const r = await fetch('/api/exercises', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: q.trim(), muscleGroup: '', userId }),
    })
    setSelected(await r.json()); setResults([]); setCreating(false)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await fetch('/api/template-exercises', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, exerciseId: selected.id, sets: 3, reps: '', restSeconds: 90 }),
    })
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">Aggiungi esercizio</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!selected ? (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca o scrivi nome esercizio..." className={inp + ' pl-9'} />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              </div>
              {results.length > 0 && (
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  {results.map(ex => (
                    <button key={ex.id} onClick={() => setSelected(ex)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ex.name}</p>
                    </button>
                  ))}
                  {q.length >= 2 && !searching && (
                    <button onClick={addToDb} disabled={creating}
                      className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: CT + '20', color: CT }}>
                        {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: CT }}>Aggiungi &ldquo;{q}&rdquo; al database</p>
                    </button>
                  )}
                </div>
              )}
              {q.length >= 2 && !searching && results.length === 0 && (
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <p className="text-xs text-gray-400 text-center py-3">Nessun risultato</p>
                  <button onClick={addToDb} disabled={creating}
                    className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: CT + '20', color: CT }}>
                      {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: CT }}>Aggiungi &ldquo;{q}&rdquo; al database</p>
                  </button>
                </div>
              )}
              {q.length < 2 && <p className="text-sm text-gray-400 text-center py-2">Scrivi almeno 2 caratteri per cercare</p>}
            </>
          ) : (
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: CT + '15' }}>
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{selected.name}</p>
              <button onClick={() => { setSelected(null); setQ('') }} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
            </div>
          )}
        </div>
        {selected && (
          <div className="px-4 pb-6 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: CT }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Aggiungi esercizio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Base exercise row ─────────────────────────────────────────────────────────
function BaseExRow({ ex, isFirst, isLast, onDelete, onReorder }: {
  ex: TemplateExercise; isFirst: boolean; isLast: boolean
  onDelete: () => void; onReorder: (dir: 'up' | 'down') => void
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 group">
      <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onReorder('up')} disabled={isFirst} className={cn('w-4 h-4 flex items-center justify-center', isFirst ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400')}><ChevronUp size={10} /></button>
        <button onClick={() => onReorder('down')} disabled={isLast} className={cn('w-4 h-4 flex items-center justify-center', isLast ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400')}><ChevronDown size={10} /></button>
      </div>
      <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.exercise.name}</p>
      {ex.exercise.muscleGroup && <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block">{ex.exercise.muscleGroup}</span>}
      <button onClick={onDelete} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors shrink-0"><Trash2 size={12} /></button>
    </div>
  )
}

// ── Per-week exercise row ─────────────────────────────────────────────────────
function WeekExRow({ ex, weekId, param, color }: {
  ex: TemplateExercise; weekId: string; param: WeekParam | undefined; color: string
}) {
  const [sets, setSets]   = useState(String(param?.sets ?? 3))
  const [reps, setReps]   = useState(param?.reps ?? '')
  const [rest, setRest]   = useState(String(param?.restSeconds ?? 90))
  const [notes, setNotes] = useState(param?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/week-exercise-params', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId, templateExId: ex.id, sets: Number(sets)||3, reps: reps||null, restSeconds: Number(rest)||null, notes: notes||null }),
    })
    setSaving(false)
  }

  return (
    <div className="px-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.exercise.name}</p>
        {saving && <Loader2 size={11} className="animate-spin text-gray-300 shrink-0" />}
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <div><label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Set</label><input type="number" value={sets} onChange={e => setSets(e.target.value)} onBlur={save} min="1" className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none text-center focus:border-gray-400" /></div>
        <div><label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Reps</label><input value={reps} onChange={e => setReps(e.target.value)} onBlur={save} placeholder="—" className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none text-center focus:border-gray-400" /></div>
        <div><label className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Rec (s)</label><input type="number" value={rest} onChange={e => setRest(e.target.value)} onBlur={save} min="0" className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none text-center focus:border-gray-400" /></div>
      </div>
      <input value={notes} onChange={e => setNotes(e.target.value)} onBlur={save} placeholder="Note per questa week..." className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-gray-400" />
    </div>
  )
}

// ── Week tab ⋮ menu ───────────────────────────────────────────────────────────
function WeekMenuBtn({ onRename, onDuplicate, onDelete }: {
  onRename: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} className="w-4 h-4 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"><MoreVertical size={11} /></button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <button onClick={() => { setOpen(false); onRename() }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"><Pencil size={11} className="text-gray-400" /> Rinomina</button>
          <button onClick={() => { setOpen(false); onDuplicate() }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"><Copy size={11} className="text-gray-400" /> Duplica</button>
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 text-left"><Trash2 size={11} /> Elimina</button>
        </div>
      )}
    </div>
  )
}

// ── Scheda card with week tabs ────────────────────────────────────────────────
function WorkoutCard({ tmpl, idx, userId, onRefresh }: {
  tmpl: Template; idx: number; userId: string; onRefresh: () => void
}) {
  const [editing, setEditing]           = useState(false)
  const [name, setName]                 = useState(tmpl.name)
  const [addEx, setAddEx]               = useState(false)
  const [collapsed, setCollapsed]       = useState(true)
  const [baseCollapsed, setBaseCollapsed] = useState(true)

  const [weeks, setWeeks]               = useState<Week[]>([])
  const [activeWeekId, setActiveWeekId] = useState<string | null>(null)
  const [weekParams, setWeekParams]     = useState<Map<string, WeekParam>>(new Map())
  const [loadingWeeks, setLoadingWeeks] = useState(false)
  const [addingWeek, setAddingWeek]     = useState(false)
  const [newWeekName, setNewWeekName]   = useState('')
  const [renamingWeekId, setRenamingWeekId] = useState<string | null>(null)
  const [renameVal, setRenameVal]       = useState('')

  const loadWeeks = useCallback(async () => {
    setLoadingWeeks(true)
    const r = await fetch(`/api/workout-weeks?templateId=${tmpl.id}`)
    const ws: Week[] = await r.json()
    setWeeks(ws)
    if (ws.length > 0) setActiveWeekId(id => id ?? ws[0].id)
    setLoadingWeeks(false)
  }, [tmpl.id])

  useEffect(() => { if (!collapsed) loadWeeks() }, [collapsed, loadWeeks])

  useEffect(() => {
    if (!activeWeekId) { setWeekParams(new Map()); return }
    fetch(`/api/week-exercise-params?weekId=${activeWeekId}`)
      .then(r => r.json())
      .then((ps: WeekParam[]) => {
        const m = new Map<string, WeekParam>()
        ps.forEach(p => m.set(p.templateExId, p))
        setWeekParams(m)
      })
  }, [activeWeekId])

  async function saveName() {
    await fetch(`/api/workout-templates/${tmpl.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setEditing(false); onRefresh()
  }
  async function del() {
    if (!confirm('Eliminare questa scheda?')) return
    await fetch(`/api/workout-templates/${tmpl.id}`, { method: 'DELETE' }); onRefresh()
  }
  async function dup() {
    await fetch(`/api/workout-templates/${tmpl.id}/duplicate`, { method: 'POST' }); onRefresh()
  }
  async function deleteExercise(exId: string) {
    if (!confirm('Rimuovere esercizio?')) return
    await fetch(`/api/template-exercises/${exId}`, { method: 'DELETE' }); onRefresh()
  }
  async function reorderExercise(exId: string, dir: 'up' | 'down') {
    await fetch(`/api/template-exercises/${exId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', direction: dir }) })
    onRefresh()
  }
  async function addWeek() {
    const n = newWeekName.trim(); if (!n) return
    const r = await fetch('/api/workout-weeks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: tmpl.id, name: n }) })
    const w: Week = await r.json()
    setWeeks(prev => [...prev, w]); setActiveWeekId(w.id)
    setNewWeekName(''); setAddingWeek(false)
  }
  async function duplicateWeek(weekId: string) {
    const r = await fetch(`/api/workout-weeks/${weekId}/duplicate`, { method: 'POST' })
    const w: Week = await r.json()
    setWeeks(prev => [...prev, w]); setActiveWeekId(w.id)
  }
  async function renameWeek(weekId: string) {
    const n = renameVal.trim(); if (!n) return
    await fetch(`/api/workout-weeks/${weekId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) })
    setWeeks(prev => prev.map(w => w.id === weekId ? { ...w, name: n } : w))
    setRenamingWeekId(null)
  }
  async function deleteWeek(weekId: string) {
    if (!confirm('Eliminare questa week?')) return
    await fetch(`/api/workout-weeks/${weekId}`, { method: 'DELETE' })
    const remaining = weeks.filter(w => w.id !== weekId)
    setWeeks(remaining)
    if (activeWeekId === weekId) setActiveWeekId(remaining[0]?.id ?? null)
  }

  const exCount = tmpl.exercises?.length ?? 0
  const color = SCHEDA_COLORS[idx % SCHEDA_COLORS.length]
  const exercises = tmpl.exercises ?? []

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ backgroundColor: color + 'cc' }}>
          {String(idx + 1).padStart(2, '0')}
        </div>
        {editing ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 px-2.5 py-1.5 rounded-xl border text-sm font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 outline-none"
            style={{ borderColor: color }} />
        ) : (
          <button onClick={() => setCollapsed(o => !o)} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{tmpl.name}</p>
            <p className="text-[10px] text-gray-400">
              {exCount} {exCount === 1 ? 'esercizio' : 'esercizi'}
              {weeks.length > 0 && ` · ${weeks.length} ${weeks.length === 1 ? 'routine' : 'routine'}`}
            </p>
          </button>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {editing ? (
            <>
              <button onClick={saveName} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color }}><Check size={12} /></button>
              <button onClick={() => setEditing(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={12} /></button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditing(true); setName(tmpl.name) }} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center"><Pencil size={11} /></button>
              <button onClick={dup} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center"><Copy size={11} /></button>
              <button onClick={del} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-400 flex items-center justify-center"><Trash2 size={11} /></button>
              <button onClick={() => setCollapsed(o => !o)} className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center">
                <Chevron size={13} className={cn('transition-transform', collapsed && '-rotate-90')} />
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="border-t border-gray-50 dark:border-gray-800">
            <button onClick={() => setBaseCollapsed(o => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-left" style={{ backgroundColor: color + '0c' }}>
              <Chevron size={12} className={cn('text-gray-400 transition-transform shrink-0', baseCollapsed && '-rotate-90')} />
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-1">
                Esercizi di base <span className="font-normal opacity-60">({exCount})</span>
              </p>
            </button>
            {!baseCollapsed && (
              <>
                <div>
                  {exercises.map((ex, ei) => (
                    <BaseExRow key={ex.id} ex={ex} isFirst={ei === 0} isLast={ei === exercises.length - 1}
                      onDelete={() => deleteExercise(ex.id)} onReorder={dir => reorderExercise(ex.id, dir)} />
                  ))}
                </div>
                <div className="px-3 pb-2 pt-1">
                  <button onClick={() => setAddEx(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed text-xs font-medium transition-colors" style={{ borderColor: color + '60', color }}>
                    <Plus size={13} /> Aggiungi esercizio
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-gray-50 dark:border-gray-800">
            {loadingWeeks ? (
              <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color }} /></div>
            ) : (
              <>
                <div className="flex items-center border-b border-gray-100 dark:border-gray-800 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {weeks.map(w => (
                    renamingWeekId === w.id ? (
                      <div key={w.id} className="flex items-center gap-1 px-2 py-1.5 shrink-0">
                        <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameWeek(w.id); if (e.key === 'Escape') setRenamingWeekId(null) }}
                          className="w-24 px-2 py-1 rounded-lg border text-xs outline-none font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          style={{ borderColor: color }} />
                        <button onClick={() => renameWeek(w.id)} className="w-5 h-5 rounded flex items-center justify-center text-white" style={{ backgroundColor: color }}><Check size={10} /></button>
                        <button onClick={() => setRenamingWeekId(null)} className="w-5 h-5 rounded flex items-center justify-center text-gray-400"><X size={10} /></button>
                      </div>
                    ) : (
                      <button key={w.id} onClick={() => setActiveWeekId(w.id)}
                        className={cn('flex items-center gap-1 px-3 py-2 text-xs font-semibold shrink-0 border-b-2 transition-colors', activeWeekId === w.id ? '' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}
                        style={activeWeekId === w.id ? { color, borderColor: color } : {}}>
                        {w.name}
                        <WeekMenuBtn
                          onRename={() => { setRenamingWeekId(w.id); setRenameVal(w.name) }}
                          onDuplicate={() => duplicateWeek(w.id)}
                          onDelete={() => deleteWeek(w.id)} />
                      </button>
                    )
                  ))}
                  {addingWeek ? (
                    <div className="flex items-center gap-1 px-2 py-1.5 shrink-0">
                      <input autoFocus value={newWeekName} onChange={e => setNewWeekName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addWeek(); if (e.key === 'Escape') { setAddingWeek(false); setNewWeekName('') } }}
                        placeholder="Nome routine..." className="w-28 px-2 py-1 rounded-lg border text-xs outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" style={{ borderColor: color }} />
                      <button onClick={addWeek} disabled={!newWeekName.trim()} className="w-5 h-5 rounded flex items-center justify-center text-white disabled:opacity-40" style={{ backgroundColor: color }}><Check size={10} /></button>
                      <button onClick={() => { setAddingWeek(false); setNewWeekName('') }} className="w-5 h-5 rounded flex items-center justify-center text-gray-400"><X size={10} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingWeek(true)} className="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 text-xs shrink-0 transition-colors ml-auto">
                      <Plus size={12} />
                    </button>
                  )}
                </div>
                {activeWeekId && exercises.length > 0 ? (
                  <div>{exercises.map(ex => <WeekExRow key={activeWeekId + '-' + ex.id} ex={ex} weekId={activeWeekId} param={weekParams.get(ex.id)} color={color} />)}</div>
                ) : activeWeekId ? (
                  <p className="text-xs text-gray-400 text-center py-4 px-3">Nessun esercizio. Apri &ldquo;Esercizi di base&rdquo; per aggiungerne.</p>
                ) : weeks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 px-3">Nessuna routine. Clicca + per aggiungerne una.</p>
                ) : null}
              </>
            )}
          </div>
        </>
      )}

      {addEx && <ExerciseFormModal templateId={tmpl.id} userId={userId} onClose={() => setAddEx(false)} onSaved={() => { setAddEx(false); onRefresh() }} />}
    </div>
  )
}

// ── Plan ⋮ menu ───────────────────────────────────────────────────────────────
function PlanMenu({ isActive, onCorrente, onEdit, onDuplicate, onDelete }: {
  isActive: boolean; onCorrente: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const item = 'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors'
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors"><MoreVertical size={16} /></button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <button onClick={() => { setOpen(false); onCorrente() }} className={cn(item, 'hover:bg-gray-50 dark:hover:bg-gray-800', isActive ? 'font-semibold' : 'text-gray-700 dark:text-gray-300')} style={isActive ? { color: CT } : {}}><Check size={15} className={isActive ? 'opacity-100' : 'opacity-0'} /> Corrente</button>
          <button onClick={() => { setOpen(false); onEdit() }} className={cn(item, 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300')}><Pencil size={15} className="text-gray-400" /> Modifica</button>
          <button onClick={() => { setOpen(false); onDuplicate() }} className={cn(item, 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300')}><Copy size={15} className="text-gray-400" /> Duplica</button>
          <button onClick={() => { setOpen(false); onDelete() }} className={cn(item, 'hover:bg-red-50 dark:hover:bg-red-950/50 text-red-500')}><Trash2 size={15} /> Elimina</button>
        </div>
      )}
    </div>
  )
}

// ── Plan card (existing plans view) ──────────────────────────────────────────
function PlanCard({ plan, userId, onChanged }: {
  plan: Plan; userId: string; onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingT, setLoadingT] = useState(false)
  const [showNewScheda, setShowNewScheda] = useState(false)
  const [schedaName, setSchedaName] = useState('')
  const [savingS, setSavingS] = useState(false)

  const [eName, setEName]   = useState(plan.name)
  const [eStart, setEStart] = useState((plan as { startDate?: string | null }).startDate ?? '')
  const [eEnd, setEEnd]     = useState((plan as { endDate?: string | null }).endDate ?? '')
  const [savingP, setSavingP] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoadingT(true)
    const r = await fetch(`/api/workout-templates?planId=${plan.id}`)
    setTemplates(await r.json()); setLoadingT(false)
  }, [plan.id])

  useEffect(() => { if (expanded) loadTemplates() }, [expanded, loadTemplates])

  async function savePlanEdit() {
    setSavingP(true)
    await fetch(`/api/workout-plans/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: eName, startDate: eStart, endDate: eEnd }) })
    setSavingP(false); setEditing(false); onChanged()
  }
  async function createScheda() {
    if (!schedaName.trim()) return
    setSavingS(true)
    await fetch('/api/workout-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan.id, userId, name: schedaName }) })
    setSchedaName(''); setShowNewScheda(false); setSavingS(false); loadTemplates()
  }
  async function setCorrente() {
    await fetch(`/api/workout-plans/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !(plan as { isActive?: boolean }).isActive }) })
    onChanged()
  }
  async function duplicate() { await fetch(`/api/workout-plans/${plan.id}/duplicate`, { method: 'POST' }); onChanged() }
  async function del() {
    if (!confirm('Eliminare questo piano e tutte le sue schede?')) return
    await fetch(`/api/workout-plans/${plan.id}`, { method: 'DELETE' }); onChanged()
  }

  const sL = fmtDate((plan as { startDate?: string | null }).startDate)
  const eL = fmtDate((plan as { endDate?: string | null }).endDate)
  const isActive = !!(plan as { isActive?: boolean }).isActive

  return (
    <div className={cn('bg-white dark:bg-gray-900 border rounded-2xl transition-colors', isActive ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-800')}>
      <div className="flex items-start gap-3 px-4 py-3">
        <button onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{plan.name}</p>
          </div>
          {(sL || eL) && <p className="mt-1 text-xs text-gray-400">{sL ?? '–'} – {eL ?? '–'}</p>}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <PlanMenu isActive={isActive} onCorrente={setCorrente}
            onEdit={() => { setEditing(true); setExpanded(true); setEName(plan.name); setEStart((plan as { startDate?: string | null }).startDate ?? ''); setEEnd((plan as { endDate?: string | null }).endDate ?? '') }}
            onDuplicate={duplicate} onDelete={del} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {editing ? (
            <div className="p-4 space-y-3">
              <input value={eName} onChange={e => setEName(e.target.value)} placeholder="Nome piano" className={inp} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-400 block mb-1">Inizio</label><input type="date" value={eStart} onChange={e => setEStart(e.target.value)} className={inp} /></div>
                <div><label className="text-xs text-gray-400 block mb-1">Fine</label><input type="date" value={eEnd} onChange={e => setEEnd(e.target.value)} className={inp} /></div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">Annulla</button>
                <button onClick={savePlanEdit} disabled={savingP || !eName.trim()} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: CT }}>
                  {savingP ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salva
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Schede</p>
                <button onClick={() => setShowNewScheda(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: CT }}>
                  <Plus size={12} /> Scheda
                </button>
              </div>
              {showNewScheda && (
                <div className="flex gap-2">
                  <input autoFocus value={schedaName} onChange={e => setSchedaName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createScheda()}
                    placeholder='Nome scheda — es. "Push A"'
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none" />
                  <button onClick={createScheda} disabled={savingS || !schedaName.trim()} className="w-9 h-9 rounded-xl text-white flex items-center justify-center disabled:opacity-50" style={{ backgroundColor: CT }}>
                    {savingS ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setShowNewScheda(false)} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={14} /></button>
                </div>
              )}
              {loadingT ? (
                <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: CT }} /></div>
              ) : templates.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-5">Nessuna scheda. Clicca &ldquo;Scheda&rdquo; per aggiungerne una.</p>
              ) : (
                templates.map((t, i) => <WorkoutCard key={t.id} tmpl={t} idx={i} userId={userId} onRefresh={loadTemplates} />)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrainingPlanPage() {
  const { userId, userProfile } = useAppStore()
  const [plans, setPlans]   = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name: userProfile.name }) })
      const r = await fetch(`/api/workout-plans?userId=${userId}`)
      const all: Plan[] = await r.json()
      setPlans(all.filter(p => p.name !== '__default__'))
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [userId, userProfile.name])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-6">
      <PageHeader title="Piano Allenamento" accent="training"
        action={
          !showWizard ? (
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: CT }}>
              <Plus size={15} /> Nuovo Piano
            </button>
          ) : undefined
        }
      />

      {showWizard && (
        <PlanWizard
          userId={userId}
          onComplete={() => { setShowWizard(false); load() }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CT, borderTopColor: 'transparent' }} />
        </div>
      ) : plans.length === 0 && !showWizard ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-gray-500">Nessun piano</p>
          <p className="text-xs text-gray-400 mt-1">Clicca &ldquo;Nuovo Piano&rdquo; per iniziare</p>
        </div>
      ) : (
        plans.map(p => <PlanCard key={p.id} plan={p} userId={userId} onChanged={load} />)
      )}
    </div>
  )
}
