'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

type Food = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number }

type Props = {
  meal: string
  date: string
  onClose: () => void
  onAdded: () => void
}

export function AddFoodModal({ meal, date, onClose, onAdded }: Props) {
  const userId = useAppStore((s) => s.userId)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState('100')
  const [adding, setAdding] = useState(false)
  const timer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/food?q=${encodeURIComponent(q)}&userId=${userId}`)
      setResults(await r.json())
      setLoading(false)
    }, 300)
  }, [q, userId])

  const calcMacro = (val: number) => Math.round((val * Number(qty)) / 100)

  async function handleAdd() {
    if (!selected || !qty) return
    setAdding(true)
    await fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date, meal, foodId: selected.id, quantity: Number(qty) }),
    })
    setAdding(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] flex flex-col p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Aggiungi a {meal}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null) }}
            placeholder="Cerca alimento..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-emerald-400"
          />
          {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>

        {/* Results */}
        {!selected && results.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1 mb-3">
            {results.map(f => (
              <button key={f.id} onClick={() => setSelected(f)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.name}</p>
                <p className="text-xs text-gray-400">{f.calories} kcal · P {f.protein}g · C {f.carbs}g · G {f.fat}g <span className="text-gray-300">/ 100g</span></p>
              </button>
            ))}
          </div>
        )}

        {/* Selected food + quantity */}
        {selected && (
          <div className="space-y-3 mt-1">
            <div className="bg-emerald-50 dark:bg-emerald-950 rounded-xl p-3">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selected.name}</p>
              <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                {[
                  { l: 'Kcal', v: calcMacro(selected.calories) },
                  { l: 'Prot', v: `${calcMacro(selected.protein)}g` },
                  { l: 'Carb', v: `${calcMacro(selected.carbs)}g` },
                  { l: 'Gras', v: `${calcMacro(selected.fat)}g` },
                ].map(m => (
                  <div key={m.l} className="bg-white dark:bg-gray-900 rounded-lg py-1.5">
                    <p className="text-xs text-gray-400">{m.l}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 shrink-0">Quantità (g)</label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-emerald-400"
              />
            </div>
            <button onClick={handleAdd} disabled={adding}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Aggiungi
            </button>
          </div>
        )}

        {!selected && q.length >= 2 && !loading && results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Nessun alimento trovato</p>
        )}
        {!selected && q.length < 2 && (
          <p className="text-sm text-gray-400 text-center py-4">Scrivi almeno 2 caratteri</p>
        )}
      </div>
    </div>
  )
}
