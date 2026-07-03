'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Target, X, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type Food = { id: string; name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number }
type Macro = 'protein' | 'carbs' | 'fat'
type ActiveStep = 1 | 2 | 3 | 0

const MACROS: { key: Macro; label: string; color: string; hex: string; bg: string; per: number }[] = [
  { key: 'fat',     label: 'Grassi',      color: 'text-blue-500',   hex: '#5b9bd5', bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',     per: 9 },
  { key: 'carbs',   label: 'Carboidrati', color: 'text-orange-400', hex: '#f0aa78', bg: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800', per: 4 },
  { key: 'protein', label: 'Proteine',    color: 'text-purple-500', hex: '#9d8fcc', bg: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800', per: 4 },
]

type Result = { grams: number; calories: number; protein: number; carbs: number; fat: number }

const KCAL_COLOR = '#6abf6a'

export default function MacrosPage() {
  const userId = useAppStore((s) => s.userId)

  const [macro, setMacro]         = useState<Macro | null>(null)
  const [activeStep, setActiveStep] = useState<ActiveStep>(1)
  const [amount, setAmount]       = useState('')
  const [q, setQ]                 = useState('')
  const [results, setResults]     = useState<Food[]>([])
  const [selected, setSelected]   = useState<Food | null>(null)
  const [result, setResult]       = useState<Result | null>(null)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    fetch(`/api/food?q=&userId=${userId}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setResults(d) }).catch(() => {})
  }, [userId])

  const displayResults = useMemo(() => {
    if (!q.trim()) return results
    const lower = q.trim().toLowerCase()
    return results.filter(f => f.name.toLowerCase().includes(lower) || (f.brand?.toLowerCase().includes(lower) ?? false))
  }, [results, q])

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length < 1) return
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/food?q=${encodeURIComponent(q)}&userId=${userId}`)
      setResults(await r.json())
    }, 200)
  }, [q, userId])

  useEffect(() => {
    if (!selected || !amount || Number(amount) <= 0 || !macro) { setResult(null); return }
    const macroValue = selected[macro]
    if (!macroValue || macroValue === 0) { setResult(null); return }
    const grams = Math.round((Number(amount) / macroValue) * 100)
    const ratio = grams / 100
    setResult({
      grams,
      calories: Math.round(selected.calories * ratio),
      protein:  Math.round(selected.protein  * ratio),
      carbs:    Math.round(selected.carbs    * ratio),
      fat:      Math.round(selected.fat      * ratio),
    })
  }, [selected, amount, macro])

  // editing = food already selected (result was shown before)
  const editing = selected !== null

  function chooseMacro(m: Macro) {
    setMacro(m)
    if (editing) {
      setActiveStep(0) // keep amount & food, recalculate result
    } else {
      setAmount(''); setSelected(null); setQ(''); setResults([]); setResult(null)
      setActiveStep(2)
    }
  }

  function confirmAmount() {
    if (!amount || Number(amount) <= 0) return
    setActiveStep(editing ? 0 : 3)
  }

  function onAmountBlur() {
    if (amount && Number(amount) > 0) setActiveStep(editing ? 0 : 3)
  }

  function selectFood(food: Food) {
    setSelected(food); setQ(food.name); setResults([])
    setActiveStep(0)
  }

  function clearFood() {
    setSelected(null); setQ(''); setResults([]); setResult(null)
    setActiveStep(3)
  }

  const sm = macro ? MACROS.find(m => m.key === macro)! : null

  // ── collapsed row shared style ────────────────────────────────────────────
  const collapsedRow = (label: string, content: React.ReactNode, onReopen: () => void) => (
    <button onClick={onReopen}
      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400 w-20 shrink-0">{label}</span>
      <span className="flex-1 min-w-0">{content}</span>
      <ChevronRight size={15} className="shrink-0 text-gray-300" />
    </button>
  )

  const accent = sm?.hex ?? '#fb923c'

  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none md:h-full">
      <PageHeader title="Completa i Macro" icon={Target} accent="food" />

      {/* ── Step 1: Macro ───────────────────────────────────────────────────── */}
      {activeStep === 1 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800" style={{ backgroundColor: accent + '14' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Macro</p>
          </div>
          <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {MACROS.map(m => (
              <button key={m.key} onClick={() => chooseMacro(m.key)}
                className={cn('py-3 rounded-xl border text-xs font-bold transition-all',
                  macro === m.key ? m.bg + ' ' + m.color : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                {m.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      ) : macro && collapsedRow(
        'Macro',
        <span className={cn('text-base font-bold', sm!.color)}>{sm!.label}</span>,
        () => setActiveStep(1)
      )}

      {/* ── Step 2: Quantità ────────────────────────────────────────────────── */}
      {macro && (
        activeStep === 2 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800" style={{ backgroundColor: accent + '14' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Quantità</p>
            </div>
            <div className="p-4 space-y-3">
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmAmount()}
                onBlur={onAmountBlur}
                placeholder="—"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 text-center caret-transparent placeholder:text-gray-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: sm!.hex }}>g</span>
            </div>
            {amount && Number(amount) > 0 && (
              <p className="text-xs text-gray-400 text-center">
                Circa <span className="font-bold text-gray-700 dark:text-gray-300">{Math.round(Number(amount) * sm!.per)} kcal</span> da {sm!.label.toLowerCase()}
              </p>
            )}
          </div>
          </div>
        ) : amount && collapsedRow(
          'Quantità',
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">
            {amount}<span className="font-bold ml-0.5" style={{ color: sm!.hex }}>g</span>
          </span>,
          () => setActiveStep(2)
        )
      )}

      {/* ── Step 3: Fonte ───────────────────────────────────────────────────── */}
      {macro && amount && Number(amount) > 0 && (
        activeStep === 3 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800" style={{ backgroundColor: accent + '14' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Fonte</p>
            </div>
            <div className="p-4 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={e => { setQ(e.target.value); if (selected) setSelected(null) }}
                placeholder="Cerca alimento..."
                autoFocus
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400"
              />
              {selected && (
                <button onClick={clearFood} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={15} />
                </button>
              )}
            </div>

            {displayResults.length > 0 && !selected && (
              <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
                {displayResults.map(f => (
                  <button key={f.id} onClick={() => selectFood(f)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {f.name}{f.brand && <span className="text-gray-400 font-normal"> — {f.brand}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      G <span style={{ color: '#5b9bd5' }} className="font-medium">{f.fat}g</span> ·
                      C <span style={{ color: '#f0aa78' }} className="font-medium">{f.carbs}g</span> ·
                      P <span style={{ color: '#9d8fcc' }} className="font-medium">{f.protein}g</span>
                      <span className="text-gray-300"> / 100g</span>
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className={cn('px-4 py-3 rounded-xl border', sm!.bg)}>
                <p className={cn('font-bold text-sm', sm!.color)}>{selected.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  G {selected.fat}g · C {selected.carbs}g · P {selected.protein}g / 100g
                </p>
              </div>
            )}
          </div>
          </div>
        ) : selected && collapsedRow(
          'Fonte',
          <span className="text-base font-semibold text-gray-700 dark:text-gray-300 truncate">{selected.name}</span>,
          () => setActiveStep(3)
        )
      )}

      {/* ── Result ──────────────────────────────────────────────────────────── */}
      {result && selected && amount && (
        <div className="flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden flex flex-col"
          style={{ border: '2px solid #f0aa7835' }}>
          <div className="px-5 py-3 border-b shrink-0" style={{ backgroundColor: '#f0aa7818', borderColor: '#f0aa7830' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f0aa78' }}>Risultato</p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-5 gap-4">
            <div className="text-center shrink-0">
              <p className="text-sm text-gray-400 mb-1">
                Per ottenere <span className={cn('font-bold', sm!.color)}>{amount}g di {sm!.label}</span>
              </p>
              <p className="text-6xl font-bold text-gray-900 dark:text-gray-100">
                {result.grams}<span className="text-2xl text-gray-400 ml-1">g</span>
              </p>
              <p className="text-xl font-semibold text-gray-600 dark:text-gray-300 mt-1">{selected.name}</p>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800 shrink-0" />

            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest shrink-0">Apporto totale</p>
              {/* Kcal — riga intera */}
              <div className="rounded-xl flex items-center justify-center p-3" style={{ backgroundColor: KCAL_COLOR + '18' }}>
                <p className="text-3xl font-bold" style={{ color: KCAL_COLOR }}>
                  {result.calories}<span className="text-base font-normal ml-0.5">kcal</span>
                </p>
              </div>
              {/* 3 macro — riga unica */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                {[
                  { value: result.fat,     unit: 'g', color: '#5b9bd5', bg: '#5b9bd518' },
                  { value: result.carbs,   unit: 'g', color: '#f0aa78', bg: '#f0aa7818' },
                  { value: result.protein, unit: 'g', color: '#9d8fcc', bg: '#9d8fcc18' },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl flex items-center justify-center p-3" style={{ backgroundColor: item.bg }}>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.value}<span className="text-sm font-normal ml-0.5">{item.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── No-macro-in-food warning ─────────────────────────────────────────── */}
      {selected && amount && Number(amount) > 0 && !result && sm && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            {selected.name} non contiene {sm.label.toLowerCase()} sufficienti per il calcolo.
          </p>
          <p className="text-xs text-amber-500 mt-1">Prova con un alimento diverso o scegli un altro macro.</p>
        </div>
      )}
    </div>
  )
}
