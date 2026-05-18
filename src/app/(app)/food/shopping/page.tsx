'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, X, Check, Trash2, ShoppingCart, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type Food = { id: string; name: string; brand?: string; calories: number }
type ShoppingItem = { id: string; foodId: string | null; name: string; quantity: string | null; checked: boolean }

const ACCENT = '#e8924a'

export default function ShoppingListPage() {
  const userId = useAppStore(s => s.userId)
  const [items,    setItems]    = useState<ShoppingItem[]>([])
  const [loading,  setLoading]  = useState(true)

  const [q,        setQ]        = useState('')
  const [qty,      setQty]      = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [results,  setResults]  = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [searched,  setSearched]  = useState(false)
  const [adding,   setAdding]   = useState(false)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch(`/api/shopping-list?userId=${userId}`)
      setItems(await r.json())
    } catch {}
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    clearTimeout(timer.current)
    if (selected || q.length < 2) { setResults([]); setSearched(false); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/food?q=${encodeURIComponent(q)}&userId=${userId}&limit=8`)
        const data = await r.json()
        setResults(Array.isArray(data) ? data : [])
      } catch { setResults([]) }
      setSearched(true)
      setSearching(false)
    }, 300)
  }, [q, userId, selected])

  async function handleAdd() {
    const name = selected?.name ?? q.trim()
    if (!name) return
    setAdding(true)
    try {
      let foodId = selected?.id ?? null
      if (!selected) {
        const r = await fetch('/api/food', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: q.trim(), calories: 0, protein: 0, carbs: 0, fat: 0, userId }),
        })
        const food = await r.json()
        foodId = food.id
      }
      await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, foodId, quantity: qty.trim() || null }),
      })
      setQ(''); setQty(''); setSelected(null); setResults([]); setSearched(false)
      await fetchItems()
    } catch {}
    setAdding(false)
  }

  async function toggleCheck(item: ShoppingItem) {
    await fetch(`/api/shopping-list/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !item.checked }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
  }

  async function removeItem(id: string) {
    await fetch(`/api/shopping-list/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function clearChecked() {
    await fetch(`/api/shopping-list?userId=${userId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => !i.checked))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
  }

  const unchecked = items.filter(i => !i.checked)
  const checked   = items.filter(i => i.checked)
  const showDropdown = !selected && results.length > 0
  const showNewHint  = !selected && searched && results.length === 0 && q.length >= 2

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Lista della Spesa" icon={ShoppingCart} accent="food" />

      {/* Add form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            autoFocus
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null) }}
            onKeyDown={handleKeyDown}
            placeholder="Cerca o scrivi un alimento..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
          />
          {searching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          )}
          {selected && !searching && (
            <button onClick={() => { setSelected(null); setQ('') }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Autocomplete results */}
        {showDropdown && (
          <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
            {results.map(f => (
              <button key={f.id}
                onClick={() => { setSelected(f); setQ(f.name + (f.brand ? ` — ${f.brand}` : '')); setResults([]) }}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.name}</span>
                {f.brand && <span className="text-xs text-gray-400"> — {f.brand}</span>}
                <span className="text-xs text-gray-400 ml-1.5">{f.calories} kcal/100g</span>
              </button>
            ))}
          </div>
        )}

        {showNewHint && (
          <p className="text-xs text-gray-400 px-1">
            <span className="font-medium text-gray-600 dark:text-gray-300">&ldquo;{q}&rdquo;</span> non trovato — verrà aggiunto al database.
          </p>
        )}

        <div className="flex gap-2">
          <input
            value={qty}
            onChange={e => setQty(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quantità (es. 1 kg, 3 pz)"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !q.trim()}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: ACCENT }}>
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
            Aggiungi
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: ACCENT }} />
        </div>
      )}

      {/* Unchecked items */}
      {!loading && unchecked.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          {unchecked.map((item, i) => (
            <div key={item.id}
              className={cn('flex items-center gap-3 px-4 py-3 transition-colors', i > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
              <button
                onClick={() => toggleCheck(item)}
                className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 hover:border-orange-400 dark:hover:border-orange-400 transition-colors" />
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</span>
              {item.quantity && (
                <span className="text-xs text-gray-400 shrink-0 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {item.quantity}
                </span>
              )}
              <button
                onClick={() => removeItem(item.id)}
                className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Checked / acquired items */}
      {!loading && checked.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Acquistati</p>
            <button onClick={clearChecked}
              className="text-xs text-red-400 hover:text-red-500 font-semibold transition-colors">
              Svuota
            </button>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden opacity-60">
            {checked.map((item, i) => (
              <div key={item.id}
                className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
                <button
                  onClick={() => toggleCheck(item)}
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: ACCENT }}>
                  <Check size={11} className="text-white" />
                </button>
                <span className="flex-1 text-sm font-medium text-gray-400 line-through truncate">{item.name}</span>
                {item.quantity && (
                  <span className="text-xs text-gray-300 shrink-0">{item.quantity}</span>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center justify-center text-gray-200 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-12 text-center">
          <ShoppingCart size={30} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm font-medium text-gray-400">Lista vuota</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Aggiungi gli alimenti da acquistare</p>
        </div>
      )}
    </div>
  )
}
