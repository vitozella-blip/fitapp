'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Check, X, MoreVertical, Trash2, Pencil, Copy, ChevronUp, ChevronDown, CalendarDays } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const MEALS = ['Colazione', 'Pranzo', 'Spuntino', 'Cena']
const TOTALE_KEY = '__TOTALE__'

const FCOL = { fat: '#5b9bd5', carbs: '#f0aa78', protein: '#9d8fcc', kcal: '#6abf6a' }
const NOTE_COLORS: (string | null)[] = [FCOL.fat, FCOL.carbs, FCOL.protein, null]

// ── Plan-level notes (named + colored) ────────────────────────────────────────
type PlanNote = { label: string; color: string | null; text: string }

const PLAN_NOTE_PALETTE = [
  { color: FCOL.fat,     label: 'G' },
  { color: FCOL.carbs,   label: 'C' },
  { color: FCOL.protein, label: 'P' },
  { color: FCOL.kcal,    label: 'K' },
  { color: null,         label: '—' },
]

function parsePlanNotes(raw: string | undefined | null): PlanNote[] {
  if (!raw) return []
  try {
    const a = JSON.parse(raw)
    if (Array.isArray(a)) return a as PlanNote[]
  } catch {}
  return raw.trim() ? [{ label: '', color: null, text: raw }] : []
}

function stringifyPlanNotes(notes: PlanNote[]): string {
  const filled = notes.filter(n => n.text.trim())
  return filled.length ? JSON.stringify(filled) : ''
}

// ── Other types ────────────────────────────────────────────────────────────────
type Target = {
  id?: string; meal: string; calories: number; protein: number; carbs: number; fat: number
  notes?: string | string[] | null
}
type Plan = {
  id: string; name: string; startDate?: string; endDate?: string; notes?: string
  isActive: boolean; targets: Target[]
}
type CellTargets = Record<string, { calories: string; protein: string; carbs: string; fat: string; notes: string[] }>

function parseNotes(n: Target['notes']): string[] {
  if (Array.isArray(n)) return [...n, '', '', '', ''].slice(0, 4)
  if (typeof n === 'string' && n.trim()) {
    try { const a = JSON.parse(n); if (Array.isArray(a)) return [...a, '', '', '', ''].slice(0, 4) } catch {}
  }
  return ['', '', '', '']
}

function emptyTargets(): CellTargets {
  return Object.fromEntries(
    [TOTALE_KEY, ...MEALS].map(m => [m, { calories: '', protein: '', carbs: '', fat: '', notes: ['', '', '', ''] }])
  )
}

function planToCells(targets: Target[]): CellTargets {
  const r = emptyTargets()
  targets.forEach(t => {
    r[t.meal] = {
      calories: String(t.calories ?? ''), protein: String(t.protein ?? ''),
      carbs: String(t.carbs ?? ''), fat: String(t.fat ?? ''), notes: parseNotes(t.notes),
    }
  })
  return r
}

const toNum = (ct: CellTargets) =>
  Object.fromEntries(Object.entries(ct).map(([m, t]) => [m, {
    calories: Number(t.calories) || 0, protein: Number(t.protein) || 0,
    carbs: Number(t.carbs) || 0, fat: Number(t.fat) || 0, notes: t.notes,
  }]))

const fmtDate = (d?: string) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

function getDailyTotal(targets: Target[]) {
  const tot = targets.find(t => t.meal === TOTALE_KEY)
  if (tot && (tot.calories > 0 || tot.protein > 0 || tot.carbs > 0 || tot.fat > 0)) return tot
  const ms = targets.filter(t => t.meal !== TOTALE_KEY)
  const s = ms.reduce((a, t) => ({
    meal: TOTALE_KEY, calories: a.calories + t.calories, protein: a.protein + t.protein,
    carbs: a.carbs + t.carbs, fat: a.fat + t.fat,
  }), { meal: TOTALE_KEY, calories: 0, protein: 0, carbs: 0, fat: 0 })
  return (s.calories || s.protein || s.carbs || s.fat) ? s : null
}

// ── Daily totals ───────────────────────────────────────────────────────────────
function DailyTotals({ data, onChange, readOnly }: {
  data: { calories: string; protein: string; carbs: string; fat: string }
  onChange: (f: string, v: string) => void
  readOnly?: boolean
}) {
  const fields = [
    { k: 'calories', label: 'Kcal', color: FCOL.kcal },
    { k: 'fat',      label: 'G',    color: FCOL.fat },
    { k: 'carbs',    label: 'C',    color: FCOL.carbs },
    { k: 'protein',  label: 'P',    color: FCOL.protein },
  ]
  return (
    <div className="px-4 py-3.5 bg-orange-50/70 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900/40">
      <div className="grid grid-cols-4 gap-2">
        {fields.map(f => (
          <div key={f.k} className="text-center">
            <p className="text-[11px] font-bold mb-1" style={{ color: f.color }}>{f.label}</p>
            {readOnly ? (
              <p className="text-xl font-extrabold" style={{ color: f.color }}>
                {data[f.k as keyof typeof data] || '—'}
              </p>
            ) : (
              <input type="number" inputMode="numeric" value={data[f.k as keyof typeof data]}
                onChange={e => onChange(f.k, e.target.value)}
                className="w-full px-1 py-1.5 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 text-lg font-extrabold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 text-center" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Single meal block ──────────────────────────────────────────────────────────
function MealBlock({ meal, data, onChange, readOnly }: {
  meal: string
  data: { calories: string; protein: string; carbs: string; fat: string; notes: string[] }
  onChange: (patch: Partial<{ calories: string; protein: string; carbs: string; fat: string }>, notes?: string[]) => void
  readOnly?: boolean
}) {
  const macros = [
    { k: 'fat',     label: 'G', color: FCOL.fat },
    { k: 'carbs',   label: 'C', color: FCOL.carbs },
    { k: 'protein', label: 'P', color: FCOL.protein },
  ]
  function setNote(i: number, v: string) {
    const n = [...data.notes]; n[i] = v; onChange({}, n)
  }
  return (
    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{meal}</p>
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        {macros.map(m => (
          <div key={m.k}>
            <p className="text-[10px] font-bold mb-1" style={{ color: m.color }}>{m.label}</p>
            {readOnly ? (
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{data[m.k as 'fat'] || '—'}</p>
            ) : (
              <input type="number" inputMode="numeric" value={data[m.k as 'fat']}
                onChange={e => onChange({ [m.k]: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 text-center" />
            )}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {NOTE_COLORS.map((col, i) => {
          const val = data.notes[i] ?? ''
          if (readOnly) {
            return val ? (
              <p key={i} className="text-xs leading-snug pl-2 border-l-2"
                style={{ borderColor: col ?? '#d1d5db', color: col ?? undefined }}>
                {val}
              </p>
            ) : null
          }
          return (
            <textarea key={i} value={val} onChange={e => setNote(i, e.target.value)} rows={1}
              placeholder="Nota..."
              className="w-full px-2.5 py-1.5 rounded-lg border-l-[3px] border-y border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 outline-none resize-y min-h-[34px]"
              style={{ borderLeftColor: col ?? '#9ca3af' }} />
          )
        })}
      </div>
    </div>
  )
}

// ── Plan notes editor ──────────────────────────────────────────────────────────
function PlanNotesEditor({ notes, onChange }: {
  notes: PlanNote[]
  onChange: (notes: PlanNote[]) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  function toggleCollapse(i: number) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }
  function update(i: number, patch: Partial<PlanNote>) {
    onChange(notes.map((n, idx) => idx === i ? { ...n, ...patch } : n))
  }
  function remove(i: number) {
    setCollapsed(prev => {
      const next = new Set<number>()
      prev.forEach(v => { if (v < i) next.add(v); else if (v > i) next.add(v - 1) })
      return next
    })
    onChange(notes.filter((_, idx) => idx !== i))
  }
  function add() { onChange([...notes, { label: '', color: null, text: '' }]) }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= notes.length) return
    setCollapsed(prev => {
      const next = new Set<number>()
      prev.forEach(v => {
        if (v === i) next.add(j)
        else if (v === j) next.add(i)
        else next.add(v)
      })
      return next
    })
    const next = [...notes]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {notes.map((note, i) => {
        const isCollapsed = collapsed.has(i)
        return (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{ borderLeftColor: note.color ?? '#9ca3af', borderLeftWidth: 3 }}>
          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <button onClick={() => toggleCollapse(i)} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronDown size={14} className={cn('transition-transform', isCollapsed && '-rotate-90')} />
            </button>
            <input
              value={note.label}
              onChange={e => update(i, { label: e.target.value })}
              placeholder="Nome nota (es. Carboidrati)"
              className="flex-1 text-xs font-semibold bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
            />
            <div className="flex items-center gap-1 shrink-0">
              {PLAN_NOTE_PALETTE.map((p, pi) => (
                <button key={pi}
                  onClick={() => update(i, { color: p.color })}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: p.color ?? '#9ca3af',
                    borderColor: note.color === p.color ? '#1f2937' : 'transparent',
                  }}
                  title={p.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="w-6 h-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronUp size={13} />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === notes.length - 1}
                className="w-6 h-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronDown size={13} />
              </button>
            </div>
            <button onClick={() => remove(i)}
              className="w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
              <X size={12} />
            </button>
          </div>
          {/* Text area — hidden when collapsed */}
          {!isCollapsed && (
            <textarea
              value={note.text}
              onChange={e => update(i, { text: e.target.value })}
              placeholder="Contenuto della nota..."
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none resize-y"
            />
          )}
        </div>
        )
      })}
      <button onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 transition-colors">
        <Plus size={14} /> Aggiungi nota
      </button>
    </div>
  )
}

// ── Plan notes read view ───────────────────────────────────────────────────────
function PlanNotesView({ notes }: { notes: PlanNote[] }) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  if (notes.length === 0) return <p className="text-sm text-gray-400 italic">Nessuna nota</p>

  function toggle(i: number) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {notes.map((note, i) => {
        const isCollapsed = collapsed.has(i)
        return (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
            style={{ borderLeftColor: note.color ?? '#d1d5db', borderLeftWidth: 3 }}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
              <ChevronDown size={13} className={cn('shrink-0 transition-transform text-gray-400', isCollapsed && '-rotate-90')} />
              <span className="flex-1 text-xs font-bold uppercase tracking-wide"
                style={{ color: note.color ?? '#9ca3af' }}>
                {note.label || 'Nota'}
              </span>
            </button>
            {!isCollapsed && (
              <div className="px-4 pb-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {note.text}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 3-dot dropdown menu ────────────────────────────────────────────────────────
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
            className={cn(item, 'hover:bg-gray-50 dark:hover:bg-gray-800', isActive ? 'text-orange-500 font-semibold' : 'text-gray-700 dark:text-gray-300')}>
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

export default function FoodPlanPage() {
  const { userId, setUserProfile, userProfile } = useAppStore()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const [showNew, setShowNew] = useState(false)
  const [fName, setFName] = useState('')
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  const [fPlanNotes, setFPlanNotes] = useState<PlanNote[]>([])
  const [fCells, setFCells] = useState<CellTargets>(emptyTargets())
  const [saving, setSaving] = useState(false)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/mealplan?userId=${userId}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setPlans(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e); setPlans([]) }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  function setCellMacro(meal: string, patch: Partial<{ calories: string; protein: string; carbs: string; fat: string }>, notes?: string[]) {
    setFCells(prev => ({ ...prev, [meal]: { ...prev[meal], ...patch, ...(notes ? { notes } : {}) } }))
  }
  function resetForm() {
    setFName(''); setFStart(''); setFEnd(''); setFPlanNotes([]); setFCells(emptyTargets())
  }
  function openEdit(p: Plan) {
    setEditing(p.id); setExpanded(p.id)
    setFName(p.name); setFStart(p.startDate ?? ''); setFEnd(p.endDate ?? '')
    setFPlanNotes(parsePlanNotes(p.notes))
    setFCells(planToCells(p.targets))
  }
  function cancelEdit() { setEditing(null); resetForm() }

  async function syncRecap(targets: Target[]) {
    const dt = getDailyTotal(targets)
    if (!dt) return
    setUserProfile({ targetCalories: dt.calories, targetProtein: dt.protein, targetCarbs: dt.carbs, targetFat: dt.fat })
    await fetch('/api/user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, name: userProfile.name,
        targetCalories: dt.calories, targetProtein: dt.protein, targetCarbs: dt.carbs, targetFat: dt.fat,
      }),
    })
  }

  async function handleCreate() {
    if (!fName.trim()) return
    setSaving(true)
    const r = await fetch('/api/mealplan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: fName, startDate: fStart, endDate: fEnd, notes: stringifyPlanNotes(fPlanNotes), targets: toNum(fCells) }),
    })
    const np = await r.json()
    setPlans(p => [np, ...p])
    setExpanded(np.id); setSaving(false); setShowNew(false); resetForm()
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    const r = await fetch(`/api/mealplan/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fName, startDate: fStart, endDate: fEnd, notes: stringifyPlanNotes(fPlanNotes), targets: toNum(fCells) }),
    })
    const up: Plan = await r.json()
    setPlans(p => p.map(x => x.id === id ? up : x))
    if (up.isActive) await syncRecap(up.targets)
    setSaving(false); setEditing(null); resetForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo piano?')) return
    await fetch(`/api/mealplan/${id}`, { method: 'DELETE' })
    setPlans(p => p.filter(x => x.id !== id))
    if (expanded === id) setExpanded(null)
  }

  async function handleDuplicate(id: string) {
    const r = await fetch(`/api/mealplan/${id}/duplicate`, { method: 'POST' })
    const np = await r.json()
    if (np?.id) setPlans(p => [np, ...p])
  }

  async function setCorrente(plan: Plan) {
    const next = !plan.isActive
    await fetch(`/api/mealplan/${plan.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: next }),
    })
    setPlans(p => p.map(x => ({ ...x, isActive: x.id === plan.id ? next : false })))
    if (next) await syncRecap(plan.targets)
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-4">
      <PageHeader title="Piano Alimentare" icon={CalendarDays} accent="food"
        action={
          <button onClick={() => { setShowNew(true); setExpanded(null); setEditing(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold transition-colors">
            <Plus size={15} /> Nuovo
          </button>
        }
      />

      {showNew && (
        <div className="bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-900 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Nuovo piano alimentare</p>
            <button onClick={() => { setShowNew(false); resetForm() }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-3">
            <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Nome piano (es. Bulk, Cut...)"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Inizio</label>
                <input type="date" value={fStart} onChange={e => setFStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fine</label>
                <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800">
            <DailyTotals data={fCells[TOTALE_KEY]} onChange={(f, v) => setCellMacro(TOTALE_KEY, { [f]: v })} />
            {MEALS.map(m => (
              <MealBlock key={m} meal={m} data={fCells[m]}
                onChange={(patch, notes) => setCellMacro(m, patch, notes)} />
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Note piano</p>
            <PlanNotesEditor notes={fPlanNotes} onChange={setFPlanNotes} />
            <button onClick={handleCreate} disabled={saving || !fName.trim()}
              className="w-full py-3 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
              Salva piano
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-500 font-medium">Nessun piano alimentare</p>
          <p className="text-sm text-gray-400 mt-1">Clicca &ldquo;Nuovo&rdquo; per crearne uno</p>
        </div>
      ) : (
        plans.map(plan => {
          const isEditing = editing === plan.id
          const isExpanded = expanded === plan.id
          const sL = fmtDate(plan.startDate)
          const eL = fmtDate(plan.endDate)
          const dt = getDailyTotal(plan.targets)
          return (
            <div key={plan.id} className={cn('bg-white dark:bg-gray-900 border rounded-2xl transition-colors',
              plan.isActive ? 'border-orange-300 dark:border-orange-700' : 'border-gray-200 dark:border-gray-800')}>
              <div className="flex items-start gap-3 px-4 py-3">
                <button onClick={() => setExpanded(isExpanded ? null : plan.id)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{plan.name}</p>
                  </div>
                  {(sL || eL) && <p className="mt-1 text-xs text-gray-400">{sL ?? '–'} – {eL ?? '–'}</p>}
                  {dt && (
                    <p className="text-xs mt-1">
                      <span style={{ color: FCOL.fat }}>G {dt.fat}</span>
                      <span className="text-gray-300 dark:text-gray-600"> · </span>
                      <span style={{ color: FCOL.carbs }}>C {dt.carbs}</span>
                      <span className="text-gray-300 dark:text-gray-600"> · </span>
                      <span style={{ color: FCOL.protein }}>P {dt.protein}</span>
                      {dt.calories > 0 && <span className="text-gray-400"> · {dt.calories} kcal</span>}
                    </p>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <PlanMenu isActive={plan.isActive}
                    onCorrente={() => setCorrente(plan)}
                    onEdit={() => isEditing ? cancelEdit() : openEdit(plan)}
                    onDuplicate={() => handleDuplicate(plan.id)}
                    onDelete={() => handleDelete(plan.id)} />
                </div>
              </div>

              {isExpanded && (
                <>
                  {isEditing && (
                    <div className="px-4 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Nome piano"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Inizio</label>
                          <input type="date" value={fStart} onChange={e => setFStart(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Fine</label>
                          <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {(() => {
                      const tt = plan.targets.find(t => t.meal === TOTALE_KEY)
                      const d = isEditing ? fCells[TOTALE_KEY]
                        : { calories: String(tt?.calories ?? (dt?.calories ?? 0)), protein: String(tt?.protein ?? (dt?.protein ?? 0)), carbs: String(tt?.carbs ?? (dt?.carbs ?? 0)), fat: String(tt?.fat ?? (dt?.fat ?? 0)) }
                      return <DailyTotals data={d} onChange={(f, v) => setCellMacro(TOTALE_KEY, { [f]: v })} readOnly={!isEditing} />
                    })()}
                    {MEALS.map(meal => {
                      const t = plan.targets.find(x => x.meal === meal) ?? { meal, calories: 0, protein: 0, carbs: 0, fat: 0, notes: [] }
                      const d = isEditing ? fCells[meal]
                        : { calories: String(t.calories), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat), notes: parseNotes(t.notes) }
                      return <MealBlock key={meal} meal={meal} data={d}
                        onChange={(patch, notes) => setCellMacro(meal, patch, notes)} readOnly={!isEditing} />
                    })}
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Note piano</p>
                    {isEditing ? (
                      <PlanNotesEditor notes={fPlanNotes} onChange={setFPlanNotes} />
                    ) : (
                      <PlanNotesView notes={parsePlanNotes(plan.notes)} />
                    )}
                  </div>

                  {isEditing && (
                    <div className="px-4 pb-4 flex gap-2">
                      <button onClick={cancelEdit}
                        className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm transition-colors">
                        Annulla
                      </button>
                      <button onClick={() => handleSaveEdit(plan.id)} disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                        Salva
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
