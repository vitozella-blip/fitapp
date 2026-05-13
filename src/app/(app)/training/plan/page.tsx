'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Copy, ChevronUp, ChevronDown, Check, X, ClipboardList, Loader2, ChevronRight, Timer, RotateCcw, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type Plan = { id: string; name: string; order: number }
type Template = { id: string; planId: string; name: string; order: number; notes?: string }
type TemplateExercise = {
  id: string; templateId: string; order: number; notes?: string
  restSeconds: number; timerSeconds?: number
  exercise: { id: string; name: string; muscleGroup: string }
  sets: TemplateSet[]
}
type TemplateSet = { id: string; setNumber: number; reps: string; weight?: number; notes?: string }
type Exercise = { id: string; name: string; muscleGroup: string }

const REPS_PRESETS = ['10', '8', '12', '6', '5', '3', '1', 'AMRAP', 'RM', 'WTD', '8-12', '6-10']

function SetRow({ s, onUpdate, onDelete }: { s: TemplateSet; onUpdate: (data: Partial<TemplateSet>) => void; onDelete: () => void }) {
  const [reps, setReps] = useState(s.reps)
  const [weight, setWeight] = useState(s.weight ? String(s.weight) : '')
  const [editing, setEditing] = useState(false)

  async function save() {
    await onUpdate({ reps, weight: weight ? Number(weight) : undefined })
    setEditing(false)
  }

  if (editing) return (
    <div className="flex items-center gap-1.5 py-1.5">
      <span className="w-5 text-center text-xs text-gray-400 font-bold">{s.setNumber}</span>
      <select value={reps} onChange={e => setReps(e.target.value)}
        className="flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 outline-none">
        {REPS_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
        {!REPS_PRESETS.includes(reps) && <option value={reps}>{reps}</option>}
      </select>
      <input type="text" value={reps} onChange={e => setReps(e.target.value)} placeholder="reps"
        className="w-16 px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 outline-none" />
      <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="kg"
        className="w-14 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-center text-gray-900 dark:text-gray-100 outline-none" />
      <button onClick={save} className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center"><Check size={12} /></button>
      <button onClick={() => setEditing(false)} className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><X size={12} /></button>
    </div>
  )

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-5 text-center text-xs text-gray-400 font-bold shrink-0">{s.setNumber}</span>
      <span className="text-xs font-semibold text-blue-500 w-12">{s.reps}</span>
      <span className="text-xs text-gray-400">{s.weight ? `${s.weight} kg` : '— kg'}</span>
      <div className="flex-1" />
      <button onClick={() => setEditing(true)} className="w-6 h-6 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"><Pencil size={11} /></button>
      <button onClick={onDelete} className="w-6 h-6 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"><Trash2 size={11} /></button>
    </div>
  )
}

function ExerciseCard({ ex, isFirst, isLast, templateId, templates, onRefresh }: {
  ex: TemplateExercise; isFirst: boolean; isLast: boolean
  templateId: string; templates: Template[]; onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState(ex.notes || '')
  const [rest, setRest] = useState(String(ex.restSeconds))

  async function updateExercise(data: object) {
    await fetch(`/api/template-exercises/${ex.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    onRefresh()
  }

  async function deleteExercise() {
    if (!confirm('Rimuovere esercizio?')) return
    await fetch(`/api/template-exercises/${ex.id}`, { method: 'DELETE' })
    onRefresh()
  }

  async function addSet() {
    const nextNum = (ex.sets?.length ?? 0) + 1
    await fetch('/api/template-sets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateExerciseId: ex.id, setNumber: nextNum, reps: '10' }) })
    onRefresh()
  }

  async function updateSet(setId: string, data: Partial<TemplateSet>) {
    await fetch(`/api/template-sets/${setId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    onRefresh()
  }

  async function deleteSet(setId: string) {
    await fetch(`/api/template-sets/${setId}`, { method: 'DELETE' })
    onRefresh()
  }

  async function moveToTemplate(targetId: string) {
    await fetch(`/api/template-exercises/${ex.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move', targetTemplateId: targetId }) })
    onRefresh()
  }

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={() => updateExercise({ action: 'reorder', direction: 'up' })} disabled={isFirst}
            className={cn('w-5 h-4 flex items-center justify-center', isFirst ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:text-blue-500')}><ChevronUp size={12} /></button>
          <button onClick={() => updateExercise({ action: 'reorder', direction: 'down' })} disabled={isLast}
            className={cn('w-5 h-4 flex items-center justify-center', isLast ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:text-blue-500')}><ChevronDown size={12} /></button>
        </div>
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.exercise.name}</p>
          <p className="text-xs text-gray-400">{ex.exercise.muscleGroup} · {ex.sets?.length ?? 0} serie · {ex.restSeconds}s rec</p>
        </button>
        <button onClick={() => setOpen(o => !o)} className="text-gray-400 shrink-0">
          <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
        </button>
        <button onClick={deleteExercise} className="w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center shrink-0"><Trash2 size={12} /></button>
      </div>

      {open && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 pb-3 pt-2 space-y-2">
          {/* Sets */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {(ex.sets ?? []).map((s, idx) => (
              <SetRow key={s.id} s={s}
                onUpdate={(data) => updateSet(s.id, data)}
                onDelete={() => deleteSet(s.id)}
              />
            ))}
          </div>
          <button onClick={addSet} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 text-blue-400 text-xs hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
            <Plus size={12} /> Aggiungi serie
          </button>

          {/* Rest + Timer */}
          <div className="flex gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-1">
              <RotateCcw size={12} className="text-gray-400 shrink-0" />
              <input type="number" value={rest} onChange={e => setRest(e.target.value)}
                onBlur={() => updateExercise({ restSeconds: Number(rest) })}
                className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-center text-gray-900 dark:text-gray-100 outline-none" />
              <span className="text-xs text-gray-400">sec rec</span>
            </div>
          </div>

          {/* Notes */}
          {editNotes ? (
            <div className="flex gap-1.5">
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note esercizio..."
                className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100 outline-none" />
              <button onClick={() => { updateExercise({ notes }); setEditNotes(false) }}
                className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center"><Check size={12} /></button>
            </div>
          ) : (
            <button onClick={() => setEditNotes(true)} className="text-xs text-gray-400 hover:text-blue-400 transition-colors">
              {ex.notes || '+ Aggiungi nota'}
            </button>
          )}

          {/* Move to template */}
          {templates.filter(t => t.id !== templateId).length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] text-gray-400 mb-1">Sposta in:</p>
              <div className="flex flex-wrap gap-1">
                {templates.filter(t => t.id !== templateId).map(t => (
                  <button key={t.id} onClick={() => moveToTemplate(t.id)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-500 transition-colors">
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddExerciseModal({ templateId, userId, onClose, onAdded }: { templateId: string; userId: string; onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [rest, setRest] = useState('90')
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
  }, [q])

  async function handleAdd() {
    if (!selected) return
    setSaving(true)
    const setsArr = Array.from({ length: Number(sets) }, (_, i) => ({ setNumber: i + 1, reps, weight: null }))
    await fetch('/api/template-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, exerciseId: selected.id, restSeconds: Number(rest), sets: setsArr }),
    })
    setSaving(false); onAdded(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] flex flex-col p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900 dark:text-gray-100">Aggiungi esercizio</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={14} /></button>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSelected(null) }} placeholder="Cerca esercizio..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
          {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>
        {!selected && results.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-0.5 mb-3">
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
          <div className="space-y-3 mt-1">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selected.name}</p>
              <p className="text-xs text-gray-400">{selected.muscleGroup}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ l: 'Serie', v: sets, s: setSets }, { l: 'Reps', v: reps, s: setReps }, { l: 'Rec (s)', v: rest, s: setRest }].map(f => (
                <div key={f.l}>
                  <label className="text-xs text-gray-400 block mb-1">{f.l}</label>
                  <input type={f.l === 'Reps' ? 'text' : 'number'} value={f.v} onChange={e => f.s(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                </div>
              ))}
            </div>
            <button onClick={handleAdd} disabled={saving}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Aggiungi
            </button>
          </div>
        )}
        {!selected && q.length < 2 && <p className="text-sm text-gray-400 text-center py-4">Scrivi almeno 2 caratteri</p>}
      </div>
    </div>
  )
}

export default function TrainingPlanPage() {
  const userId = useAppStore((s) => s.userId)
  const [plans, setPlans] = useState<Plan[]>([])
  const [templates, setTemplates] = useState<Record<string, Template[]>>({})
  const [exercises, setExercises] = useState<Record<string, TemplateExercise[]>>({})
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newPlanName, setNewPlanName] = useState('')
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [showNewTemplate, setShowNewTemplate] = useState<string | null>(null)
  const [addExerciseTo, setAddExerciseTo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const DEFAULT_WORKOUTS = ['Workout 1 — Chest + Back', 'Workout 2 — Legs', 'Workout 3 — Shoulders + Secondary Session']

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/workout-plans?userId=${userId}`)
    const data = await r.json()
    setPlans(data)
    if (data.length === 0) {
      for (const name of DEFAULT_WORKOUTS) {
        await fetch('/api/workout-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name }) })
      }
      const r2 = await fetch(`/api/workout-plans?userId=${userId}`)
      setPlans(await r2.json())
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  async function fetchTemplates(planId: string) {
    const r = await fetch(`/api/workout-templates?planId=${planId}`)
    const data = await r.json()
    setTemplates(prev => ({ ...prev, [planId]: data }))
  }

  async function fetchExercises(templateId: string) {
    const r = await fetch(`/api/template-exercises?templateId=${templateId}`)
    const data = await r.json()
    setExercises(prev => ({ ...prev, [templateId]: data }))
  }

  function togglePlan(id: string) {
    setExpandedPlans(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id) } else { n.add(id); fetchTemplates(id) }
      return n
    })
  }

  function toggleTemplate(id: string) {
    setExpandedTemplates(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id) } else { n.add(id); fetchExercises(id) }
      return n
    })
  }

  async function createPlan() {
    if (!newPlanName.trim()) return
    setSaving(true)
    await fetch('/api/workout-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name: newPlanName }) })
    setNewPlanName(''); setShowNewPlan(false); setSaving(false); fetchPlans()
  }

  async function updatePlan(id: string, name: string) {
    await fetch(`/api/workout-plans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setEditingPlan(null); fetchPlans()
  }

  async function deletePlan(id: string) {
    if (!confirm('Eliminare piano?')) return
    await fetch(`/api/workout-plans/${id}`, { method: 'DELETE' })
    fetchPlans()
  }

  async function duplicatePlan(id: string) {
    await fetch(`/api/workout-plans/${id}/duplicate`, { method: 'POST' })
    fetchPlans()
  }

  async function reorderPlan(id: string, dir: 'up' | 'down') {
    await fetch(`/api/workout-plans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', direction: dir, userId }) })
    fetchPlans()
  }

  async function createTemplate(planId: string) {
    if (!newTemplateName.trim()) return
    setSaving(true)
    await fetch('/api/workout-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, userId, name: newTemplateName }) })
    setNewTemplateName(''); setShowNewTemplate(null); setSaving(false); fetchTemplates(planId)
  }

  async function updateTemplate(id: string, planId: string) {
    await fetch(`/api/workout-templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName }) })
    setEditingTemplate(null); fetchTemplates(planId)
  }

  async function deleteTemplate(id: string, planId: string) {
    if (!confirm('Eliminare workout?')) return
    await fetch(`/api/workout-templates/${id}`, { method: 'DELETE' })
    fetchTemplates(planId)
  }

  async function duplicateTemplate(id: string, planId: string) {
    await fetch(`/api/workout-templates/${id}/duplicate`, { method: 'POST' })
    fetchTemplates(planId)
  }

  async function reorderTemplate(id: string, dir: 'up' | 'down', planId: string) {
    await fetch(`/api/workout-templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reorder', direction: dir }) })
    fetchTemplates(planId)
  }

  const allTemplates = Object.values(templates).flat()

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-2">
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
          <button onClick={createPlan} disabled={saving || !newPlanName.trim()}
            className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50">
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
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-500">{pi + 1}</span>
            </div>
            {editingPlan === plan.id ? (
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') updatePlan(plan.id, editName); if (e.key === 'Escape') setEditingPlan(null) }}
                className="flex-1 px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none" />
            ) : (
              <button onClick={() => togglePlan(plan.id)} className="flex-1 text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{plan.name}</p>
              </button>
            )}
            <div className="flex items-center gap-0.5 shrink-0">
              {editingPlan === plan.id ? (
                <>
                  <button onClick={() => updatePlan(plan.id, editName)} className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center"><Check size={13} /></button>
                  <button onClick={() => setEditingPlan(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={13} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => reorderPlan(plan.id, 'up')} disabled={pi === 0} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', pi === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronUp size={13} /></button>
                  <button onClick={() => reorderPlan(plan.id, 'down')} disabled={pi === plans.length - 1} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', pi === plans.length - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronDown size={13} /></button>
                  <button onClick={() => { setEditingPlan(plan.id); setEditName(plan.name) }} className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center"><Pencil size={12} /></button>
                  <button onClick={() => duplicatePlan(plan.id)} className="w-7 h-7 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950 text-gray-400 hover:text-violet-500 flex items-center justify-center"><Copy size={12} /></button>
                  <button onClick={() => deletePlan(plan.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
                  <button onClick={() => togglePlan(plan.id)} className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center"><ChevronRight size={13} className={cn('transition-transform', expandedPlans.has(plan.id) && 'rotate-90')} /></button>
                </>
              )}
            </div>
          </div>

          {/* Templates */}
          {expandedPlans.has(plan.id) && (
            <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-800/30">
              {(templates[plan.id] ?? []).map((tmpl, ti) => (
                <div key={tmpl.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-indigo-500">{ti + 1}</span>
                    </div>
                    {editingTemplate === tmpl.id ? (
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') updateTemplate(tmpl.id, plan.id); if (e.key === 'Escape') setEditingTemplate(null) }}
                        className="flex-1 px-2 py-1 rounded-lg border border-indigo-300 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none" />
                    ) : (
                      <button onClick={() => toggleTemplate(tmpl.id)} className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{tmpl.name}</p>
                        <p className="text-xs text-gray-400">{(exercises[tmpl.id] ?? []).length} esercizi</p>
                      </button>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {editingTemplate === tmpl.id ? (
                        <>
                          <button onClick={() => updateTemplate(tmpl.id, plan.id)} className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center"><Check size={11} /></button>
                          <button onClick={() => setEditingTemplate(null)} className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><X size={11} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => reorderTemplate(tmpl.id, 'up', plan.id)} disabled={ti === 0} className={cn('w-6 h-6 rounded-md flex items-center justify-center', ti === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronUp size={11} /></button>
                          <button onClick={() => reorderTemplate(tmpl.id, 'down', plan.id)} disabled={ti === (templates[plan.id]?.length ?? 0) - 1} className={cn('w-6 h-6 rounded-md flex items-center justify-center', ti === (templates[plan.id]?.length ?? 0) - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}><ChevronDown size={11} /></button>
                          <button onClick={() => { setEditingTemplate(tmpl.id); setEditName(tmpl.name) }} className="w-6 h-6 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center"><Pencil size={11} /></button>
                          <button onClick={() => duplicateTemplate(tmpl.id, plan.id)} className="w-6 h-6 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950 text-gray-400 hover:text-violet-500 flex items-center justify-center"><Copy size={11} /></button>
                          <button onClick={() => deleteTemplate(tmpl.id, plan.id)} className="w-6 h-6 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center"><Trash2 size={11} /></button>
                          <button onClick={() => toggleTemplate(tmpl.id)} className="w-6 h-6 rounded-md text-gray-400 flex items-center justify-center"><ChevronRight size={11} className={cn('transition-transform', expandedTemplates.has(tmpl.id) && 'rotate-90')} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {expandedTemplates.has(tmpl.id) && (
                    <div className="px-3 pb-3 space-y-2">
                      {(exercises[tmpl.id] ?? []).map((ex, ei) => (
                        <ExerciseCard key={ex.id} ex={ex}
                          isFirst={ei === 0} isLast={ei === (exercises[tmpl.id]?.length ?? 0) - 1}
                          templateId={tmpl.id} templates={allTemplates}
                          onRefresh={() => fetchExercises(tmpl.id)} />
                      ))}
                      <button onClick={() => setAddExerciseTo(tmpl.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-blue-200 dark:border-blue-800 text-blue-400 text-xs hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
                        <Plus size={13} /> Aggiungi esercizio
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {showNewTemplate === plan.id ? (
                <div className="flex gap-2">
                  <input autoFocus value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createTemplate(plan.id)} placeholder="Nome workout (es. Push Day)"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                  <button onClick={() => createTemplate(plan.id)} disabled={saving}
                    className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  <button onClick={() => setShowNewTemplate(null)} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={13} /></button>
                </div>
              ) : (
                <button onClick={() => setShowNewTemplate(plan.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 text-indigo-400 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors">
                  <Plus size={14} /> Aggiungi workout
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {addExerciseTo && (
        <AddExerciseModal
          templateId={addExerciseTo} userId={userId}
          onClose={() => setAddExerciseTo(null)}
          onAdded={() => { fetchExercises(addExerciseTo!); setAddExerciseTo(null) }}
        />
      )}
    </div>
  )
}
