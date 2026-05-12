'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const MEALS = [
  { name: 'Colazione', emoji: '🥐' },
  { name: 'Spuntino mattina', emoji: '🍦' },
  { name: 'Pranzo', emoji: '🍝' },
  { name: 'Spuntino pomeriggio', emoji: '🍌' },
  { name: 'Cena', emoji: '🥩' },
]

type DashData = {
  totals: { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  meals: { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number }
}

function MacroCard({ label, value, target, color, bg }: { label: string; value: number; target: number; color: string; bg: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 space-y-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}<span className="text-xs text-gray-400 font-normal ml-1">/{target}g</span></p>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { userId, selectedDate, userProfile } = useAppStore()
  const router = useRouter()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/dashboard?userId=${userId}&date=${selectedDate}`)
      setData(await r.json())
    } catch { setData(null) }
    setLoading(false)
  }, [userId, selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  const t = data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const tg = data?.targets ?? { calories: userProfile.targetCalories, protein: userProfile.targetProtein, carbs: userProfile.targetCarbs, fat: userProfile.targetFat }
  const calPct = tg.calories > 0 ? Math.min(100, Math.round((t.calories / tg.calories) * 100)) : 0
  const calOver = t.calories > tg.calories
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6c5ce7', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none">

      {/* Calorie card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Calorie · {dateLabel}</p>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-4xl font-bold', calOver ? 'text-red-500' : '')} style={!calOver ? { color: '#6c5ce7' } : {}}>
                {t.calories}
              </span>
              <span className="text-sm text-gray-400">/ {tg.calories} kcal</span>
            </div>
          </div>
          <span className={cn('text-sm font-bold px-3 py-1.5 rounded-xl', calOver ? 'bg-red-50 dark:bg-red-950 text-red-500' : 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400')}>
            {calOver ? `+${t.calories - tg.calories}` : `${calPct}%`}
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-500', calOver ? 'bg-red-400' : '')}
            style={!calOver ? { width: `${calPct}%`, backgroundColor: '#6c5ce7' } : { width: `${calPct}%` }} />
        </div>
        {calOver && (
          <p className="text-xs text-red-500 font-medium">Surplus di {t.calories - tg.calories} kcal</p>
        )}
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-3 gap-2">
        <MacroCard label="Proteine" value={t.protein} target={tg.protein} color="#5a9e5a" bg="bg-green-50" />
        <MacroCard label="Carboidrati" value={t.carbs} target={tg.carbs} color="#e8813a" bg="bg-orange-50" />
        <MacroCard label="Grassi" value={t.fat} target={tg.fat} color="#9b59b6" bg="bg-purple-50" />
      </div>

      {/* Meals card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <button onClick={() => router.push('/food/diary')}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Pasti</p>
          <span className="text-xs text-gray-400">Apri diario →</span>
        </button>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {MEALS.map(({ name, emoji }) => {
            const m = data?.meals.find(x => x.name === name)
            const hasData = m && m.calories > 0
            return (
              <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xl shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{name}</p>
                  {hasData ? (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {m!.calories} kcal ·{' '}
                      <span style={{ color: '#5a9e5a' }}>P {m!.protein}g</span> ·{' '}
                      <span style={{ color: '#e8813a' }}>C {m!.carbs}g</span> ·{' '}
                      <span style={{ color: '#9b59b6' }}>G {m!.fat}g</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Nessun alimento</p>
                  )}
                </div>
                {hasData && <span className="text-xs font-bold text-gray-400 shrink-0">{m!.calories}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Workout card */}
      <button onClick={() => router.push('/training/diary')}
        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Allenamento</p>
          <span className="text-xs text-gray-400">Apri diario →</span>
        </div>
        <div className="px-4 py-4 flex items-center gap-4">
          {data?.workout.exists ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                <span className="text-2xl">💪</span>
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Allenamento completato</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {data.workout.exerciseCount} esercizi · {data.workout.setCount} serie
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <span className="text-2xl">😴</span>
              </div>
              <div>
                <p className="font-bold text-sm text-gray-500 dark:text-gray-400">Giorno OFF</p>
                <p className="text-xs text-gray-400 mt-0.5">Nessun allenamento registrato</p>
              </div>
            </>
          )}
        </div>
      </button>
    </div>
  )
}
