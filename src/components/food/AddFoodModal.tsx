'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Plus, Star, ChevronDown, Trash2, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Food = { id: string; name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number }
type Category = { id: string; name: string }
type CartItem = { food: Food; qty: string }
type Props = { meal: string; date: string; onClose: () => void; onAdded: () => void; isFree?: boolean; onFreeMeal?: () => void }

const calcMacro = (val: number, qty: string) => Math.round((val * Number(qty)) / 100)

export function AddFoodModal({ meal, date, onClose, onAdded, isFree, onFreeMeal }: Props) {
  const userId = useAppStore((s) => s.userId)
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [favFilter, setFavFilter] = useState(false)
  const [catFilter, setCatFilter] = useState('')
  const allFoodsRef = useRef<Food[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/categories?userId=${userId}`).then(r => r.json()),
      fetch(`/api/favorites?userId=${userId}`).then(r => r.json()),
    ]).then(([cats, favs]) => {
      setCategories(Array.isArray(cats) ? cats : [])
      setFavorites(new Set(Array.isArray(favs) ? favs : []))
    })
  }, [userId])

  // Pre-load first 100 foods on mount for instant display when no query typed
  useEffect(() => {
    fetch(`/api/food?q=&userId=${userId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) { allFoodsRef.current = data; setResults(data); setSearched(true) } })
      .catch(() => {})
  }, [userId])

  // Unified search: server-side when query typed (searches full DB), local cache otherwise
  useEffect(() => {
    const trim = q.trim()
    const hasFilter = favFilter || !!catFilter

    if (!trim && !hasFilter) {
      setResults(allFoodsRef.current)
      return
    }

    // With query: debounced server-side search so foods beyond the first 100 are found
    const delay = trim ? 300 : 0
    const timeout = setTimeout(() => {
      setSearching(true)
      const p = new URLSearchParams({
        userId,
        ...(trim ? { q: trim, limit: '300' } : {}),
        ...(catFilter ? { categoryId: catFilter } : {}),
        ...(favFilter ? { fav: '1' } : {}),
      })
      fetch(`/api/food?${p}`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setResults(data); setSearched(true) })
        .catch(() => {})
        .finally(() => setSearching(false))
    }, delay)

    return () => clearTimeout(timeout)
  }, [q, userId, favFilter, catFilter])

  const displayResults = useMemo(() => {
    const hasFilter = favFilter || !!catFilter
    if (!q.trim() && !hasFilter) return []
    return results
  }, [results, q, favFilter, catFilter])

  function addToCart() {
    if (!selected || !qty.trim()) return
    setCart(prev => [...prev, { food: selected, qty }])
    setSelected(null)
    setQty('')
    setQ('')
    // keep pre-loaded results so instant filter works immediately for the next item
  }

  function removeFromCart(i: number) {
    setCart(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (cart.length === 0) return
    setSaving(true)
    try {
      await Promise.all(cart.map(item =>
        fetch('/api/diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, date, meal, foodId: item.food.id, quantity: Number(item.qty) }),
        })
      ))
      onAdded(); onClose()
    } catch { /* keep modal open on error */ }
    setSaving(false)
  }

  function goToCreate() {
    onClose()
    router.push(`/food/database?q=${encodeURIComponent(q)}&new=1`)
  }

  const hasFilter = favFilter || !!catFilter
  const showResults = !selected && displayResults.length > 0
  const showEmpty = !selected && searched && displayResults.length === 0 && (q.length >= 2 || hasFilter)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md h-[88vh] flex flex-col p-5 shadow-xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-8" />
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex-1 text-center">Aggiungi a {meal}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0"><X size={16} /></button>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="mb-3 space-y-1">
            {cart.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40">
                <p className="flex-1 text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{item.food.name}</p>
                <span className="text-xs text-gray-400 shrink-0">{item.qty}g</span>
                <button onClick={() => removeFromCart(i)} className="text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search + preferiti */}
        {!selected && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                {searching
                  ? <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 animate-spin" />
                  : <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSelected(null) }}
                  placeholder="Cerca alimento o marca..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              </div>
              <button
                onClick={() => { setFavFilter(f => !f); setSelected(null) }}
                aria-label="Preferiti"
                className={cn(
                  'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors',
                  favFilter
                    ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950 text-yellow-500'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400'
                )}>
                <Star size={16} fill={favFilter ? 'currentColor' : 'none'} />
              </button>
              {onFreeMeal && (
                <button
                  onClick={() => { onFreeMeal(); onClose() }}
                  aria-label="Pasto libero"
                  className={cn(
                    'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors',
                    isFree
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-400'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400'
                  )}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>🍟</span>
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <div className="relative mb-3">
                <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setSelected(null) }}
                  className="w-full appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 outline-none">
                  <option value="">Tutte le categorie</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </>
        )}

        {/* Results */}
        {showResults && (
          <div className="flex-1 overflow-y-auto space-y-0.5 mb-3">
            {displayResults.map(f => (
              <button key={f.id} onClick={() => setSelected(f)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">{f.name}{f.brand && <span className="text-gray-400 font-normal"> — {f.brand}</span>}</p>
                  {favorites.has(f.id) && <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span style={{ color: '#6abf6a' }}><span className="font-semibold">{f.calories}</span> kcal</span>{' · '}
                  <span style={{ color: '#5b9bd5' }}>G <span className="font-semibold">{f.fat}</span> g</span>{' · '}
                  <span style={{ color: '#f0aa78' }}>C <span className="font-semibold">{f.carbs}</span> g</span>{' · '}
                  <span style={{ color: '#9d8fcc' }}>P <span className="font-semibold">{f.protein}</span> g</span>
                  <span className="text-gray-300"> /100g</span>
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 mb-3">
            <p className="text-sm text-gray-400 text-center">
              {q.length >= 2
                ? <>Nessun alimento trovato per <span className="font-semibold text-gray-700 dark:text-gray-300">&ldquo;{q}&rdquo;</span></>
                : 'Nessun alimento trovato'}
            </p>
            {q.length >= 2 && (
              <button onClick={goToCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-500 text-sm font-semibold hover:bg-orange-100 transition-colors">
                <Plus size={16} /> Aggiungi al database
              </button>
            )}
          </div>
        )}


        {/* Selected food */}
        {selected && (
          <div className="space-y-3 mt-1">
            <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={14} />
                </button>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {selected.brand ? `${selected.name} — ${selected.brand}` : selected.name}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { l: 'Kcal', v: qty ? calcMacro(selected.calories, qty) : '—', color: '#6abf6a' },
                  { l: 'G',    v: qty ? `${calcMacro(selected.fat, qty)}g`     : '—', color: '#5b9bd5' },
                  { l: 'C',    v: qty ? `${calcMacro(selected.carbs, qty)}g`   : '—', color: '#f0aa78' },
                  { l: 'P',    v: qty ? `${calcMacro(selected.protein, qty)}g` : '—', color: '#9d8fcc' },
                ].map(m => (
                  <div key={m.l} className="bg-white dark:bg-gray-900 rounded-lg py-1.5">
                    <p className="text-xs text-gray-400">{m.l}</p>
                    <p className="text-sm font-bold" style={{ color: m.color }}>{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 shrink-0">Quantità (g)</label>
              <input autoFocus type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
                placeholder=""
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
            </div>
            <button onClick={addToCart} disabled={!qty.trim()}
              className="w-full py-3 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
              <Plus size={16} /> Aggiungi{cart.length > 0 ? ' altro' : ''}
            </button>
          </div>
        )}

        {/* Save button */}
        {!selected && cart.length > 0 && (
          <button onClick={handleSave} disabled={saving}
            className="mt-2 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6abf6a' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Salva {cart.length} aliment{cart.length === 1 ? 'o' : 'i'}
          </button>
        )}
      </div>
    </div>
  )
}
