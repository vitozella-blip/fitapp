'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ChefHat, Plus, Trash2, Search, X, Loader2, Check, ChevronDown, Pencil } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const OC = '#fb923c'
type Unit = 'g' | 'ml' | 'pz'

// ── Types ─────────────────────────────────────────────────────────────────────
type Food = { id: string; name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number }
type SelectedItem = { food?: Food; name: string; brand?: string; qty?: number; unit: Unit }
type DraftIngredient = { localId: string; foodId?: string; food?: Food; name: string; brand?: string; qty?: number; unit: Unit }
type EditIngredient  = { localId: string; foodId?: string; foodName: string; brand?: string; qty?: number; unit: Unit }
type SavedIngredient = { foodId?: string; foodName: string; brand?: string; qty?: number; unit: Unit; calories: number; protein: number; carbs: number; fat: number }
type Recipe  = { id: string; name: string; createdAt: string; servings: number; ingredients: SavedIngredient[] }
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
  return (
    <div className="flex gap-1.5 flex-wrap justify-center">
      {[
        { l: 'Kcal', v: String(calories), c: '#6abf6a' },
        { l: 'G',    v: `${fat}g`,        c: '#5b9bd5' },
        { l: 'C',    v: `${carbs}g`,      c: '#f0aa78' },
        { l: 'P',    v: `${protein}g`,    c: '#9d8fcc' },
      ].map(m => (
        <span key={m.l}
          className={cn('font-bold rounded-lg', size === 'lg' ? 'text-sm px-2.5 py-1' : 'text-[11px] px-2 py-0.5')}
          style={{ backgroundColor: m.c + '18', color: m.c }}>
          {m.l} {m.v}
        </span>
      ))}
    </div>
  )
}

// ── TotalsBox ─────────────────────────────────────────────────────────────────
function TotalsBox({ totals, servings = 1 }: { totals: Totals; servings?: number }) {
  if (!totals.p100) return null
  const s = Math.max(1, servings)
  const portionWeight = Math.round(totals.totalWeight / s)
  const portion = {
    calories: Math.round(totals.cal / s),
    protein:  Math.round(totals.pro  * 10 / s) / 10,
    carbs:    Math.round(totals.carb * 10 / s) / 10,
    fat:      Math.round(totals.fat  * 10 / s) / 10,
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: OC + '0f' }}>
      <div className="px-3 pt-3 pb-2.5 text-center space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Ricetta completa · {totals.totalWeight}g</p>
        <MacroPills size="sm" calories={totals.cal} protein={totals.pro} carbs={totals.carb} fat={totals.fat} />
      </div>
      <div className="px-3 py-2.5 text-center space-y-1.5 border-t" style={{ borderColor: OC + '20' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
          Per porzione · {portionWeight}g{s > 1 ? ` (${s} porz.)` : ''}
        </p>
        <MacroPills size="sm" calories={portion.calories} protein={portion.protein} carbs={portion.carbs} fat={portion.fat} />
      </div>
      <div className="px-3 py-3 text-center space-y-2 border-t" style={{ borderColor: OC + '20', backgroundColor: OC + '18' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: OC }}>Per 100g</p>
        <MacroPills size="lg" calories={totals.p100.calories} protein={totals.p100.protein} carbs={totals.p100.carbs} fat={totals.p100.fat} />
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
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{ name: string; brand?: string; food?: Food } | null>(null)
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState<Unit>('g')
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setOpen(true) // immediately open to show free-text option
    timer.current = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/food?q=${encodeURIComponent(q)}&userId=${userId}`)
      const data = await r.json()
      setResults(Array.isArray(data) ? data : [])
      setLoading(false)
    }, 300)
  }, [q, userId])

  function pick(food?: Food, freeName?: string) {
    const name = food?.name ?? freeName ?? ''
    setPending({ name, brand: food?.brand, food })
    setQty(''); setUnit('g')
    setQ(''); setResults([]); setOpen(false)
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
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>

      {open && (results.length > 0 || q.trim().length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
          {results.map(f => (
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
  const [name, setName] = useState('')
  const [servings, setServings] = useState('1')
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

  async function save() {
    if (!canSave) return
    setSaving(true)
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, name: name.trim(),
        servings: Math.max(1, Number(servings) || 1),
        ingredients: ingredients.map(i => ({ foodId: i.foodId, name: i.name, qty: i.qty, unit: i.unit })),
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: OC }}>Nuova Ricetta</p>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome ricetta..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-base font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />

        <FoodSearch userId={userId} onSelect={addFood} />

        {ingredients.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            {ingredients.map(ing => (
              <IngredientRow key={ing.localId} name={ing.name} brand={ing.brand} qty={ing.qty} unit={ing.unit}
                onRemove={() => setIngredients(prev => prev.filter(i => i.localId !== ing.localId))} />
            ))}
          </div>
        )}

        {ingredients.length > 0 && <TotalsBox totals={totals} servings={Math.max(1, Number(servings) || 1)} />}

        {ingredients.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Porzioni:</span>
            <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="1"
              className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
          </div>
        )}

        <button onClick={save} disabled={!canSave || saving}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: OC }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salva Ricetta
        </button>
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
  const [saving, setSaving] = useState(false)
  const totals = calcTotalsFromSaved(recipe.ingredients)

  function startEdit() {
    setEditIngredients(recipe.ingredients.map(i => ({
      localId: crypto.randomUUID(),
      foodId: i.foodId, foodName: i.foodName, brand: i.brand,
      qty: i.qty, unit: (i.unit ?? 'g') as Unit,
    })))
    setEditServings(String(recipe.servings ?? 1))
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

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer" onClick={() => { if (!editing) setOpen(o => !o) }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{recipe.name}</p>
          {totals.p100 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {totals.totalWeight}g ·{' '}
              <span style={{ color: '#6abf6a' }}>{totals.p100.calories} kcal</span>{' · '}
              <span style={{ color: '#5b9bd5' }}>G {totals.p100.fat}g</span>{' · '}
              <span style={{ color: '#f0aa78' }}>C {totals.p100.carbs}g</span>{' · '}
              <span style={{ color: '#9d8fcc' }}>P {totals.p100.protein}g</span>
              <span className="text-gray-300"> /100g</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {!editing && <ChevronDown size={14} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />}
          <button onClick={editing ? cancelEdit : startEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={editing ? { color: OC } : { color: '#9ca3af' }}>
            <Pencil size={13} />
          </button>
          <button onClick={del} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

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
              <TotalsBox totals={totals} servings={recipe.servings ?? 1} />
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
