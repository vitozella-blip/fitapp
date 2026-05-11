'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Target, Loader2, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type Food = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number }
type Macro = 'protein' | 'carbs' | 'fat'

const MACROS: { key: Macro; label: string; color: string; bg: string; per: number }[] = [
  { key: 'protein', label: 'Proteine', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800', per: 4 },
  { key: 'carbs', label: 'Carboidrati', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800', per: 4 },
  { key: 'fat', label: 'Grassi', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800', per: 9 },
]

type Result = { grams: number; calories: number; protein: number; carbs: number; fat: number }

export default function MacrosPage() {
  const userId = useAppStore((s) => s.userId)
  const [macro, setMacro] = useState<Macro>('protein')
  const [amount, setAmount] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [selected, setSelected] = useState<Food | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

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

  useEffect(() => {
    if (!selected || !amount || Number(amount) <= 0) { setResult(null); return }
    const macroValue = selected[macro]
    if (!macroValue || macroValue === 0) { setResult(null); return }
    const grams = Math.round((Number(amount) / macroValue) * 100)
    const ratio = grams / 100
    setResult({
      grams,
      calories: Math.round(selected.calories * ratio),
      protein: Math.round(selected.protein * ratio),
      carbs: Math.round(selected.carbs * ratio),
      fat: Math.round(selected.fat * ratio),
    })
  }, [selected, amount, macro])

  function selectFood(food: Food) {
    setSelected(food)
    setQ(food.name)
    setResults([])
  }

  function clearFood() {
    setSelected(null)
    setQ('')
    setResults([])
    setResult(null)
  }

  const selectedMacro = MACROS.find(m => m.key === macro)!

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none pb-2">
      <PageHeader title="Completa i Macro" icon={Target} accent="food" />

      {/* Step 1 - select macro */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">1. Scegli il macro da completare</p>
        <div className="grid grid-cols-3 gap-2">
          {MACROS.map(m => (
            <button key={m.key} onClick={() => { setMacro(m.key); setResult(null) }}
              className={cn('py-3 rounded-xl border text-sm font-bold transition-all', macro === m.key ? m.bg + ' ' + m.color : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 - amount */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">2. Quanti grammi ti mancano?</p>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Es. 30"
            className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-2xl font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 text-center"
          />
          <span className={cn('absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold', selectedMacro.color)}>g</span>
        </div>
        {amount && Number(amount) > 0 && (
          <p className="text-xs text-gray-400 text-center">
            Equivale a circa <span className="font-bold text-gray-700 dark:text-gray-300">{Math.round(Number(amount) * selectedMacro.per)} kcal</span> da {selectedMacro.label.toLowerCase()}
          </p>
        )}
      </div>

      {/* Step 3 - food search */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">3. Scegli un alimento</p>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); if (selected) setSelected(null) }}
            placeholder="Cerca alimento..."
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
          />
          {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
          {selected && !loading && (
            <button onClick={clearFood} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          )}
        </div>

        {results.length > 0 && !selected && (
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
            {results.map(f => (
              <button key={f.id} onClick={() => selectFood(f)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{f.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  P <span className="text-emerald-500 font-medium">{f.protein}g</span> ·
                  C <span className="text-orange-400 font-medium">{f.carbs}g</span> ·
                  G <span className="text-blue-400 font-medium">{f.fat}g</span>
                  <span className="text-gray-300"> / 100g</span>
                </p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className={cn('px-4 py-3 rounded-xl border', selectedMacro.bg)}>
            <p className={cn('font-bold text-sm', selectedMacro.color)}>{selected.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              P {selected.protein}g · C {selected.carbs}g · G {selected.fat}g / 100g
            </p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && selected && amount && (
        <div className="bg-white dark:bg-gray-900 border-2 border-orange-300 dark:border-orange-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Risultato</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Per ottenere <span className={cn('font-bold', selectedMacro.color)}>{amount}g di {selectedMacro.label}</span></p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{result.grams}<span className="text-lg text-gray-400 ml-1">g</span></p>
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300 mt-1">{selected.name}</p>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Apporto totale</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Calorie', value: result.calories, unit: 'kcal', color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-50 dark:bg-gray-800' },
                  { label: 'Proteine', value: result.protein, unit: 'g', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950' },
                  { label: 'Carboidrati', value: result.carbs, unit: 'g', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950' },
                  { label: 'Grassi', value: result.fat, unit: 'g', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
                ].map(item => (
                  <div key={item.label} className={cn('rounded-xl p-3 text-center', item.bg)}>
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className={cn('text-xl font-bold', item.color)}>{item.value}<span className="text-sm font-normal ml-0.5">{item.unit}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for missing macro */}
      {selected && amount && Number(amount) > 0 && !result && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            {selected.name} non contiene {selectedMacro.label.toLowerCase()} sufficienti per il calcolo.
          </p>
          <p className="text-xs text-amber-500 mt-1">Prova con un alimento diverso o scegli un altro macro.</p>
        </div>
      )}
    </div>
  )
}
