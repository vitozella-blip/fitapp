'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Pencil, Copy, ChevronUp, ChevronDown,
  Check, X, Loader2, Search, MoreVertical,
  ChevronDown as Chevron, FileText,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const CT = '#7aafc8'
const SCHEDA_COLORS = ['#7aafc8', '#9d8fcc', '#f0aa78', '#7dbf7d', '#c4a0d6', '#e8a5a5']

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
  weeks?: string | string[] | null; isActive?: boolean
}

const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none'

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

function parseWeeks(w: Plan['weeks']): string[] {
  if (Array.isArray(w)) return w
  if (typeof w === 'string' && w.trim()) {
    try { const a = JSON.parse(w); if (Array.isArray(a)) return a } catch {}
  }
  return []
}

// ── Add/Edit exercise modal (logica invariata) ───────────────────────────────
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
  const [selected, setSelected] = useState<Exercise | null>(editRow ? editRow.exercise : null)
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: q.trim(), muscleGroup: '', userId }),
    })
    const ex = await r.json()
    setSelected(ex); setResults([]); setCreating(false)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    if (mode === 'add') {
      await fetch('/api/template-exercises', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId, exerciseId: selected.id,
          sets: Number(sets), reps, restSeconds: Number(rest),
          noteScheda: noteScheda || null, notePersonali: notePerso || null,
        }),
      })
    } else if (editRow) {
      await fetch(`/api/template-exercises/${editRow.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets: Number(sets), reps, restSeconds: Number(rest),
          noteScheda: noteScheda || null, notePersonali: notePerso || null,
        }),
      })
    }
    setSaving(false); onSaved(); onClose()
  }

  const showAddToDb = mode === 'add' && !selected && q.length >= 2 && !searching && results.length === 0
  const showAddToDbHint = mode === 'add' && !selected && q.length >= 2 && !searching && results.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[92vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">
            {mode === 'edit' ? `Modifica — ${editRow?.exercise.name}` : 'Aggiungi esercizio'}
          </p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {mode === 'add' && !selected && (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Cerca o scrivi nome esercizio..."
                  className={inp + ' pl-9 pr-4'} />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              </div>
              {results.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  {results.map(ex => (
                    <button key={ex.id} onClick={() => setSelected(ex)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ex.name}</p>
                    </button>
                  ))}
                  {showAddToDbHint && (
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
              {showAddToDb && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <p className="text-xs text-gray-400 text-center py-3">Nessun risultato per &ldquo;{q}&rdquo;</p>
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
          )}

          {(mode === 'edit' || selected) && (
            <>
              {mode === 'add' && selected && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: CT + '15' }}>
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{selected.name}</p>
                  <button onClick={() => { setSelected(null); setQ('') }} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Set</label>
                  <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} className={inp + ' text-center font-bold'} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Reps</label>
                  <input type="text" value={reps} onChange={e => setReps(e.target.value)} placeholder="es. 10RM, WTD, 8+DROP" className={inp + ' text-center font-bold'} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Rec (s)</label>
                  <input type="number" min="0" value={rest} onChange={e => setRest(e.target.value)} className={inp + ' text-center font-bold'} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide" style={{ color: CT }}>Note scheda</label>
                <textarea value={noteScheda} onChange={e => setNoteScheda(e.target.value)} rows={2} placeholder="Indicazioni tecniche, progressioni..." className={inp + ' resize-none'} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wide" style={{ color: '#7dbf7d' }}>Note personali</label>
                <textarea value={notePerso} onChange={e => setNotePerso(e.target.value)} rows={2} placeholder="Le mie sensazioni, carichi, progressi..." className={inp + ' resize-none'} />
              </div>
            </>
          )}
        </div>

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

// ── Exercise row (logica invariata) ──────────────────────────────────────────
function ExRow({
  ex, isFirst, isLast, templateId, userId, color, onDelete, onReorder, onRefresh,
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{ex.exercise.name}</p>
          {hasNotes && <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">{ex.noteScheda || ex.notePersonali}</p>}
        </div>
        <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: color + '15', color }}>
          {ex.sets} × {ex.reps}
        </span>
        <span className="shrink-0 text-xs text-gray-400">{ex.restSeconds}s</span>
        {hasNotes && <FileText size={11} className="shrink-0 text-gray-300 dark:text-gray-600" />}
        <button onClick={() => setEditing(true)}
          className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors shrink-0">
          <Pencil size={12} />
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
          <Trash2 size={12} />
        </button>
      </div>
      {editing && (
        <ExerciseFormModal templateId={templateId} userId={userId} mode="edit" editRow={ex}
          onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onRefresh() }} />
      )}
    </>
  )
}

// ── Scheda (workout template) card — logica esercizi invariata ───────────────
function WorkoutCard({ tmpl, idx, total, userId, onRefresh }: {
  tmpl: Template; idx: number; total: number; userId: string
  onRefresh: () => void
}) {
  const [editing, setEditing]     = useState(false)
  const [name, setName]           = useState(tmpl.name)
  const [addEx, setAddEx]         = useState(false)
  const [collapsed, setCollapsed] = useState(true)

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
            <p className="text-[10px] text-gray-400">{exCount} {exCount === 1 ? 'esercizio' : 'esercizi'}</p>
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
              <button onClick={() => reorder('up')} disabled={idx === 0}
                className={cn('w-7 h-7 rounded-lg flex items-center justify-center', idx === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <ChevronUp size={13} />
              </button>
              <button onClick={() => reorder('down')} disabled={idx === total - 1}
                className={cn('w-7 h-7 rounded-lg flex items-center justify-center', idx === total - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                <ChevronDown size={13} />
              </button>
              <button onClick={() => { setEditing(true); setName(tmpl.name) }}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center"><Pencil size={11} /></button>
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-gray-50 dark:border-gray-800" style={{ backgroundColor: color + '0c' }}>
            <div className="w-4 shrink-0" />
            <p className="flex-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Esercizio</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Set × Reps</p>
            <p className="w-8 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Rec</p>
            <div className="w-4 shrink-0" /><div className="w-7 shrink-0" /><div className="w-7 shrink-0" />
          </div>
          <div>
            {(tmpl.exercises ?? []).map((ex, ei) => (
              <ExRow key={ex.id} ex={ex}
                isFirst={ei === 0} isLast={ei === (tmpl.exercises?.length ?? 0) - 1}
                templateId={tmpl.id} userId={userId} color={color}
                onDelete={() => deleteExercise(ex.id)}
                onReorder={(dir) => reorderExercise(ex.id, dir)}
                onRefresh={onRefresh} />
            ))}
          </div>
          <div className="px-3 pb-3 pt-2">
            <button onClick={() => setAddEx(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm font-medium transition-colors"
              style={{ borderColor: color + '60', color }}>
              <Plus size={14} /> Aggiungi esercizio
            </button>
          </div>
        </>
      )}

      {addEx && (
        <ExerciseFormModal templateId={tmpl.id} userId={userId} mode="add"
          onClose={() => setAddEx(false)} onSaved={() => { setAddEx(false); onRefresh() }} />
      )}
    </div>
  )
}

// ── 3-dot plan menu ───────────────────────────────────────────────────────────
function PlanMenu({ isActive, onCorrente, onEdit, onDuplicate, onDelete }: {
  isActive: boolean
  onCorrente: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const item = 'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors'
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <button onClick={() => { setOpen(false); onCorrente() }}
            className={cn(item, 'hover:bg-gray-50 dark:hover:bg-gray-800', isActive ? 'font-semibold' : 'text-gray-700 dark:text-gray-300')}
            style={isActive ? { color: CT } : {}}>
            <Check size={15} className={isActive ? 'opacity-100' : 'opacity-0'} /> Corrente
          </button>
          <button onClick={() => { setOpen(false); onEdit() }}
            className={cn(item, 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300')}>
            <Pencil size={15} className="text-gray-400" /> Modifica
          </button>
          <button onClick={() => { setOpen(false); onDuplicate() }}
            className={cn(item, 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300')}>
            <Copy size={15} className="text-gray-400" /> Duplica
          </button>
          <button onClick={() => { setOpen(false); onDelete() }}
            className={cn(item, 'hover:bg-red-50 dark:hover:bg-red-950/50 text-red-500')}>
            <Trash2 size={15} /> Elimina
          </button>
        </div>
      )}
    </div>
  )
}

// ── Weeks editor (stile neutro, NON colorato) ────────────────────────────────
function WeeksEditor({ weeks, onChange }: {
  weeks: string[]
  onChange: (w: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')

  function add() {
    const v = val.trim(); if (!v) return
    onChange([...weeks, v]); setVal(''); setAdding(false)
  }
  function remove(i: number) { onChange(weeks.filter((_, k) => k !== i)) }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= weeks.length) return
    const n = [...weeks];[n[i], n[j]] = [n[j], n[i]]; onChange(n)
  }
  function saveEdit() {
    if (editIdx === null) return
    const v = editVal.trim()
    if (v) { const n = [...weeks]; n[editIdx] = v; onChange(n) }
    setEditIdx(null)
  }

  return (
    <div className="space-y-1.5">
      {weeks.map((w, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          {editIdx === i ? (
            <>
              <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditIdx(null) }}
                className="flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none" />
              <button onClick={saveEdit} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center"><Check size={12} /></button>
              <button onClick={() => setEditIdx(null)} className="w-6 h-6 rounded-md text-gray-400 flex items-center justify-center"><X size={12} /></button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{w}</span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  className={cn('w-6 h-6 rounded-md flex items-center justify-center', i === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700')}>
                  <ChevronUp size={12} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === weeks.length - 1}
                  className={cn('w-6 h-6 rounded-md flex items-center justify-center', i === weeks.length - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700')}>
                  <ChevronDown size={12} />
                </button>
                <button onClick={() => { setEditIdx(i); setEditVal(w) }} className="w-6 h-6 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"><Pencil size={11} /></button>
                <button onClick={() => remove(i)} className="w-6 h-6 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center justify-center"><Trash2 size={11} /></button>
              </div>
            </>
          )}
        </div>
      ))}
      {adding ? (
        <div className="flex gap-2">
          <input autoFocus value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="es. Week 1, Deload, Peak..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none" />
          <button onClick={add} className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center"><Check size={14} /></button>
          <button onClick={() => setAdding(false)} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Plus size={14} /> Aggiungi week
        </button>
      )}
    </div>
  )
}

// ── Plan card (espandibile: weeks + schede) ──────────────────────────────────
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
  const [eStart, setEStart] = useState(plan.startDate ?? '')
  const [eEnd, setEEnd]     = useState(plan.endDate ?? '')
  const [eWeeks, setEWeeks] = useState<string[]>(parseWeeks(plan.weeks))
  const [savingP, setSavingP] = useState(false)

  const weeks = parseWeeks(plan.weeks)

  const loadTemplates = useCallback(async () => {
    setLoadingT(true)
    const r = await fetch(`/api/workout-templates?planId=${plan.id}`)
    setTemplates(await r.json())
    setLoadingT(false)
  }, [plan.id])

  useEffect(() => { if (expanded) loadTemplates() }, [expanded, loadTemplates])

  async function savePlanEdit() {
    setSavingP(true)
    await fetch(`/api/workout-plans/${plan.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: eName, startDate: eStart, endDate: eEnd, weeks: eWeeks }),
    })
    setSavingP(false); setEditing(false); onChanged()
  }

  async function createScheda() {
    if (!schedaName.trim()) return
    setSavingS(true)
    await fetch('/api/workout-templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: plan.id, userId, name: schedaName }),
    })
    setSchedaName(''); setShowNewScheda(false); setSavingS(false); loadTemplates()
  }

  async function setCorrente() {
    await fetch(`/api/workout-plans/${plan.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !plan.isActive }),
    })
    onChanged()
  }
  async function duplicate() {
    await fetch(`/api/workout-plans/${plan.id}/duplicate`, { method: 'POST' })
    onChanged()
  }
  async function del() {
    if (!confirm('Eliminare questo piano e tutte le sue schede?')) return
    await fetch(`/api/workout-plans/${plan.id}`, { method: 'DELETE' })
    onChanged()
  }

  const sL = fmtDate(plan.startDate)
  const eL = fmtDate(plan.endDate)

  return (
    <div className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
      plan.isActive ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-800')}>
      <div className="flex items-start gap-3 px-4 py-3">
        <button onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{plan.name}</p>
            {plan.isActive && (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                style={{ backgroundColor: CT + '22', color: CT }}>
                Corrente
              </span>
            )}
          </div>
          {(sL || eL) && (
            <div className="mt-1 text-xs text-gray-400 leading-tight">
              {sL && <p>{sL}</p>}
              {eL && <p>{eL}</p>}
            </div>
          )}
          {weeks.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{weeks.length} week · {weeks.join(', ')}</p>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <PlanMenu isActive={!!plan.isActive}
            onCorrente={setCorrente}
            onEdit={() => { setEditing(true); setExpanded(true); setEName(plan.name); setEStart(plan.startDate ?? ''); setEEnd(plan.endDate ?? ''); setEWeeks(parseWeeks(plan.weeks)) }}
            onDuplicate={duplicate}
            onDelete={del} />
          <button onClick={() => setExpanded(o => !o)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {editing ? (
            <div className="p-4 space-y-3">
              <input value={eName} onChange={e => setEName(e.target.value)} placeholder="Nome piano"
                className={inp} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Inizio</label>
                  <input type="date" value={eStart} onChange={e => setEStart(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Fine</label>
                  <input type="date" value={eEnd} onChange={e => setEEnd(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Week del programma</p>
                <WeeksEditor weeks={eWeeks} onChange={setEWeeks} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">Annulla</button>
                <button onClick={savePlanEdit} disabled={savingP || !eName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: CT }}>
                  {savingP ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salva
                </button>
              </div>
            </div>
          ) : (
            <>
              {weeks.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Week</p>
                  <div className="flex flex-wrap gap-1.5">
                    {weeks.map((w, i) => (
                      <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Schede</p>
                  <button onClick={() => setShowNewScheda(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold"
                    style={{ backgroundColor: CT }}>
                    <Plus size={12} /> Scheda
                  </button>
                </div>

                {showNewScheda && (
                  <div className="flex gap-2">
                    <input autoFocus value={schedaName} onChange={e => setSchedaName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createScheda()}
                      placeholder='Nome scheda — es. "Push A"'
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none" />
                    <button onClick={createScheda} disabled={savingS || !schedaName.trim()}
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center disabled:opacity-50" style={{ backgroundColor: CT }}>
                      {savingS ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => setShowNewScheda(false)}
                      className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><X size={14} /></button>
                  </div>
                )}

                {loadingT ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={18} className="animate-spin" style={{ color: CT }} />
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-5">Nessuna scheda. Clicca &ldquo;Scheda&rdquo; per aggiungerne una.</p>
                ) : (
                  templates.map((t, i) => (
                    <WorkoutCard key={t.id} tmpl={t} idx={i} total={templates.length} userId={userId} onRefresh={loadTemplates} />
                  ))
                )}
              </div>
            </>
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

  const [showNew, setShowNew] = useState(false)
  const [nName, setNName]     = useState('')
  const [nStart, setNStart]   = useState('')
  const [nEnd, setNEnd]       = useState('')
  const [nWeeks, setNWeeks]   = useState<string[]>([])
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await fetch('/api/user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: userProfile.name }),
      })
      const r = await fetch(`/api/workout-plans?userId=${userId}`)
      const all: Plan[] = await r.json()
      setPlans(all.filter(p => p.name !== '__default__'))
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [userId, userProfile.name])

  useEffect(() => { load() }, [load])

  function resetNew() { setNName(''); setNStart(''); setNEnd(''); setNWeeks([]) }

  async function createPlan() {
    if (!nName.trim()) return
    setSaving(true)
    await fetch('/api/workout-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: nName, startDate: nStart, endDate: nEnd, weeks: nWeeks }),
    })
    setSaving(false); setShowNew(false); resetNew(); load()
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-6">
      <PageHeader title="Piano Allenamento" accent="training"
        action={
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: CT }}>
            <Plus size={15} /> Nuovo Piano
          </button>
        }
      />

      {showNew && (
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-900 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Nuovo piano allenamento</p>
            <button onClick={() => { setShowNew(false); resetNew() }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-3">
            <input value={nName} onChange={e => setNName(e.target.value)} placeholder="Nome piano (es. Massa, Forza...)" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Inizio</label>
                <input type="date" value={nStart} onChange={e => setNStart(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fine</label>
                <input type="date" value={nEnd} onChange={e => setNEnd(e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Week del programma</p>
              <WeeksEditor weeks={nWeeks} onChange={setNWeeks} />
            </div>
            <button onClick={createPlan} disabled={saving || !nName.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: CT }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Crea piano
            </button>
            <p className="text-[11px] text-gray-400 text-center">
              Dopo aver creato il piano potrai aggiungere le schede e gli esercizi.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CT, borderTopColor: 'transparent' }} />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-gray-500">Nessun piano</p>
          <p className="text-xs text-gray-400 mt-1">Clicca &ldquo;Nuovo Piano&rdquo; per iniziare</p>
        </div>
      ) : (
        plans.map(p => (
          <PlanCard key={p.id} plan={p} userId={userId} onChanged={load} />
        ))
      )}
    </div>
  )
}
