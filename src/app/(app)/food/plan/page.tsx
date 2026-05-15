'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Check, X, MoreVertical, ChevronDown, ChevronUp, Trash2, Pencil, Copy } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const MEALS = ['Colazione', 'Pranzo', 'Spuntino', 'Cena']
const TOTALE_KEY = '__TOTALE__'

const FCOL = { fat: '#c4a0d6', carbs: '#f0aa78', protein: '#7dbf7d', kcal: '#9d8fcc' }
// 4 note rows: Grassi, Carboidrati, Proteine, neutro
const NOTE_COLORS: (string | null)[] = [FCOL.fat, FCOL.carbs, FCOL.protein, null]

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

// ── Daily totals (prominent, no label) ────────────────────────────────────────
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

// ── Single meal: macros (G/C/P) + 4 colored note rows ─────────────────────────
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

// ── 3-dot dropdown menu ───────────────────────────────────────────────────────
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
  const [fNotes, setFNotes] = useState('')
  const [fCells, setFCells] = useState<CellTargets>(emptyTargets())
  const [saving, setSaving] = useState(false)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/mealplan?userId=${userId}`)
    setPlans(await r.json())
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  function setCellMacro(meal: string, patch: Partial<{ calories: string; protein: string; carbs: string; fat: string }>, notes?: string[]) {
    setFCells(prev => ({ ...prev, [meal]: { ...prev[meal], ...patch, ...(notes ? { notes } : {}) } }))
  }
  function resetForm() {
    setFName(''); setFStart(''); setFEnd(''); setFNotes(''); setFCells(emptyTargets())
  }
  function openEdit(p: Plan) {
    setEditing(p.id); setExpanded(p.id)
    setFName(p.name); setFStart(p.startDate ?? ''); setFEnd(p.endDate ?? ''); setFNotes(p.notes ?? '')
    setFCells(planToCells(p.targets))
  }
  function cancelEdit() { setEditing(null); resetForm() }

  // push active plan totals to dashboard recap (User table + store)
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
      body: JSON.stringify({ userId, name: fName, startDate: fStart, endDate: fEnd, notes: fNotes, targets: toNum(fCells) }),
    })
    const np = await r.json()
    setPlans(p => [np, ...p])
    setExpanded(np.id); setSaving(false); setShowNew(false); resetForm()
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    const r = await fetch(`/api/mealplan/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fName, startDate: fStart, endDate: fEnd, notes: fNotes, targets: toNum(fCells) }),
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
      <PageHeader title="Piano Alimentare" accent="food"
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
            <div>
              <label className="text-xs text-gray-400 block mb-1">Note piano</label>
              <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={3}
                placeholder="Note libere, strategie..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 resize-none" />
            </div>
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
            <div key={plan.id} className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
              plan.isActive ? 'border-orange-300 dark:border-orange-700' : 'border-gray-200 dark:border-gray-800')}>
              {/* Pill header — no icons */}
              <div className="flex items-start gap-3 px-4 py-3">
                <button onClick={() => setExpanded(isExpanded ? null : plan.id)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{plan.name}</p>
                    {plan.isActive && (
                      <span className="shrink-0 text-[10px] bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
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
                  <button onClick={() => setExpanded(isExpanded ? null : plan.id)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
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
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Note piano</p>
                    {isEditing ? (
                      <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={3}
                        placeholder="Note libere..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 resize-none" />
                    ) : (
                      <p className={cn('text-sm', plan.notes ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic')}>
                        {plan.notes || 'Nessuna nota'}
                      </p>
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
