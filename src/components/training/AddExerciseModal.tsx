'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

type Exercise = { id: string; name: string; muscleGroup: string; equipment?: string }

type Props = { date: string; onClose: () => void; onAdded: () => void }

export function AddExerciseModal({ date, onClose, onAdded }: Props) {
  const userId = useAppStore((s) => s.userId)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [weight, setWeight] = useState('')
  const [adding, setAdding] = useState(false)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&userId=${userId}`)
      setResults(await r.json())
      setLoading(false)
    }, 300)
  }, [q, userId])

  async function handleAdd() {
    if (!selected) return
    setAdding(true)
    await fetch('/api/workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date, exerciseId: selected.id, sets: Number(sets), reps: Number(reps), weight: weight ? Number(weight) : null }),
    })
    setAdding(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] flex flex-col p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Aggiungi esercizio</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={16} /></button>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSelected(null) }}
            placeholder="Cerca esercizio..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
          {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>

        {!selected && results.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1 mb-3">
            {results.map(ex => (
              <button key={ex.id} onClick={() => setSelected(ex)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ex.name}</p>
                <p className="text-xs text-gray-400">{ex.muscleGroup}{ex.equipment ? ` · ${ex.equipment}` : ''}</p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-3 mt-1">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selected.name}</p>
              <p className="text-xs text-gray-400">{selected.muscleGroup}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ l: 'Serie', v: sets, s: setSets }, { l: 'Reps', v: reps, s: setReps }, { l: 'Peso (kg)', v: weight, s: setWeight }].map(f => (
                <div key={f.l}>
                  <label className="text-xs text-gray-400 block mb-1">{f.l}</label>
                  <input type="number" value={f.v} onChange={e => f.s(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
                </div>
              ))}
            </div>
            <button onClick={handleAdd} disabled={adding}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Aggiungi
            </button>
          </div>
        )}

        {!selected && q.length < 2 && <p className="text-sm text-gray-400 text-center py-4">Scrivi almeno 2 caratteri</p>}
        {!selected && q.length >= 2 && !loading && results.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nessun esercizio trovato</p>}
      </div>
    </div>
  )
}
