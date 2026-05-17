'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ChefHat, Plus, Trash2, Search, X, Loader2, Check, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

const OC = '#fb923c' // orange accent

type Food = { id: string; name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number }
type Ingredient = { localId: string; food: Food; quantityG: number }
type SavedIngredient = { foodId: string; foodName: string; brand?: string; quantityG: number; calories: number; protein: number; carbs: number; fat: number }
type Recipe = { id: string; name: string; createdAt: string; ingredients: SavedIngredient[] }

function calcTotals(ingredients: Ingredient[]) {
  const totalWeight = ingredients.reduce((s, i) => s + i.quantityG, 0)
  const cal  = ingredients.reduce((s, i) => s + i.food.calories * i.quantityG / 100, 0)
  const pro  = ingredients.reduce((s, i) => s + i.food.protein  * i.quantityG / 100, 0)
  const carb = ingredients.reduce((s, i) => s + i.food.carbs    * i.quantityG / 100, 0)
  const fat  = ingredients.reduce((s, i) => s + i.food.fat      * i.quantityG / 100, 0)
  const p100 = totalWeight > 0 ? {
    calories: Math.round(cal  / totalWeight * 100),
    protein:  Math.round(pro  / totalWeight * 1000) / 10,
    carbs:    Math.round(carb / totalWeight * 1000) / 10,
    fat:      Math.round(fat  / totalWeight * 1000) / 10,
  } : null
  return {
    totalWeight: Math.round(totalWeight),
    cal:  Math.round(cal),
    pro:  Math.round(pro  * 10) / 10,
    carb: Math.round(carb * 10) / 10,
    fat:  Math.round(fat  * 10) / 10,
    p100,
  }
}

function calcTotalsFromSaved(ingredients: SavedIngredient[]) {
  const totalWeight = ingredients.reduce((s, i) => s + i.quantityG, 0)
  const cal  = ingredients.reduce((s, i) => s + i.calories * i.quantityG / 100, 0)
  const pro  = ingredients.reduce((s, i) => s + i.protein  * i.quantityG / 100, 0)
  const carb = ingredients.reduce((s, i) => s + i.carbs    * i.quantityG / 100, 0)
  const fat  = ingredients.reduce((s, i) => s + i.fat      * i.quantityG / 100, 0)
  const p100 = totalWeight > 0 ? {
    calories: Math.round(cal  / totalWeight * 100),
    protein:  Math.round(pro  / totalWeight * 1000) / 10,
    carbs:    Math.round(carb / totalWeight * 1000) / 10,
    fat:      Math.round(fat  / totalWeight * 1000) / 10,
  } : null
  return { totalWeight: Math.round(totalWeight), cal: Math.round(cal), pro: Math.round(pro * 10) / 10, carb: Math.round(carb * 10) / 10, fat: Math.round(fat * 10) / 10, p100 }
}

// ── Macros pill row ───────────────────────────────────────────────────────────
function MacroRow({ calories, protein, carbs, fat, label }: { calories: number; protein: number; carbs: number; fat: number; label: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {[
          { l: 'Kcal', v: calories, c: '#6abf6a' },
          { l: 'G',    v: `${fat}g`,     c: '#5b9bd5' },
          { l: 'C',    v: `${carbs}g`,   c: '#f0aa78' },
          { l: 'P',    v: `${protein}g`, c: '#9d8fcc' },
        ].map(m => (
          <span key={m.l} className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
            style={{ backgroundColor: m.c + '18', color: m.c }}>
            {m.l} {m.v}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Food search input ─────────────────────────────────────────────────────────
function FoodSearch({ userId, onSelect }: { userId: string; onSelect: (food: Food) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/food?q=${encodeURIComponent(q)}&userId=${userId}`)
      const data = await r.json()
      setResults(Array.isArray(data) ? data : [])
      setOpen(true)
      setLoading(false)
    }, 300)
  }, [q, userId])

  function select(food: Food) {
    onSelect(food)
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Cerca alimento..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
          {results.map(f => (
            <button key={f.id} onClick={() => select(f)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {f.name}{f.brand ? <span className="font-normal text-gray-400"> — {f.brand}</span> : null}
              </p>
              <p className="text-xs text-gray-400">
                {f.calories} kcal · G {f.fat}g · C {f.carbs}g · P {f.protein}g
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Recipe creation form ──────────────────────────────────────────────────────
function RecipeForm({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [saving, setSaving] = useState(false)

  function addFood(food: Food) {
    setIngredients(prev => [...prev, { localId: crypto.randomUUID(), food, quantityG: 100 }])
  }

  function updateQty(localId: string, val: string) {
    const n = Math.max(0, Number(val) || 0)
    setIngredients(prev => prev.map(i => i.localId === localId ? { ...i, quantityG: n } : i))
  }

  function remove(localId: string) {
    setIngredients(prev => prev.filter(i => i.localId !== localId))
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
        ingredients: ingredients.map(i => ({ foodId: i.food.id, quantityG: i.quantityG })),
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: OC }}>Nuova Ricetta</p>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Name */}
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome ricetta..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-base font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
        />

        {/* Food search */}
        <FoodSearch userId={userId} onSelect={addFood} />

        {/* Ingredient list */}
        {ingredients.length > 0 && (
          <div className="space-y-1.5">
            {ingredients.map(ing => (
              <div key={ing.localId} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0">
                  {ing.food.name}
                  {ing.food.brand && <span className="text-gray-400 font-normal"> — {ing.food.brand}</span>}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    value={ing.quantityG || ''}
                    onChange={e => updateQty(ing.localId, e.target.value)}
                    className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-center text-gray-900 dark:text-gray-100 outline-none"
                    min="0"
                  />
                  <span className="text-xs text-gray-400">g</span>
                </div>
                <button onClick={() => remove(ing.localId)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        {ingredients.length > 0 && (
          <div className="rounded-xl p-3 space-y-2.5" style={{ backgroundColor: OC + '0f' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Peso totale</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{totals.totalWeight} g</p>
            </div>
            <MacroRow label="Totale ricetta" calories={totals.cal} protein={totals.pro} carbs={totals.carb} fat={totals.fat} />
            {totals.p100 && (
              <MacroRow label="Per 100g" calories={totals.p100.calories} protein={totals.p100.protein} carbs={totals.p100.carbs} fat={totals.p100.fat} />
            )}
          </div>
        )}

        {/* Save */}
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: OC }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salva Ricetta
        </button>
      </div>
    </div>
  )
}

// ── Recipe card ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, userId, onDelete }: { recipe: Recipe; userId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const totals = calcTotalsFromSaved(recipe.ingredients)

  async function addToFoods() {
    if (!totals.p100) return
    setAdding(true)
    await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        name: recipe.name,
        brand: 'Ricetta',
        calories: totals.p100.calories,
        protein: totals.p100.protein,
        carbs: totals.p100.carbs,
        fat: totals.p100.fat,
        saturatedFat: 0,
        sugars: 0,
        salt: 0,
      }),
    })
    setAdding(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 3000)
  }

  async function del() {
    if (!confirm('Eliminare questa ricetta?')) return
    await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
    onDelete()
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{recipe.name}</p>
          {totals.p100 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {totals.totalWeight}g totali ·{' '}
              <span style={{ color: '#6abf6a' }}>{totals.p100.calories} kcal</span>
              {' · '}
              <span style={{ color: '#5b9bd5' }}>G {totals.p100.fat}g</span>
              {' · '}
              <span style={{ color: '#f0aa78' }}>C {totals.p100.carbs}g</span>
              {' · '}
              <span style={{ color: '#9d8fcc' }}>P {totals.p100.protein}g</span>
              <span className="text-gray-300"> /100g</span>
            </p>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setOpen(o => !o)} className="w-7 h-7 flex items-center justify-center text-gray-400">
            <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
          <button onClick={del} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-gray-50 dark:border-gray-800">
          {/* Ingredients */}
          <div className="px-4 pt-3 pb-1 space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Ingredienti</p>
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-300 w-4 shrink-0">{i + 1}.</span>
                <p className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {ing.foodName}{ing.brand && ing.brand !== 'Generico' ? <span className="font-normal text-gray-400"> — {ing.brand}</span> : null}
                </p>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">{ing.quantityG}g</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          {totals.p100 && (
            <div className="mx-4 my-3 rounded-xl p-3 space-y-2" style={{ backgroundColor: OC + '0f' }}>
              <MacroRow label="Totale ricetta" calories={totals.cal} protein={totals.pro} carbs={totals.carb} fat={totals.fat} />
              <MacroRow label="Per 100g" calories={totals.p100.calories} protein={totals.p100.protein} carbs={totals.p100.carbs} fat={totals.p100.fat} />
            </div>
          )}

          {/* Add to foods */}
          <div className="px-4 pb-4">
            <button
              onClick={addToFoods}
              disabled={adding || !totals.p100}
              className="w-full py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
              style={added ? { backgroundColor: '#6abf6a18', borderColor: '#6abf6a', color: '#6abf6a' } : { borderColor: OC + '80', color: OC }}>
              {adding ? <Loader2 size={13} className="animate-spin" /> : added ? <Check size={13} /> : null}
              {added ? 'Aggiunto agli alimenti' : 'Aggiungi agli alimenti'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
        <RecipeForm
          userId={userId}
          onSaved={() => { setShowForm(false); load() }}
          onClose={() => setShowForm(false)}
        />
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
          <RecipeCard key={r.id} recipe={r} userId={userId} onDelete={load} />
        ))
      )}
    </div>
  )
}
