'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Pencil, Copy, ChevronUp, ChevronDown,
  Check, X, ClipboardList, Loader2, Search,
  ChevronDown as Chevron, FileText,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const CT = '#7aafc8'
const SCHEDA_COLORS = [
  '#7aafc8', // blu (default)
  '#9d8fcc', // viola
  '#f0aa78', // arancio
  '#7dbf7d', // verde
  '#c4a0d6', // lilla
  '#e8a5a5', // rosa
]
const DEFAULT_PLAN_NAME = '__default__'

type TemplateExercise = {
  id: string; order: number; sets: number; reps: string
  restSeconds: number; noteScheda?: string; notePersonali?: string
  exercise: { id: string; name: string; muscleGroup: string }
}
type Template = {
  id: string; planId: string; name: string; order: number
  exercises: TemplateExercise[]
}
type Exercise = { id: string; name: string; muscleGroup: string }

// ── Shared input style ────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none'

// ── Add/Edit exercise modal (shared) ─────────────────────────────────────────
function ExerciseFormModal({
  templateId, userId, mode, editRow, onClose, onSaved,
}: {
  templateId: string; userId: string
  mode: 'add' | 'edit'
  editRow?: TemplateExercise | null
  onClose: () => void
  onSaved: () => void
}) {
  const [q, setQ]               = useState('')
  const [results, setResults]   = useState<Exercise[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Exercise | null>(
    editRow ? editRow.exercise : null
  )
  const [creating, setCreating] = useState(false)

  const [sets, setSets]         = useState(editRow ? String(editRow.sets) : '3')
  const [reps, setReps]         = useState(editRow ? editRow.reps : '')
  const [rest, setRest]         = useState(editRow ? String(editRow.restSeconds) : '90')
  const [noteScheda, setNoteScheda] = useState(editRow?.noteScheda ?? '')
  const [notePerso, setNotePerso]   = useState(editRow?.notePersonali ?? '')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (mode === 'edit' || q.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const r = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&userId=${userId}`)
      setResults(await r.json())
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, userId, mode])

  async function addToDb() {
    if (!q.trim()) return
    setCreating(true)
    const r = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: q.trim(), muscleGroup: '', userId }),
    })
    const ex = await r.json()
    setSelected(ex)
    setResults([])
    setCreating(false)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    if (mode === 'add') {
      await fetch('/api/template-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId, exerciseId: selected.id,
          sets: Number(sets), reps, restSeconds: Number(rest),
          noteScheda: noteScheda || null,
          notePersonali: notePerso || null,
        }),
      })
    } else if (editRow) {
      await fetch(`/api/template-exercises/${editRow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets: Number(sets), reps, restSeconds: Number(rest),
          noteScheda: noteScheda || null,
          notePersonali: notePerso || null,
        }),
      })
    }
    setSaving(false); onSaved(); onClose()
  }

  const showAddToDb = mode === 'add' && !selected && q.length >= 2 && !searching && results.length === 0
  const showAddToDbHint = mode === 'add' && !selected && q.length >= 2 && !searching && results.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[92vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">
            {mode === 'edit' ? `Modifica — ${editRow?.exercise.name}` : 'Aggiungi esercizio'}
          </p>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* Search (add mode only) */}
          {mode === 'add' && !selected && (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Cerca o scrivi nome esercizio..."
                  className={inp + ' pl-9 pr-4'} />
                {searching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  {results.map(ex => (
                    <button key={ex.id} onClick={() => setSelected(ex)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ex.name}</p>
                    </button>
                  ))}
                  {/* Add to DB hint when results exist but user wants different */}
                  {showAddToDbHint && (
                    <button onClick={addToDb} disabled={creating}
                      className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: CT + '20', color: CT }}>
                        {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: CT }}>
                        Aggiungi &ldquo;{q}&rdquo; al database
                      </p>
                    </button>
                  )}
                </div>
              )}

              {/* No results: add to DB */}
              {showAddToDb && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <p className="text-xs text-gray-400 text-center py-3">Nessun risultato per &ldquo;{q}&rdquo;</p>
                  <button onClick={addToDb} disabled={creating}
                    className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: CT + '20', color: CT }}>
                      {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: CT }}>
                      Aggiungi &ldquo;{q}&rdquo; al database
                    </p>
                  </button>
                </div>
              )}

              {q.length < 2 && (
                <p className="text-sm text-gray-400 text-center py-2">Scrivi almeno 2 caratteri per cercare</p>
              )}
            </>
          )}

          {/* Selected exercise chip */}
          {(mode === 'edit' || selected) && (
            <>
              {mode === 'add' && selected && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: CT + '15' }}>
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{selected.name}</p>
                  <button onClick={() => { setSelected(null); setQ('') }}
                    className="text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Sets / Reps / Rec */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Set</label>
                  <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)}
                    className={inp + ' text-center font-bold'} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Reps</label>
                  <input type="text" value={reps} onChange={e => setReps(e.target.value)}
                    placeholder="es. 10RM, WTD, 8+DROP"
                    className={inp + ' text-center font-bold'} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Rec (s)</label>
                  <input type="number" min="0" value={rest} onChange={e => setRest(e.target.value)}
                    className={inp + ' text-center font-bold'} />
                </div>
              </div>

              {/* Note scheda */}
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide"
                  style={{ color: CT }}>
                  Note scheda
                </label>
                <textarea value={noteScheda} onChange={e => setNoteScheda(e.target.value)}
                  rows={2} placeholder="Indicazioni tecniche, progressioni..."
                  className={inp + ' resize-none'} />
              </div>

              {/* Note personali */}
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide"
                  style={{ color: '#7dbf7d' }}>
                  Note personali
                </label>
                <textarea value={notePerso} onChange={e => setNotePerso(e.target.value)}
                  rows={2} placeholder="Le mie sensazioni, carichi, progressi..."
                  className={inp + ' resize-none'} />
              </div>
            </>
          )}
        </div>

        {/* Footer CTA */}
        {(mode === 'edit' || selected) && (
          <div className="px-4 pb-6 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={handleSave} disabled={saving || !reps.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: CT }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {mode === 'edit' ? 'Salva modifiche' : 'Aggiungi esercizio'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Exercise row (read-only, edit via pencil) ─────────────────────────────────
function ExRow({
  ex, isFirst, isLast, templateId, userId, color,
  onDelete, onReorder, onRefresh,
}: {
  ex: TemplateExercise; isFirst: boolean; isLast: boolean
  templateId: string; userId: string; color: string
  onDelete: () => void
  onReorder: (dir: 'up' | 'down') => void
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const hasNotes = !!(ex.noteScheda || ex.notePersonali)

  return (
    <>
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 group">
        {/* Reorder handles */}
        <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onReorder('up')} disabled={isFirst}
            className={cn('w-4 h-4 flex items-center justify-center', isFirst ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400')}>
            <ChevronUp size={10} />
          </button>
          <button onClick={() => onReorder('down')} disabled={isLast}
            className={cn('w-4 h-4 flex items-center justify-center', isLast ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400')}>
            <ChevronDown size={10} />
          </button>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
            {ex.exercise.name}
          </p>
          {hasNotes && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">
              {ex.noteScheda || ex.notePersonali}
            </p>
          )}
        </div>

        {/* Summary pill */}
        <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-lg"
          style={{ backgroundColor: color + '15', color: color }}>
          {ex.sets} × {ex.reps}
        </span>
        <span className="shrink-0 text-xs text-gray-400">
          {ex.restSeconds}s
        </span>

        {/* Notes indicator */}
        {hasNotes && (
          <FileText size={11} className="shrink-0 text-gray-300 dark:text-gray-600" />
        )}

        {/* Edit */}
        <button onClick={() => setEditing(true)}
          className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors shrink-0">
          <Pencil size={12} />
        </button>

        {/* Delete */}
        <button onClick={onDelete}
          className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
          <Trash2 size={12} />
        </button>
      </div>

      {editing && (
        <ExerciseFormModal
          templateId={templateId} userId={userId}
          mode="edit"
          editRow={ex}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onRefresh() }}
        />
      )}
    </>
  )
}

// ── Workout (Scheda) Card ─────────────────────────────────────────────────────
function WorkoutCard({ tmpl, idx, total, onRefresh }: {
  tmpl: Template; idx: number; total: number
  onRefresh: () => void
}) {
  const { userId } = useAppStore()
  const [editing, setEditing]     = useState(false)
  const [name, setName]           = useState(tmpl.name)
  const [addEx, setAddEx]         = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  async function reorder(dir: 'up' | 'down') {
    await fetch(`/api/workout-templates/${tmpl.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', direction: dir }),
    })
    onRefresh()
  }

  async function saveName() {
    await fetch(`/api/workout-templates/${tmpl.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setEditing(false); onRefresh()
  }

  async function del() {
    if (!confirm('Eliminare questa scheda?')) return
    await fetch(`/api/workout-templates/${tmpl.id}`, { method: 'DELETE' })
    onRefresh()
  }

  async function dup() {
    await fetch(`/api/workout-templates/${tmpl.id}/duplicate`, { method: 'POST' })
    onRefresh()
  }

  async function deleteExercise(exId: string) {
    if (!confirm('Rimuovere esercizio?')) return
    await fetch(`/api/template-exercises/${exId}`, { method: 'DELETE' })
    onRefresh()
  }

  async function reorderExercise(exId: string, dir: 'up' | 'down') {
    await fetch(`/api/template-exercises/${exId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', direction: dir }),
    })
    onRefresh()
  }

  const exCount = tmpl.exercises?.length ?? 0
  const color = SCHEDA_COLORS[idx % SCHEDA_COLORS.length]

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">

      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ backgroundColor: color + 'cc' }}>
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
            <p className="text-[10px] text-gray-400">{exCount} {exCount === 1 ? 'esercizio' : 'esercizi'}</p>
          </button>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          {editing ? (
            <>
              <button onClick={saveName} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                <Check size={12} />
              </button>
              <button onClick={() => setEditing(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => reorder('up')} disabled={idx === 0}
                className={cn('w-7 h-7 rounded-lg flex items-center justify-center', idx === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <ChevronUp size={13} />
              </button>
              <button onClick={() => reorder('down')} disabled={idx === total - 1}
                className={cn('w-7 h-7 rounded-lg flex items-center justify-center', idx === total - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <ChevronDown size={13} />
              </button>
              <button onClick={() => { setEditing(true); setName(tmpl.name) }}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center">
                <Pencil size={11} />
              </button>
              <button onClick={dup}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center">
                <Copy size={11} />
              </button>
              <button onClick={del}
                className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-400 flex items-center justify-center">
                <Trash2 size={11} />
              </button>
              <button onClick={() => setCollapsed(o => !o)}
                className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center">
                <Chevron size={13} className={cn('transition-transform', collapsed && '-rotate-90')} />
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Table header */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-gray-50 dark:border-gray-800"
            style={{ backgroundColor: color + '0c' }}>
            <div className="w-4 shrink-0" />
            <p className="flex-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Esercizio</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Set × Reps</p>
            <p className="w-8 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Rec</p>
            <div className="w-4 shrink-0" />  {/* note icon col */}
            <div className="w-7 shrink-0" />  {/* edit col */}
            <div className="w-7 shrink-0" />  {/* del col */}
          </div>

          {/* Exercise rows */}
          <div>
            {(tmpl.exercises ?? []).map((ex, ei) => (
              <ExRow key={ex.id} ex={ex}
                isFirst={ei === 0} isLast={ei === (tmpl.exercises?.length ?? 0) - 1}
                templateId={tmpl.id} userId={userId} color={color}
                onDelete={() => deleteExercise(ex.id)}
                onReorder={(dir) => reorderExercise(ex.id, dir)}
                onRefresh={onRefresh}
              />
            ))}
          </div>

          {/* Add exercise */}
          <div className="px-3 pb-3 pt-2">
            <button onClick={() => setAddEx(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm font-medium transition-colors"
              style={{ borderColor: color + '60', color: color }}>
              <Plus size={14} /> Aggiungi esercizio
            </button>
          </div>
        </>
      )}

      {addEx && (
        <ExerciseFormModal
          templateId={tmpl.id} userId={userId}
          mode="add"
          onClose={() => setAddEx(false)}
          onSaved={() => { setAddEx(false); onRefresh() }}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrainingPlanPage() {
  const { userId, userProfile } = useAppStore()
  const [planId, setPlanId]       = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading]     = useState(true)
  const [newName, setNewName]     = useState('')
  const [showNew, setShowNew]     = useState(false)
  const [saving, setSaving]       = useState(false)

  const init = useCallback(async () => {
    setLoading(true)
    try {
      const ur = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: userProfile.name }),
      })
      await ur.json() // consume body — ensures user row exists before FK reference
      const r = await fetch(`/api/workout-plans?userId=${userId}`)
      const plans: { id: string; name: string }[] = await r.json()
      let def = plans.find(p => p.name === DEFAULT_PLAN_NAME)
      if (!def) {
        const res = await fetch('/api/workout-plans', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name: DEFAULT_PLAN_NAME }),
        })
        def = await res.json()
        for (const oldPlan of plans) {
          const tr = await fetch(`/api/workout-templates?planId=${oldPlan.id}`)
          const oldTmpls: Template[] = await tr.json()
          for (const t of oldTmpls) {
            const nr = await fetch('/api/workout-templates', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId: def!.id, userId, name: t.name }),
            })
            const nt = await nr.json()
            for (const ex of t.exercises ?? []) {
              await fetch('/api/template-exercises', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  templateId: nt.id, exerciseId: ex.exercise.id,
                  sets: ex.sets, reps: ex.reps, restSeconds: ex.restSeconds,
                  noteScheda: ex.noteScheda, notePersonali: ex.notePersonali,
                }),
              })
            }
          }
        }
      }
      setPlanId(def!.id)
      const tr = await fetch(`/api/workout-templates?planId=${def!.id}`)
      setTemplates(await tr.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [userId, userProfile.name])

  useEffect(() => { init() }, [init])

  const refresh = useCallback(async () => {
    if (!planId) return
    const r = await fetch(`/api/workout-templates?planId=${planId}`)
    setTemplates(await r.json())
  }, [planId])

  async function createWorkout() {
    if (!newName.trim() || !planId) return
    setSaving(true)
    await fetch('/api/workout-templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, userId, name: newName }),
    })
    setNewName(''); setShowNew(false); setSaving(false); refresh()
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-6">
      <PageHeader title="Piano Allenamento" icon={ClipboardList} accent="training"
        action={
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: CT }}>
            <Plus size={15} /> Nuova Scheda
          </button>
        }
      />

      {showNew && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 flex gap-2">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createWorkout()}
            placeholder='Nome scheda — es. "Push A – Chest + Back"'
            className="flex-1 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none" />
          <button onClick={createWorkout} disabled={saving || !newName.trim()}
            className="w-9 h-9 rounded-xl text-white flex items-center justify-center disabled:opacity-50"
            style={{ backgroundColor: CT }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button onClick={() => setShowNew(false)}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: CT, borderTopColor: 'transparent' }} />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
          <ClipboardList size={28} className="mx-auto mb-3" style={{ color: CT + '80' }} />
          <p className="text-sm font-semibold text-gray-500">Nessuna scheda</p>
          <p className="text-xs text-gray-400 mt-1">Clicca &ldquo;Nuova Scheda&rdquo; per iniziare</p>
        </div>
      ) : (
        templates.map((tmpl, i) => (
          <WorkoutCard key={tmpl.id} tmpl={tmpl} idx={i} total={templates.length} onRefresh={refresh} />
        ))
      )}
    </div>
  )
}
