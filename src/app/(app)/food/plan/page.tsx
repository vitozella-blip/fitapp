'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X, CalendarDays, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']
const TOTALE_KEY = '__TOTALE__'

type Target = { id?: string; meal: string; calories: number; protein: number; carbs: number; fat: number }
type Plan = { id: string; name: string; startDate?: string; endDate?: string; notes?: string; isActive: boolean; targets: Target[] }

type FormTargets = Record<string, { calories: string; protein: string; carbs: string; fat: string }>

function emptyTargets(): FormTargets {
  return Object.fromEntries([...MEALS, TOTALE_KEY].map(m => [m, { calories: '', protein: '', carbs: '', fat: '' }]))
}

function planToFormTargets(targets: Target[]): FormTargets {
  const result = emptyTargets()
  targets.forEach(t => { result[t.meal] = { calories: String(t.calories), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) } })
  return result
}

function MealTargetRow({ meal, data, onChange, readOnly }: {
  meal: string
  data: { calories: string; protein: string; carbs: string; fat: string }
  onChange: (f: string, v: string) => void
  readOnly?: boolean
}) {
  const fields = [
    { k: 'protein', label: 'P', color: 'text-emerald-500' },
    { k: 'carbs',   label: 'C', color: 'text-orange-400' },
    { k: 'fat',     label: 'G', color: 'text-blue-400' },
  ]
  return (
    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{meal}</p>
      <div className="grid grid-cols-3 gap-2">
        {fields.map(f => (
          <div key={f.k}>
            <p className={cn('text-[10px] font-semibold mb-1', f.color)}>{f.label}</p>
            {readOnly ? (
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{data[f.k as keyof typeof data] || '—'}</p>
            ) : (
              <input type="number" value={data[f.k as keyof typeof data]}
                onChange={e => onChange(f.k, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 text-center" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DailyTotalsRow({ data, onChange, readOnly }: {
  data: { calories: string; protein: string; carbs: string; fat: string }
  onChange: (f: string, v: string) => void
  readOnly?: boolean
}) {
  const fields = [
    { k: 'calories', label: 'Kcal', color: 'text-gray-700 dark:text-gray-300' },
    { k: 'protein',  label: 'P',    color: 'text-emerald-500' },
    { k: 'carbs',    label: 'C',    color: 'text-orange-400' },
    { k: 'fat',      label: 'G',    color: 'text-blue-400' },
  ]
  return (
    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 bg-orange-50/60 dark:bg-orange-950/20">
      <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-2">Totali giornalieri</p>
      <div className="grid grid-cols-4 gap-2">
        {fields.map(f => (
          <div key={f.k}>
            <p className={cn('text-[10px] font-semibold mb-1', f.color)}>{f.label}</p>
            {readOnly ? (
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{data[f.k as keyof typeof data] || '—'}</p>
            ) : (
              <input type="number" value={data[f.k as keyof typeof data]}
                onChange={e => onChange(f.k, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 text-center" />
            )}
          </div>
        ))}
      </div>
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
  const [formName, setFormName] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formTargets, setFormTargets] = useState<FormTargets>(emptyTargets())
  const [saving, setSaving] = useState(false)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/mealplan?userId=${userId}`)
    setPlans(await r.json())
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  function updateFormTarget(meal: string, field: string, value: string) {
    setFormTargets(prev => ({ ...prev, [meal]: { ...prev[meal], [field]: value } }))
  }

  function resetForm() {
    setFormName(''); setFormStart(''); setFormEnd(''); setFormNotes(''); setFormTargets(emptyTargets())
  }

  function openEdit(plan: Plan) {
    setEditing(plan.id)
    setFormName(plan.name)
    setFormStart(plan.startDate ?? '')
    setFormEnd(plan.endDate ?? '')
    setFormNotes(plan.notes ?? '')
    setFormTargets(planToFormTargets(plan.targets))
    setExpanded(plan.id)
  }

  function cancelEdit() { setEditing(null); resetForm() }

  const toNumTargets = (ft: FormTargets) =>
    Object.fromEntries(Object.entries(ft).map(([meal, t]) => [meal, {
      calories: Number(t.calories) || 0,
      protein: Number(t.protein) || 0,
      carbs: Number(t.carbs) || 0,
      fat: Number(t.fat) || 0,
    }]))

  async function handleCreate() {
    if (!formName.trim()) return
    setSaving(true)
    const r = await fetch('/api/mealplan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: formName, startDate: formStart, endDate: formEnd, notes: formNotes, targets: toNumTargets(formTargets) }),
    })
    const newPlan = await r.json()
    setPlans(p => [newPlan, ...p])
    setExpanded(newPlan.id)
    setSaving(false)
    setShowNew(false)
    resetForm()
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    const r = await fetch(`/api/mealplan/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, startDate: formStart, endDate: formEnd, notes: formNotes, targets: toNumTargets(formTargets) }),
    })
    const updated = await r.json()
    setPlans(p => p.map(x => x.id === id ? updated : x))
    setSaving(false)
    setEditing(null)
    resetForm()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/mealplan/${id}`, { method: 'DELETE' })
    setPlans(p => p.filter(x => x.id !== id))
    if (expanded === id) setExpanded(null)
  }

  async function toggleActive(plan: Plan) {
    const newActive = !plan.isActive
    await fetch(`/api/mealplan/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newActive }),
    })
    setPlans(p => p.map(x => ({ ...x, isActive: x.id === plan.id ? newActive : false })))
    if (newActive && plan.targets.length > 0) {
      const totaleTarget = plan.targets.find(t => t.meal === TOTALE_KEY)
      const mealTargets = plan.targets.filter(t => t.meal !== TOTALE_KEY)
      const totals = totaleTarget ?? mealTargets.reduce(
        (acc, t) => ({ calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
      setUserProfile({ targetCalories: totals.calories, targetProtein: totals.protein, targetCarbs: totals.carbs, targetFat: totals.fat })
    }
  }

  const formatDate = (d?: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  function getDailyTotal(targets: Target[]) {
    const totale = targets.find(t => t.meal === TOTALE_KEY)
    if (totale && (totale.calories > 0 || totale.protein > 0)) return totale
    const mealTs = targets.filter(t => t.meal !== TOTALE_KEY)
    if (mealTs.length === 0) return null
    const sum = mealTs.reduce(
      (acc, t) => ({ meal: '', calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat }),
      { meal: '', calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    return sum.calories > 0 || sum.protein > 0 ? sum : null
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none pb-2">
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
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome piano (es. Bulk, Cut, Mantenimento...)"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Data inizio</label>
                <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Data fine</label>
                <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target per pasto (P · C · G)</p>
            </div>
            <DailyTotalsRow data={formTargets[TOTALE_KEY]} onChange={(f, v) => updateFormTarget(TOTALE_KEY, f, v)} />
            {MEALS.map(meal => (
              <MealTargetRow key={meal} meal={meal} data={formTargets[meal]} onChange={(f, v) => updateFormTarget(meal, f, v)} />
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Note</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                placeholder="Note libere, indicazioni, strategie..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 resize-none" />
            </div>
            <button onClick={handleCreate} disabled={saving || !formName.trim()}
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
          <CalendarDays size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessun piano alimentare</p>
          <p className="text-sm text-gray-400 mt-1">Clicca &ldquo;Nuovo&rdquo; per crearne uno</p>
        </div>
      ) : (
        plans.map(plan => {
          const isEditing = editing === plan.id
          const isExpanded = expanded === plan.id
          const startLabel = formatDate(plan.startDate)
          const endLabel = formatDate(plan.endDate)
          const dailyTotal = getDailyTotal(plan.targets)

          return (
            <div key={plan.id} className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
              plan.isActive ? 'border-orange-300 dark:border-orange-700' : 'border-gray-200 dark:border-gray-800'
            )}>
              {/* Plan header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setExpanded(isExpanded ? null : plan.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', plan.isActive ? 'bg-orange-50 dark:bg-orange-950' : 'bg-gray-50 dark:bg-gray-800')}>
                    <CalendarDays size={17} className={plan.isActive ? 'text-orange-500' : 'text-gray-400'} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{plan.name}</p>
                      {plan.isActive && <span className="shrink-0 text-[10px] bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-semibold">ATTIVO</span>}
                    </div>
                    {(startLabel || endLabel) && (
                      <p className="text-xs text-gray-400 truncate">{startLabel && endLabel ? `${startLabel} → ${endLabel}` : startLabel || endLabel}</p>
                    )}
                    {dailyTotal && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span style={{ color: '#5a9e5a' }}>P {dailyTotal.protein}</span>
                        {' · '}
                        <span style={{ color: '#e8813a' }}>C {dailyTotal.carbs}</span>
                        {' · '}
                        <span style={{ color: '#9b59b6' }}>G {dailyTotal.fat}</span>
                        {dailyTotal.calories > 0 && <span className="text-gray-400"> · {dailyTotal.calories} kcal</span>}
                      </p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(plan)} title={plan.isActive ? 'Disattiva' : 'Attiva per dashboard'}
                    className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      plan.isActive ? 'text-orange-500 bg-orange-50 dark:bg-orange-950' : 'text-gray-400 hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950'
                    )}>
                    <Zap size={14} />
                  </button>
                  <button onClick={() => isEditing ? cancelEdit() : openEdit(plan)}
                    className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors">
                    {isEditing ? <X size={14} /> : <Pencil size={14} />}
                  </button>
                  <button onClick={() => handleDelete(plan.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setExpanded(isExpanded ? null : plan.id)}
                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <>
                  {isEditing && (
                    <div className="px-4 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome piano"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
                        <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-800">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target per pasto</p>
                      <p className="text-xs text-gray-400">P · C · G</p>
                    </div>
                    {/* Daily totals row */}
                    {(() => {
                      const totaleTarget = plan.targets.find(t => t.meal === TOTALE_KEY)
                      const fd = isEditing
                        ? formTargets[TOTALE_KEY]
                        : { calories: String(totaleTarget?.calories ?? 0), protein: String(totaleTarget?.protein ?? 0), carbs: String(totaleTarget?.carbs ?? 0), fat: String(totaleTarget?.fat ?? 0) }
                      return <DailyTotalsRow data={fd} onChange={(f, v) => updateFormTarget(TOTALE_KEY, f, v)} readOnly={!isEditing} />
                    })()}
                    {MEALS.map(meal => {
                      const t = plan.targets.find(x => x.meal === meal) ?? { meal, calories: 0, protein: 0, carbs: 0, fat: 0 }
                      const fd = isEditing ? formTargets[meal] : { calories: String(t.calories), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) }
                      return <MealTargetRow key={meal} meal={meal} data={fd} onChange={(f, v) => updateFormTarget(meal, f, v)} readOnly={!isEditing} />
                    })}
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Note</p>
                    {isEditing ? (
                      <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                        placeholder="Note libere..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 resize-none" />
                    ) : (
                      <p className={cn('text-sm', plan.notes ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic')}>
                        {plan.notes || 'Nessuna nota'}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="px-4 pb-4">
                      <button onClick={() => handleSaveEdit(plan.id)} disabled={saving}
                        className="w-full py-3 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                        Salva modifiche
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
