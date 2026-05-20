'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Loader2, Star, ChevronDown, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Food = { id: string; name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number }
type Category = { id: string; name: string }
type CartItem = { food: Food; qty: string }
type Props = { meal: string; date: string; onClose: () => void; onAdded: () => void }

const calcMacro = (val: number, qty: string) => Math.round((val * Number(qty)) / 100)

export function AddFoodModal({ meal, date, onClose, onAdded }: Props) {
  const userId = useAppStore((s) => s.userId)
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [favFilter, setFavFilter] = useState(false)
  const [catFilter, setCatFilter] = useState('')
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    Promise.all([
      fetch(`/api/categories?userId=${userId}`).then(r => r.json()),
      fetch(`/api/favorites?userId=${userId}`).then(r => r.json()),
    ]).then(([cats, favs]) => {
      setCategories(Array.isArray(cats) ? cats : [])
      setFavorites(new Set(Array.isArray(favs) ? favs : []))
    })
  }, [userId])

  useEffect(() => {
    clearTimeout(timer.current)
    const hasFilter = favFilter || !!catFilter
    if (q.length < 2 && !hasFilter) { setResults([]); setSearched(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const p = new URLSearchParams({ q: q || '', userId, ...(catFilter ? { categoryId: catFilter } : {}), ...(favFilter ? { fav: '1' } : {}) })
        const r = await fetch(`/api/food?${p}`)
        const data = await r.json()
        setResults(Array.isArray(data) ? data : [])
      } catch { setResults([]) }
      setSearched(true)
      setLoading(false)
    }, 300)
  }, [q, userId, favFilter, catFilter])

  function addToCart() {
    if (!selected || !qty.trim()) return
    setCart(prev => [...prev, { food: selected, qty }])
    setSelected(null)
    setQty('')
    setQ('')
    setResults([])
    setSearched(false)
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
  const showResults = !selected && results.length > 0
  const showEmpty = !selected && searched && results.length === 0 && (q.length >= 2 || hasFilter)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col p-5 shadow-xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Aggiungi a {meal}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={16} /></button>
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
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSelected(null) }}
                  placeholder="Cerca alimento o marca..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
                {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
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
            {results.map(f => (
              <button key={f.id} onClick={() => setSelected(f)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-2">
                  {favorites.has(f.id) && <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}{f.brand && <span className="text-gray-400 font-normal"> — {f.brand}</span>}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {f.calories} kcal ·{' '}
                  <span style={{ color: '#5b9bd5' }}>G {f.fat}g</span> ·{' '}
                  <span style={{ color: '#f0aa78' }}>C {f.carbs}g</span> ·{' '}
                  <span style={{ color: '#9d8fcc' }}>P {f.protein}g</span>
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

        {!selected && !searched && q.length < 2 && !hasFilter && cart.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Scrivi almeno 2 caratteri</p>
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
