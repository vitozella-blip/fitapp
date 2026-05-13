'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Copy, ChevronUp, ChevronDown, Check, X, ClipboardList, Loader2, ChevronRight, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type Plan = { id: string; name: string; order: number }
type TemplateExercise = {
  id: string; order: number; sets: number; reps: string
  restSeconds: number; noteScheda?: string; notePersonali?: string
  exercise: { id: string; name: string; muscleGroup: string }
}
type Template = { id: string; planId: string; name: string; order: number; exercises: TemplateExercise[] }
type Exercise = { id: string; name: string; muscleGroup: string }

const REPS_OPTIONS = ['10', '8', '12', '6', '5', '3', '1', '15', '20', 'AMRAP', 'RM', 'WTD', '8-12', '6-10', '3-5']

// ── Exercise row inside workout ──
function ExerciseRow({
  ex, isFirst, isLast,
  onUpdate, onDelete, onReorder
}: {
  ex: TemplateExercise; isFirst: boolean; isLast: boolean
  onUpdate: (data: Partial<TemplateExercise>) => void
  onDelete: () => void
  onReorder: (dir: 'up' | 'down') => void
}) {
  const [open, setOpen] = useState(false)
  const [sets, setSets] = useState(String(ex.sets))
  const [reps, setReps] = useState(ex.reps)
  const [rest, setRest] = useState(String(ex.restSeconds))
  const [noteScheda, setNoteScheda] = useState(ex.noteScheda ?? '')
  const [notePersonali, setNotePersonali] = useState(ex.notePersonali ?? '')
  const [dirty, setDirty] = useState(false)

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true) }
  }

  async function save() {
    await onUpdate({ sets: Number(sets), reps, restSeconds: Number(rest), noteScheda, notePersonali })
    setDirty(false)
  }

  return (
    <div className={cn('border rounded-2xl overflow-hidden transition-colors', open ? 'border-blue-200 dark:border-blue-800' : 'border-gray-100 dark:border-gray-800')}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-3 bg-white dark:bg-gray-900">
        {/* Reorder */}
        <div className="flex flex-col shrink-0">
          <button onClick={() => onReorder('up')} disabled={isFirst} className={cn('w-5 h-4 flex items-center justify-center', isFirst ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:text-blue-500')}><ChevronUp size={12} /></button>
          <button onClick={() => onReorder('down')} disabled={isLast} className={cn('w-5 h-4 flex items-center justify-center', isLast ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:text-blue-500')}><ChevronDown size={12} /></button>
        </div>

        {/* Name + summary */}
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{ex.exercise.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="text-blue-500 font-semibold">{ex.sets} × {ex.reps}</span>
            {' · '}{ex.restSeconds}s rec
            {ex.exercise.muscleGroup && <span className="ml-1 text-gray-300">· {ex.exercise.muscleGroup}</span>}
          </p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setOpen(o => !o)} className="text-gray-400">
            <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 space-y-4">
          {/* Sets / Reps / Rec */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">Set</label>
              <input type="number" min="1" value={sets} onChange={e => mark(setSets)(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">Reps</label>
              <input type="text" value={reps} onChange={e => mark(setReps)(e.target.value)}
                list="reps-options"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
              <datalist id="reps-options">
                {REPS_OPTIONS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">Rec (s)</label>
              <input type="number" min="0" value={rest} onChange={e => mark(setRest)(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
            </div>
          </div>

          {/* Note scheda */}
          <div>
            <label className="text-xs font-semibold text-blue-500 block mb-1.5">📋 Note scheda</label>
            <textarea value={noteScheda} onChange={e => mark(setNoteScheda)(e.target.value)} rows={2}
              placeholder="Note del personal trainer, indicazioni tecniche..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 resize-none" />
          </div>

          {/* Note personali */}
          <div>
            <label className="text-xs font-semibold text-emerald-500 block mb-1.5">✏️ Note personali</label>
            <textarea value={notePersonali} onChange={e => mark(setNotePersonali)(e.target.value)} rows={2}
              placeholder="Le mie note, sensazioni, progressi..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 resize-none" />
          </div>

          {dirty && (
            <button onClick={save}
              className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Check size={15} /> Salva modifiche
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add Exercise Modal ──
function AddExerciseModal({ templateId, userId, onClose, onAdded }: {
  templateId: string; userId: string; onClose: () => void; onAdded: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [rest, setRest] = useState('90')
  const [noteScheda, setNoteScheda] = useState('')
  const [notePersonali, setNotePersonali] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&userId=${userId}`)
      setResults(await r.json())
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, userId])

  async function handleAdd() {
    if (!selected) return
    setSaving(true)
    await fetch('/api/template-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId, exerciseId: selected.id,
        sets: Number(sets), reps, restSeconds: Number(rest),
        noteScheda: noteScheda || null, notePersonali: notePersonali || null
      }),
    })
    setSaving(false); onAdded(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[92vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">Aggiungi esercizio</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSelected(null) }}
              placeholder="Cerca esercizio..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
            {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
          </div>

          {!selected && results.length > 0 && (
            <div className="space-y-0.5">
              {results.map(ex => (
                <button key={ex.id} onClick={() => setSelected(ex)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ex.name}</p>
                  <p className="text-xs text-gray-400">{ex.muscleGroup}</p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{selected.name}</p>
                  <p className="text-xs text-gray-400">{selected.muscleGroup}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>

              {/* Set / Reps / Rec */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Set</label>
                  <input type="number" value={sets} onChange={e => setSets(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Reps</label>
                  <input type="text" value={reps} onChange={e => setReps(e.target.value)} list="reps-opts"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                  <datalist id="reps-opts">{REPS_OPTIONS.map(r => <option key={r} value={r} />)}</datalist>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Rec (s)</label>
                  <input type="number" value={rest} onChange={e => setRest(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Note scheda */}
              <div>
                <label className="text-xs font-semibold text-blue-500 block mb-1.5">📋 Note scheda</label>
                <textarea value={noteScheda} onChange={e => setNoteScheda(e.target.value)} rows={2}
                  placeholder="Note del personal trainer..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 resize-none" />
              </div>

              {/* Note personali */}
              <div>
                <label className="text-xs font-semibold text-emerald-500 block mb-1.5">✏️ Note personali</label>
                <textarea value={notePersonali} onChange={e => setNotePersonali(e.target.value)} rows={2}
                  placeholder="Le mie note..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 resize-none" />
              </div>
            </>
          )}

          {!selected && q.length < 2 && (
            <p className="text-sm text-gray-400 text-center py-2">Scrivi almeno 2 caratteri per cercare</p>
          )}
        </div>

        {selected && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={handleAdd} disabled={saving}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Aggiungi esercizio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Workout card ──
function WorkoutCard({ tmpl, planId, idx, total, plans, onRefresh }: {
  tmpl: Template; planId: string; idx: number; total: number
  plans: Plan[]; onRefresh: (planId: string) => void
}) {
  const userId = useAppStore((s) => s.userId)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tmpl.name)
  const [addExercise, setAddExercise] = useState(false)

  async function reorder(dir: 'up' | 'down') {
    await fetch(`/api/workout-templates/${tmpl.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', direction: dir }) })
    onRefresh(planId)
  }

  async function saveName() {
    await fetch(`/api/workout-templates/${tmpl.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setEditing(false); onRefresh(planId)
  }

  async function deleteWorkout() {
    if (!confirm('Eliminare workout?')) return
    await fetch(`/api/workout-templates/${tmpl.id}`, { method: 'DELETE' })
    onRefresh(planId)
  }

  async function duplicateWorkout() {
    await fetch(`/api/workout-templates/${tmpl.id}/duplicate`, { method: 'POST' })
    onRefresh(planId)
  }

  async function updateExercise(exId: string, data: Partial<TemplateExercise>) {
    await fetch(`/api/template-exercises/${exId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    onRefresh(planId)
  }

  async function deleteExercise(exId: string) {
    if (!confirm('Rimuovere esercizio?')) return
    await fetch(`/api/template-exercises/${exId}`, { method: 'DELETE' })
    onRefresh(planId)
  }

  async function reorderExercise(exId: string, dir: 'up' | 'down') {
    await fetch(`/api/template-exercises/${exId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', direction: dir }) })
    onRefresh(planId)
  }

  return (
    <div className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors', open ? 'border-blue-200 dark:border-blue-700' : 'border-gray-200 dark:border-gray-800')}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-blue-500">{idx + 1}</span>
        </div>

        {editing ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none" />
        ) : (
          <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{tmpl.name}</p>
            <p className="text-xs text-gray-400">{tmpl.exercises?.length ?? 0} esercizi</p>
          </button>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          {editing ? (
            <>
              <button onClick={saveName} className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center"><Check size={13} /></button>
              <button onClick={() => setEditing(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={13} /></button>
            </>
          ) : (
            <>
              <button onClick={() => reorder('up')} disabled={idx === 0} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', idx === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronUp size={13} /></button>
              <button onClick={() => reorder('down')} disabled={idx === total - 1} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', idx === total - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronDown size={13} /></button>
              <button onClick={() => { setEditing(true); setName(tmpl.name) }} className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center"><Pencil size={12} /></button>
              <button onClick={duplicateWorkout} className="w-7 h-7 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950 text-gray-400 hover:text-violet-500 flex items-center justify-center"><Copy size={12} /></button>
              <button onClick={deleteWorkout} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
              <button onClick={() => setOpen(o => !o)} className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center"><ChevronRight size={13} className={cn('transition-transform', open && 'rotate-90')} /></button>
            </>
          )}
        </div>
      </div>

      {/* Exercises */}
      {open && (
        <div className="bg-gray-50 dark:bg-gray-800/30 px-3 pb-3 pt-1 space-y-2">
          {(tmpl.exercises ?? []).map((ex, ei) => (
            <ExerciseRow key={ex.id} ex={ex}
              isFirst={ei === 0} isLast={ei === (tmpl.exercises?.length ?? 0) - 1}
              onUpdate={(data) => updateExercise(ex.id, data)}
              onDelete={() => deleteExercise(ex.id)}
              onReorder={(dir) => reorderExercise(ex.id, dir)}
            />
          ))}

          <button onClick={() => setAddExercise(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-blue-200 dark:border-blue-800 text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
            <Plus size={15} /> Aggiungi esercizio
          </button>
        </div>
      )}

      {addExercise && (
        <AddExerciseModal templateId={tmpl.id} userId={userId}
          onClose={() => setAddExercise(false)}
          onAdded={() => { setAddExercise(false); onRefresh(planId) }} />
      )}
    </div>
  )
}

// ── Main page ──
const DEFAULT_PLANS = ['Workout 1 — Chest + Back', 'Workout 2 — Legs', 'Workout 3 — Shoulders + Secondary Session']

export default function TrainingPlanPage() {
  const userId = useAppStore((s) => s.userId)
  const [plans, setPlans] = useState<Plan[]>([])
  const [templates, setTemplates] = useState<Record<string, Template[]>>({})
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [newPlanName, setNewPlanName] = useState('')
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState<Record<string, string>>({})
  const [showNewTemplate, setShowNewTemplate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editPlanName, setEditPlanName] = useState('')

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/workout-plans?userId=${userId}`)
    let data = await r.json()
    if (!Array.isArray(data) || data.length === 0) {
      for (const name of DEFAULT_PLANS) {
        await fetch('/api/workout-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name }) })
      }
      const r2 = await fetch(`/api/workout-plans?userId=${userId}`)
      data = await r2.json()
    }
    setPlans(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const fetchTemplates = useCallback(async (planId: string) => {
    const r = await fetch(`/api/workout-templates?planId=${planId}`)
    const data = await r.json()
    setTemplates(prev => ({ ...prev, [planId]: data }))
  }, [])

  function togglePlan(id: string) {
    setExpandedPlans(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id) } else { n.add(id); fetchTemplates(id) }
      return n
    })
  }

  async function createPlan() {
    if (!newPlanName.trim()) return
    setSaving(true)
    await fetch('/api/workout-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name: newPlanName }) })
    setNewPlanName(''); setShowNewPlan(false); setSaving(false); fetchPlans()
  }

  async function updatePlan(id: string) {
    await fetch(`/api/workout-plans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editPlanName }) })
    setEditingPlan(null); fetchPlans()
  }

  async function deletePlan(id: string) {
    if (!confirm('Eliminare piano?')) return
    await fetch(`/api/workout-plans/${id}`, { method: 'DELETE' })
    fetchPlans()
  }

  async function reorderPlan(id: string, dir: 'up' | 'down') {
    await fetch(`/api/workout-plans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', direction: dir, userId }) })
    fetchPlans()
  }

  async function createTemplate(planId: string) {
    const name = newTemplateName[planId] ?? ''
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/workout-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, userId, name }) })
    setNewTemplateName(prev => ({ ...prev, [planId]: '' }))
    setShowNewTemplate(null); setSaving(false)
    fetchTemplates(planId)
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-4">
      <PageHeader title="Piano Allenamento" icon={ClipboardList} accent="training"
        action={<button onClick={() => setShowNewPlan(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold">
          <Plus size={15} /> Nuovo Piano
        </button>}
      />

      {showNewPlan && (
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-2">
          <input autoFocus value={newPlanName} onChange={e => setNewPlanName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createPlan()} placeholder="Nome piano..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
          <button onClick={createPlan} disabled={saving || !newPlanName.trim()} className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button onClick={() => setShowNewPlan(false)} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : plans.map((plan, pi) => (
        <div key={plan.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          {/* Plan header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            {editingPlan === plan.id ? (
              <>
                <input autoFocus value={editPlanName} onChange={e => setEditPlanName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') updatePlan(plan.id); if (e.key === 'Escape') setEditingPlan(null) }}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-blue-300 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none" />
                <button onClick={() => updatePlan(plan.id)} className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center"><Check size={13} /></button>
                <button onClick={() => setEditingPlan(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={13} /></button>
              </>
            ) : (
              <>
                <button onClick={() => togglePlan(plan.id)} className="flex-1 text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{plan.name}</p>
                  <p className="text-xs text-gray-400">{templates[plan.id]?.length ?? '—'} workout</p>
                </button>
                <button onClick={() => reorderPlan(plan.id, 'up')} disabled={pi === 0} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', pi === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronUp size={13} /></button>
                <button onClick={() => reorderPlan(plan.id, 'down')} disabled={pi === plans.length - 1} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', pi === plans.length - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronDown size={13} /></button>
                <button onClick={() => { setEditingPlan(plan.id); setEditPlanName(plan.name) }} className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center"><Pencil size={12} /></button>
                <button onClick={() => deletePlan(plan.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
                <button onClick={() => togglePlan(plan.id)} className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center"><ChevronRight size={13} className={cn('transition-transform', expandedPlans.has(plan.id) && 'rotate-90')} /></button>
              </>
            )}
          </div>

          {/* Workout list */}
          {expandedPlans.has(plan.id) && (
            <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-800/20">
              {(templates[plan.id] ?? []).map((tmpl, ti) => (
                <WorkoutCard key={tmpl.id} tmpl={tmpl} planId={plan.id}
                  idx={ti} total={templates[plan.id]?.length ?? 0}
                  plans={plans}
                  onRefresh={(pid) => fetchTemplates(pid)} />
              ))}

              {showNewTemplate === plan.id ? (
                <div className="flex gap-2">
                  <input autoFocus value={newTemplateName[plan.id] ?? ''}
                    onChange={e => setNewTemplateName(prev => ({ ...prev, [plan.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && createTemplate(plan.id)}
                    placeholder="Nome workout (es. Push Day)"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                  <button onClick={() => createTemplate(plan.id)} disabled={saving}
                    className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  <button onClick={() => setShowNewTemplate(null)} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={13} /></button>
                </div>
              ) : (
                <button onClick={() => { setShowNewTemplate(plan.id); fetchTemplates(plan.id) }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800 text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors">
                  <Plus size={14} /> Aggiungi workout
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
