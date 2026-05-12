'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'

type Food = { id: string; name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number }
type Props = { meal: string; date: string; onClose: () => void; onAdded: () => void }

export function AddFoodModal({ meal, date, onClose, onAdded }: Props) {
  const userId = useAppStore((s) => s.userId)
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState('100')
  const [adding, setAdding] = useState(false)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length < 2) { setResults([]); setSearched(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/food?q=${encodeURIComponent(q)}&userId=${userId}`)
      const data = await r.json()
      setResults(data); setSearched(true); setLoading(false)
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
    setAdding(false); onAdded(); onClose()
  }

  function goToCreate() {
    onClose()
    router.push(`/food/database?q=${encodeURIComponent(q)}&new=1`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] flex flex-col p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Aggiungi a {meal}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={16} /></button>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSelected(null) }}
            placeholder="Cerca alimento o marca..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
          {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>

        {!selected && results.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-0.5 mb-3">
            {results.map(f => (
              <button key={f.id} onClick={() => setSelected(f)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{f.brand ? `${f.name} — ${f.brand}` : f.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {f.calories} kcal ·{' '}
                  <span style={{ color: '#9b59b6' }}>G {f.fat}g</span> ·{' '}
                  <span style={{ color: '#e8813a' }}>C {f.carbs}g</span> ·{' '}
                  <span style={{ color: '#5a9e5a' }}>P {f.protein}g</span>
                  <span className="text-gray-300"> /100g</span>
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Not found CTA */}
        {!selected && searched && results.length === 0 && q.length >= 2 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 mb-3">
            <p className="text-sm text-gray-400 text-center">Nessun alimento trovato per <span className="font-semibold text-gray-700 dark:text-gray-300">"{q}"</span></p>
            <button onClick={goToCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-500 text-sm font-semibold hover:bg-orange-100 transition-colors">
              <Plus size={16} /> Vuoi aggiungerlo al database?
            </button>
          </div>
        )}

        {!selected && q.length < 2 && (
          <p className="text-sm text-gray-400 text-center py-4">Scrivi almeno 2 caratteri</p>
        )}

        {selected && (
          <div className="space-y-3 mt-1">
            <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-3">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selected.brand ? `${selected.name} — ${selected.brand}` : selected.name}</p>
              <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                {[
                  { l: 'Kcal', v: calcMacro(selected.calories), color: '#6c5ce7' },
                  { l: 'P', v: `${calcMacro(selected.protein)}g`, color: '#5a9e5a' },
                  { l: 'C', v: `${calcMacro(selected.carbs)}g`, color: '#e8813a' },
                  { l: 'G', v: `${calcMacro(selected.fat)}g`, color: '#9b59b6' },
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
              <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
            </div>
            <button onClick={handleAdd} disabled={adding}
              className="w-full py-3 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Aggiungi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
