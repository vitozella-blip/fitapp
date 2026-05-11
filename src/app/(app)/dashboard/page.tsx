'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']

type DashData = {
  totals: { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  meals: { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number }
}

function ProgressBar({ value, max, color, overflow }: { value: number; max: number; color: string; overflow?: boolean }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0)
  const over = value > max
  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', over && overflow ? 'bg-red-400' : color)}
        style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const { userId, selectedDate, userProfile } = useAppStore()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/dashboard?userId=${userId}&date=${selectedDate}`)
    const d = await r.json()
    setData(d)
    setLoading(false)
  }, [userId, selectedDate])

  useEffect(() => { fetch_() }, [fetch_])

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  const t = data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const tg = data?.targets ?? { calories: userProfile.targetCalories, protein: userProfile.targetProtein, carbs: userProfile.targetCarbs, fat: userProfile.targetFat }
  const calPct = tg.calories > 0 ? Math.min(100, Math.round((t.calories / tg.calories) * 100)) : 0
  const calOver = t.calories > tg.calories
  const calSurplus = t.calories - tg.calories

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none pb-2">

      {/* Calorie card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Calorie consumate</p>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-4xl font-bold', calOver ? 'text-red-500' : 'text-gray-900 dark:text-gray-100')}>
                {t.calories}
              </span>
              <span className="text-sm text-gray-400 font-medium">/ {tg.calories} kcal</span>
            </div>
          </div>
          <div className={cn('px-3 py-1.5 rounded-xl text-sm font-bold', calOver
            ? 'bg-red-50 dark:bg-red-950 text-red-500'
            : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
          )}>
            {calPct}%
          </div>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-500', calOver ? 'bg-red-400' : 'bg-emerald-500')}
            style={{ width: `${calPct}%` }} />
        </div>
        {calOver && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <p className="text-xs text-red-500 font-medium">Surplus di {calSurplus} kcal rispetto all'obiettivo</p>
          </div>
        )}
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Proteine', key: 'protein' as const, val: t.protein, tgt: tg.protein, color: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Carboidrati', key: 'carbs' as const, val: t.carbs, tgt: tg.carbs, color: 'bg-orange-400', light: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-500' },
          { label: 'Grassi', key: 'fat' as const, val: t.fat, tgt: tg.fat, color: 'bg-blue-400', light: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-500' },
        ].map(m => (
          <div key={m.key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-tight">{m.label}</p>
            <div>
              <span className={cn('text-xl font-bold', m.text)}>{m.val}</span>
              <span className="text-xs text-gray-400 ml-1">/ {m.tgt}g</span>
            </div>
            <ProgressBar value={m.val} max={m.tgt} color={m.color} overflow />
          </div>
        ))}
      </div>

      {/* Meals card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Pasti <span className="text-gray-400 font-normal">· {dateLabel}</span></p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {MEALS.map(meal => {
            const m = data?.meals.find(x => x.name === meal) ?? { name: meal, calories: 0, protein: 0, carbs: 0, fat: 0 }
            const hasData = m.calories > 0
            return (
              <div key={meal} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{meal}</p>
                  {hasData && <p className="text-xs text-gray-400 mt-0.5">{m.calories} kcal</p>}
                  {!hasData && <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Nessun alimento</p>}
                </div>
                {hasData && (
                  <div className="flex items-center gap-2 text-xs font-semibold shrink-0 ml-2">
                    <span className="text-emerald-500">P {m.protein}g</span>
                    <span className="text-orange-400">C {m.carbs}g</span>
                    <span className="text-blue-400">G {m.fat}g</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Workout card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Allenamento <span className="text-gray-400 font-normal">· {dateLabel}</span></p>
        </div>
        {data?.workout.exists ? (
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
              <Dumbbell size={22} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Allenamento completato</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.workout.exerciseCount} esercizi · {data.workout.setCount} serie totali
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <span className="text-xl">😴</span>
            </div>
            <div>
              <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm">Giorno OFF</p>
              <p className="text-xs text-gray-400 mt-0.5">Nessun allenamento registrato</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
