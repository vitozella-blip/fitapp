'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChefHat, Plus, Trash2, Search, X, Loader2, Check, ChevronDown, Pencil, Calendar } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { CalendarModal } from '@/components/shared/DateNav'
import { cn } from '@/lib/utils'

const OC = '#fb923c'
type Unit = 'g' | 'ml' | 'pz'

// ── Types ─────────────────────────────────────────────────────────────────────
type Food = { id: string; name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number }
type SelectedItem = { food?: Food; name: string; brand?: string; qty?: number; unit: Unit }
type DraftIngredient = { localId: string; foodId?: string; food?: Food; name: string; brand?: string; qty?: number; unit: Unit }
type EditIngredient  = { localId: string; foodId?: string; foodName: string; brand?: string; qty?: number; unit: Unit }
type SavedIngredient = { foodId?: string; foodName: string; brand?: string; qty?: number; unit: Unit; calories: number; protein: number; carbs: number; fat: number }
type Recipe  = { id: string; name: string; createdAt: string; servings: number; cookedWeight?: number | null; ingredients: SavedIngredient[] }
type Totals  = { totalWeight: number; cal: number; pro: number; carb: number; fat: number; p100: { calories: number; protein: number; carbs: number; fat: number } | null }

// ── Calc helpers ──────────────────────────────────────────────────────────────
function calcTotals(ingredients: DraftIngredient[]): Totals {
  const weighed = ingredients.filter(i => i.unit !== 'pz' && i.qty != null)
  const totalWeight = weighed.reduce((s, i) => s + i.qty!, 0)
  const dbFoods = weighed.filter(i => i.food)
  const cal  = dbFoods.reduce((s, i) => s + i.food!.calories * i.qty! / 100, 0)
  const pro  = dbFoods.reduce((s, i) => s + i.food!.protein  * i.qty! / 100, 0)
  const carb = dbFoods.reduce((s, i) => s + i.food!.carbs    * i.qty! / 100, 0)
  const fat  = dbFoods.reduce((s, i) => s + i.food!.fat      * i.qty! / 100, 0)
  const p100 = totalWeight > 0 ? {
    calories: Math.round(cal / totalWeight * 100),
    protein:  Math.round(pro  / totalWeight * 1000) / 10,
    carbs:    Math.round(carb / totalWeight * 1000) / 10,
    fat:      Math.round(fat  / totalWeight * 1000) / 10,
  } : null
  return { totalWeight: Math.round(totalWeight), cal: Math.round(cal), pro: Math.round(pro * 10) / 10, carb: Math.round(carb * 10) / 10, fat: Math.round(fat * 10) / 10, p100 }
}

function calcTotalsFromSaved(ingredients: SavedIngredient[]): Totals {
  const weighed = ingredients.filter(i => i.unit !== 'pz' && i.qty != null)
  const totalWeight = weighed.reduce((s, i) => s + i.qty!, 0)
  const dbFoods = weighed.filter(i => i.foodId)
  const cal  = dbFoods.reduce((s, i) => s + i.calories * i.qty! / 100, 0)
  const pro  = dbFoods.reduce((s, i) => s + i.protein  * i.qty! / 100, 0)
  const carb = dbFoods.reduce((s, i) => s + i.carbs    * i.qty! / 100, 0)
  const fat  = dbFoods.reduce((s, i) => s + i.fat      * i.qty! / 100, 0)
  const p100 = totalWeight > 0 ? {
    calories: Math.round(cal / totalWeight * 100),
    protein:  Math.round(pro  / totalWeight * 1000) / 10,
    carbs:    Math.round(carb / totalWeight * 1000) / 10,
    fat:      Math.round(fat  / totalWeight * 1000) / 10,
  } : null
  return { totalWeight: Math.round(totalWeight), cal: Math.round(cal), pro: Math.round(pro * 10) / 10, carb: Math.round(carb * 10) / 10, fat: Math.round(fat * 10) / 10, p100 }
}

// ── MacroPills ────────────────────────────────────────────────────────────────
function MacroPills({ calories, protein, carbs, fat, size = 'sm' }: {
  calories: number; protein: number; carbs: number; fat: number; size?: 'sm' | 'lg'
}) {
  const fs = size === 'lg' ? 'text-sm' : 'text-[11px]'
  const dot = <span className="text-[10px]" style={{ color: '#5c6672' }}>·</span>
  return (
    <div className="flex gap-2 flex-wrap justify-center items-center">
      <span className={cn('font-bold', fs)} style={{ color: '#6abf6a' }}>{calories}</span>
      {dot}
      <span className={cn('font-bold', fs)} style={{ color: '#5b9bd5' }}>{fat}</span>
      {dot}
      <span className={cn('font-bold', fs)} style={{ color: '#f0aa78' }}>{carbs}</span>
      {dot}
      <span className={cn('font-bold', fs)} style={{ color: '#9d8fcc' }}>{protein}</span>
    </div>
  )
}

// ── TotalsBox ─────────────────────────────────────────────────────────────────
function TotalsBox({ totals, servings = 1, cookedWeight }: { totals: Totals; servings?: number; cookedWeight?: number | null }) {
  if (!totals.p100) return null
  const s = Math.max(1, servings)
  const rawPortionG = Math.round(totals.totalWeight / s)
  const cookedPortionG = cookedWeight ? Math.round(cookedWeight / s) : null
  const portion = {
    calories: Math.round(totals.cal / s),
    protein:  Math.round(totals.pro  * 10 / s) / 10,
    carbs:    Math.round(totals.carb * 10 / s) / 10,
    fat:      Math.round(totals.fat  * 10 / s) / 10,
  }
  const p100cooked = cookedWeight ? {
    calories: Math.round(totals.cal / cookedWeight * 100),
    protein:  Math.round(totals.pro  / cookedWeight * 1000) / 10,
    carbs:    Math.round(totals.carb / cookedWeight * 1000) / 10,
    fat:      Math.round(totals.fat  / cookedWeight * 1000) / 10,
  } : null
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: OC + '0f' }}>
      <div className="px-3 pt-3 pb-2.5 text-center space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Totale ricetta</p>
        <MacroPills size="sm" calories={totals.cal} protein={totals.pro} carbs={totals.carb} fat={totals.fat} />
        {cookedWeight && (
          <p className="text-[10px] text-gray-400">
            <span className="font-semibold text-gray-500">{totals.totalWeight}g</span> crudo
            <span className="mx-1.5 text-gray-300">→</span>
            <span className="font-semibold text-gray-500">{cookedWeight}g</span> cotto
          </p>
        )}
      </div>
      <div className="px-3 py-2.5 text-center space-y-1 border-t" style={{ borderColor: OC + '20' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Per porzione ({s})</p>
        <MacroPills size="sm" calories={portion.calories} protein={portion.protein} carbs={portion.carbs} fat={portion.fat} />
        <p className="text-[10px] text-gray-400">
          <span className="font-semibold text-gray-500">{rawPortionG}g</span> crudo
          {cookedPortionG && (
            <><span className="mx-1.5 text-gray-300">·</span><span className="font-semibold text-gray-500">{cookedPortionG}g</span> cotto</>
          )}
        </p>
      </div>
      <div className="px-3 py-3 text-center space-y-2 border-t" style={{ borderColor: OC + '20', backgroundColor: OC + '18' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: OC }}>Per 100g</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-400 w-10 text-right shrink-0">crudo</span>
            <MacroPills size="sm" calories={totals.p100.calories} protein={totals.p100.protein} carbs={totals.p100.carbs} fat={totals.p100.fat} />
          </div>
          {p100cooked && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-400 w-10 text-right shrink-0">cotto</span>
              <MacroPills size="lg" calories={p100cooked.calories} protein={p100cooked.protein} carbs={p100cooked.carbs} fat={p100cooked.fat} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── UnitSelect ────────────────────────────────────────────────────────────────
function UnitSelect({ value, onChange }: { value: Unit; onChange: (v: Unit) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as Unit)}
      className="h-9 px-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 shrink-0 cursor-pointer">
      <option value="g">g</option>
      <option value="ml">ml</option>
      <option value="pz">pz</option>
    </select>
  )
}

// ── FoodSearch ────────────────────────────────────────────────────────────────
function FoodSearch({ userId, onSelect }: { userId: string; onSelect: (item: SelectedItem) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{ name: string; brand?: string; food?: Food } | null>(null)
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState<Unit>('g')
  const ref = useRef<HTMLDivElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    fetch(`/api/food?q=&userId=${userId}&limit=9999`).then(r => r.json()).then(d => { if (Array.isArray(d)) setResults(d) }).catch(() => {})
  }, [userId])

  const displayResults = useMemo(() => {
    if (!q.trim()) return results
    const lower = q.trim().toLowerCase()
    return results.filter(f => f.name.toLowerCase().includes(lower) || (f.brand?.toLowerCase().includes(lower) ?? false))
  }, [results, q])

  useEffect(() => {
    if (q.length < 1) { setOpen(false); return }
    setOpen(true)
  }, [q])

  function pick(food?: Food, freeName?: string) {
    const name = food?.name ?? freeName ?? ''
    setPending({ name, brand: food?.brand, food })
    setQty(''); setUnit('g')
    setQ(''); setOpen(false)
    setTimeout(() => qtyRef.current?.focus(), 50)
  }

  function confirm() {
    if (!pending) return
    const qtyNum = qty ? Math.max(0.01, Number(qty)) : undefined
    onSelect({ food: pending.food, name: pending.name, brand: pending.brand, qty: qtyNum, unit })
    setPending(null); setQty(''); setUnit('g')
  }

  function cancel() { setPending(null); setQty(''); setUnit('g') }

  if (pending) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0">
            {pending.name}
            {pending.brand && <span className="text-gray-400 font-normal"> — {pending.brand}</span>}
          </p>
          <button onClick={cancel} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 shrink-0">
            <X size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input ref={qtyRef} type="number" value={qty} onChange={e => setQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirm()}
            className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
            min="0.01" />
          <UnitSelect value={unit} onChange={setUnit} />
          <button onClick={confirm}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold shrink-0"
            style={{ backgroundColor: OC }}>
            <Plus size={13} /> Aggiungi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca alimento..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
      </div>

      {open && (displayResults.length > 0 || q.trim().length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
          {displayResults.map(f => (
            <button key={f.id} onClick={() => pick(f)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {f.name}{f.brand ? <span className="font-normal text-gray-400"> — {f.brand}</span> : null}
                </p>
                <p className="text-xs text-gray-400">{f.calories} kcal · G {f.fat}g · C {f.carbs}g · P {f.protein}g</p>
              </div>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: OC }}>
                <Plus size={14} />
              </span>
            </button>
          ))}
          {/* Free-text option — always shown when query has 2+ chars */}
          <button onClick={() => pick(undefined, q.trim())}
            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: OC }}>
                Aggiungi &ldquo;{q.trim()}&rdquo;
              </p>
              <p className="text-xs text-gray-400">senza valori nutrizionali</p>
            </div>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: OC + '30', color: OC }}>
              <Plus size={14} />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── IngredientRow ─────────────────────────────────────────────────────────────
function IngredientRow({ name, brand, qty, unit, onQtyChange, onUnitChange, onRemove }: {
  name: string; brand?: string; qty?: number; unit: Unit
  onQtyChange?: (val: string) => void
  onUnitChange?: (val: Unit) => void
  onRemove: () => void
}) {
  const qtyLabel = qty != null ? `${qty} ${unit}` : `— ${unit}`
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0">
        {name}{brand && <span className="text-gray-400 font-normal"> — {brand}</span>}
      </p>
      {onQtyChange ? (
        <>
          <input type="number" value={qty ?? ''} onChange={e => onQtyChange(e.target.value)}
            className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
            min="0.01" />
          <UnitSelect value={unit} onChange={v => onUnitChange?.(v)} />
        </>
      ) : (
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">{qtyLabel}</span>
      )}
      <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0">
        <X size={12} />
      </button>
    </div>
  )
}

// ── RecipeForm ────────────────────────────────────────────────────────────────
function RecipeForm({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [servings, setServings] = useState('1')
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [calOpen, setCalOpen] = useState(false)
  const [cookedWeight, setCookedWeight] = useState('')
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([])
  const [saving, setSaving] = useState(false)

  function addFood(item: SelectedItem) {
    setIngredients(prev => [...prev, {
      localId: crypto.randomUUID(),
      foodId: item.food?.id, food: item.food,
      name: item.name, brand: item.brand,
      qty: item.qty, unit: item.unit,
    }])
  }

  const totals = calcTotals(ingredients)
  const canSave = name.trim() && ingredients.length > 0

  const dateLabel = new Date(createdAt + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

  async function save() {
    if (!canSave) return
    setSaving(true)
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, name: name.trim(),
        servings: Math.max(1, Number(servings) || 1),
        createdAt,
        cookedWeight: cookedWeight ? Number(cookedWeight) : null,
        ingredients: ingredients.map(i => ({ foodId: i.foodId, name: i.name, qty: i.qty, unit: i.unit })),
      }),
    })
    setSaving(false)
    onSaved()
  }

  const Breadcrumb = ({ toStep }: { toStep: 1 | 2 }) => (
    <div className="flex items-center gap-2 mb-1">
      <button onClick={() => setStep(toStep)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">← {name}</button>
      <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
      <span className="text-xs text-gray-400">{dateLabel}</span>
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden" style={{ borderTopColor: OC, borderTopWidth: 3 }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800" style={{ backgroundColor: OC + '14' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: OC }}>Nuova Ricetta</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <X size={12} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {step === 1 && (
          <>
            <div className="flex items-center gap-2">
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome ricetta..."
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-base font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)} />
              <button onClick={() => setCalOpen(true)}
                className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={createdAt}>
                <Calendar size={16} style={{ color: OC }} />
              </button>
            </div>
            {calOpen && (
              <CalendarModal selectedDate={createdAt} onChange={setCreatedAt} onClose={() => setCalOpen(false)} accent={OC} disableWorkoutColors />
            )}
            <button onClick={() => setStep(2)} disabled={!name.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: OC }}>
              Ingredienti
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Breadcrumb toStep={1} />
            <FoodSearch userId={userId} onSelect={addFood} />
            {ingredients.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                {ingredients.map(ing => (
                  <IngredientRow key={ing.localId} name={ing.name} brand={ing.brand} qty={ing.qty} unit={ing.unit}
                    onRemove={() => setIngredients(prev => prev.filter(i => i.localId !== ing.localId))} />
                ))}
              </div>
            )}
            <button onClick={() => setStep(3)} disabled={ingredients.length === 0}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: OC }}>
              Avanti
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <Breadcrumb toStep={1} />
            {ingredients.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                {ingredients.map(ing => (
                  <IngredientRow key={ing.localId} name={ing.name} brand={ing.brand} qty={ing.qty} unit={ing.unit}
                    onRemove={() => setIngredients(prev => prev.filter(i => i.localId !== ing.localId))} />
                ))}
              </div>
            )}
            <button onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Plus size={12} /> Aggiungi ingrediente
            </button>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-20 shrink-0">Porzioni</span>
                <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="1"
                  className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-20 shrink-0">Peso cotto <span className="font-normal">(g)</span></span>
                <input type="number" value={cookedWeight} onChange={e => setCookedWeight(e.target.value)} min="1"
                  placeholder={totals.totalWeight > 0 ? `crudo ${totals.totalWeight}g` : 'opzionale'}
                  className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 placeholder:font-normal placeholder:text-gray-300" />
              </div>
            </div>
            <TotalsBox totals={totals} servings={Math.max(1, Number(servings) || 1)} cookedWeight={cookedWeight ? Number(cookedWeight) : null} />
            <button onClick={save} disabled={!canSave || saving}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: OC }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salva Ricetta
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── RecipeCard ────────────────────────────────────────────────────────────────
function RecipeCard({ recipe, userId, onDelete, onUpdate }: { recipe: Recipe; userId: string; onDelete: () => void; onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editIngredients, setEditIngredients] = useState<EditIngredient[]>([])
  const [editServings, setEditServings] = useState('1')
  const [editCookedWeight, setEditCookedWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const totals = calcTotalsFromSaved(recipe.ingredients)

  function startEdit() {
    setEditIngredients(recipe.ingredients.map(i => ({
      localId: crypto.randomUUID(),
      foodId: i.foodId, foodName: i.foodName, brand: i.brand,
      qty: i.qty, unit: (i.unit ?? 'g') as Unit,
    })))
    setEditServings(String(recipe.servings ?? 1))
    setEditCookedWeight(recipe.cookedWeight ? String(recipe.cookedWeight) : '')
    setEditing(true)
  }
  function cancelEdit() { setEditing(false); setEditIngredients([]) }

  function addEditFood(item: SelectedItem) {
    setEditIngredients(prev => [...prev, {
      localId: crypto.randomUUID(),
      foodId: item.food?.id, foodName: item.name, brand: item.brand,
      qty: item.qty, unit: item.unit,
    }])
  }
  function updateEditQty(localId: string, val: string) {
    setEditIngredients(prev => prev.map(i =>
      i.localId === localId ? { ...i, qty: val ? Math.max(0.01, Number(val)) : undefined } : i
    ))
  }
  function updateEditUnit(localId: string, val: Unit) {
    setEditIngredients(prev => prev.map(i =>
      i.localId === localId ? { ...i, unit: val } : i
    ))
  }

  async function saveEdit() {
    if (editIngredients.length === 0) return
    setSaving(true)
    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servings: Math.max(1, Number(editServings) || 1),
        cookedWeight: editCookedWeight ? Number(editCookedWeight) : null,
        ingredients: editIngredients.map(i => ({ foodId: i.foodId, name: i.foodName, qty: i.qty, unit: i.unit })),
      }),
    })
    setSaving(false)
    if (res.ok) { cancelEdit(); onUpdate() }
  }

  async function del() {
    if (!confirm('Eliminare questa ricetta?')) return
    const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
    if (res.ok) onDelete()
  }

  const rowRef    = useRef<HTMLDivElement>(null)
  const startX    = useRef(0); const startY = useRef(0)
  const currentX  = useRef(0); const snapped = useRef<'left'|'right'|null>(null)
  const dirLocked = useRef<'h'|'v'|null>(null)
  const SNAP = 72; const THRESH = 30
  function snapTo(dir: 'left'|'right'|null) {
    snapped.current = dir; const x = dir === 'left' ? -SNAP : dir === 'right' ? SNAP : 0
    if (rowRef.current) { rowRef.current.style.transition = 'transform 0.2s ease'; rowRef.current.style.transform = `translateX(${x}px)`; setTimeout(() => { if (rowRef.current) rowRef.current.style.transition = '' }, 210) }
    currentX.current = x
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden relative" style={{ borderLeftColor: OC, borderLeftWidth: 3 }}>
      {/* Swipe actions — nascosti quando la card è aperta o in editing */}
      {!editing && !open && <>
        <div className="absolute inset-y-0 left-0 flex items-center justify-center" style={{ width: SNAP, backgroundColor: OC }}
          onClick={() => { snapTo(null); startEdit() }}><Pencil size={18} className="text-white" /></div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: SNAP, backgroundColor: '#ef4444' }}
          onClick={() => { snapTo(null); del() }}><Trash2 size={18} className="text-white" /></div>
      </>}
      <div ref={rowRef} className="relative z-10 bg-white dark:bg-gray-900 touch-pan-y"
        onTouchStart={e => { if (editing) return; startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; dirLocked.current = null; if (rowRef.current) rowRef.current.style.transition = '' }}
        onTouchMove={e => {
          if (editing) return
          const dx = e.touches[0].clientX - startX.current; const dy = Math.abs(e.touches[0].clientY - startY.current)
          if (dirLocked.current === null) { if (Math.abs(dx) < 5 && dy < 5) return; dirLocked.current = Math.abs(dx) >= dy * 3 ? 'h' : 'v' }
          if (dirLocked.current !== 'h') return
          const base = snapped.current === 'left' ? -SNAP : snapped.current === 'right' ? SNAP : 0
          currentX.current = Math.max(-SNAP, Math.min(SNAP, base + dx)); if (rowRef.current) rowRef.current.style.transform = `translateX(${currentX.current}px)`
        }}
        onTouchEnd={() => { if (editing) return; const x = currentX.current; if (x < -THRESH) snapTo('left'); else if (x > THRESH) snapTo('right'); else snapTo(null) }}>
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => { if (snapped.current) { snapTo(null); return }; if (!editing) setOpen(o => !o) }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{recipe.name}</p>
            {recipe.createdAt && (
              <span className="text-[10px] text-gray-400 shrink-0">
                {new Date(recipe.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          {totals.totalWeight > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {totals.totalWeight}g
              <span className="text-gray-400 font-normal">
                {' '}({recipe.servings > 1
                  ? `${recipe.servings} porzioni da ${Math.round(totals.totalWeight / recipe.servings)}g`
                  : '1 porzione'})
              </span>
            </p>
          )}
          {totals.p100 && (
            <p className="text-xs mt-0.5">
              <span style={{ color: '#6abf6a' }}>{totals.p100.calories}</span>
              <span className="text-gray-300"> · </span>
              <span style={{ color: '#5b9bd5' }}>{totals.p100.fat}</span>
              <span className="text-gray-300"> · </span>
              <span style={{ color: '#f0aa78' }}>{totals.p100.carbs}</span>
              <span className="text-gray-300"> · </span>
              <span style={{ color: '#9d8fcc' }}>{totals.p100.protein}</span>
              <span className="text-gray-300"> per 100g</span>
            </p>
          )}
        </div>
        {!editing && (
          <ChevronDown size={14} className={cn('text-gray-400 transition-transform shrink-0 mt-1', open && 'rotate-180')} />
        )}
        {editing && (
          <button onClick={e => { e.stopPropagation(); cancelEdit() }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
            <X size={13} />
          </button>
        )}
      </div>
      </div> {/* end sliding div */}

      {/* Edit mode */}
      {editing && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: OC }}>Modifica ingredienti</p>
            <div className="flex items-center gap-1.5">
              <input type="number" value={editServings} onChange={e => setEditServings(e.target.value)} min="1"
                className="w-10 px-1 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none" />
              <span className="text-xs text-gray-400">porz.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">Peso cotto (g)</span>
            <input type="number" value={editCookedWeight} onChange={e => setEditCookedWeight(e.target.value)} min="1"
              placeholder="opzionale"
              className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 placeholder:font-normal placeholder:text-gray-300" />
          </div>
          {editIngredients.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
              {editIngredients.map(ing => (
                <IngredientRow key={ing.localId} name={ing.foodName} brand={ing.brand} qty={ing.qty} unit={ing.unit}
                  onQtyChange={v => updateEditQty(ing.localId, v)}
                  onUnitChange={v => updateEditUnit(ing.localId, v)}
                  onRemove={() => setEditIngredients(prev => prev.filter(i => i.localId !== ing.localId))} />
              ))}
            </div>
          )}
          <FoodSearch userId={userId} onSelect={addEditFood} />
          <button onClick={saveEdit} disabled={saving || editIngredients.length === 0}
            className="w-full py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ backgroundColor: OC }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Salva modifiche
          </button>
        </div>
      )}

      {/* View mode expanded */}
      {open && !editing && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-4 pt-3 pb-1">Ingredienti</p>
          {recipe.ingredients.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Nessun ingrediente</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="text-[10px] text-gray-300 w-4 shrink-0">{i + 1}.</span>
                  <p className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                    {ing.foodName}{ing.brand && ing.brand !== 'Generico' ? <span className="font-normal text-gray-400"> — {ing.brand}</span> : null}
                  </p>
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                    {ing.qty != null ? `${ing.qty} ${ing.unit ?? 'g'}` : `— ${ing.unit ?? 'g'}`}
                  </span>
                </div>
              ))}
            </div>
          )}
          {totals.p100 && (
            <div className="mx-4 my-3">
              <TotalsBox totals={totals} servings={recipe.servings ?? 1} cookedWeight={recipe.cookedWeight} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── RecipesPage ───────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const userId = useAppStore(s => s.userId)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetch(`/api/recipes?userId=${userId}`).then(r => r.json())
    setRecipes(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-6">
      <PageHeader title="Ricette" icon={ChefHat} accent="food"
        action={
          !showForm ? (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: OC }}>
              <Plus size={15} /> Nuova Ricetta
            </button>
          ) : undefined
        }
      />

      {showForm && (
        <RecipeForm userId={userId} onSaved={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: OC, borderTopColor: 'transparent' }} />
        </div>
      ) : recipes.length === 0 && !showForm ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center">
          <ChefHat size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-500">Nessuna ricetta</p>
          <p className="text-xs text-gray-400 mt-1">Clicca &ldquo;Nuova Ricetta&rdquo; per iniziare</p>
        </div>
      ) : (
        recipes.map(r => (
          <RecipeCard key={r.id} recipe={r} userId={userId} onDelete={load} onUpdate={load} />
        ))
      )}
    </div>
  )
}
