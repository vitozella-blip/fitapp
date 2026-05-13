'use client'
import React from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const MealIcon = ({ type, size = 16 }: { type: string; size?: number }) => {
  const s = size
  const icons: Record<string, React.ReactElement> = {
    colazione: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11c0-4 2-7 9-7s9 3 9 7"/><path d="M3 11h18"/><path d="M5 11c0 3 1 6 7 6s7-3 7-6"/><path d="M8 7c0-1 .5-2 1.5-2.5"/>
      </svg>
    ),
    spuntino_m: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3h8l1 5H7z"/><rect x="6" y="8" width="12" height="11" rx="2"/><path d="M10 12h4M10 15h4"/>
      </svg>
    ),
    pranzo: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8"/><path d="M8 12c0-2 1.5-4 4-4s4 2 4 4"/><path d="M7 16c1-1.5 2.5-2 5-2s4 .5 5 2"/>
      </svg>
    ),
    spuntino_p: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c-1 0-2 .5-2.5 1.5"/><path d="M6 9c0-3 2-6 6-6s6 3 6 6c0 4-2 9-6 9s-6-5-6-9z"/><path d="M12 3c2-1 4 0 4 2"/>
      </svg>
    ),
    cena: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9h12l-1 8H7z"/><path d="M8 9V7c0-1 .5-2 2-2h4c1.5 0 2 1 2 2v2"/><path d="M9 13h6M9 16h4"/>
      </svg>
    ),
  }
  return icons[type] ?? icons.pranzo
}

const MEALS = [
  { name: 'Colazione',            icon: 'colazione',  color: '#e8813a' },
  { name: 'Spuntino mattina',     icon: 'spuntino_m', color: '#5a9e5a' },
  { name: 'Pranzo',               icon: 'pranzo',     color: '#6c5ce7' },
  { name: 'Spuntino pomeriggio',  icon: 'spuntino_p', color: '#e8813a' },
  { name: 'Cena',                 icon: 'cena',       color: '#9b59b6' },
]

type DashData = {
  totals:  { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  meals:   { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number }
}

export default function DashboardPage() {
  const { userId, selectedDate, userProfile } = useAppStore()
  const router = useRouter()
  const [data, setData]     = useState<DashData | null>(null)
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

  const t  = data?.totals  ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const tg = data?.targets ?? { calories: userProfile.targetCalories, protein: userProfile.targetProtein, carbs: userProfile.targetCarbs, fat: userProfile.targetFat }

  const calPct  = tg.calories > 0 ? Math.min(100, Math.round((t.calories / tg.calories) * 100)) : 0
  const calOver = t.calories > tg.calories
  const pct = (v: number, mx: number) => mx > 0 ? Math.min(100, Math.round((v / mx) * 100)) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6c5ce7', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none md:space-y-4 md:h-auto h-[calc(100dvh-7.5rem)]">

      {/* MACRO */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-2xl font-bold', calOver ? 'text-red-500' : '')} style={!calOver ? { color: '#6c5ce7' } : {}}>
                {t.calories}
              </span>
              <span className="text-xs text-gray-400">/ {tg.calories} kcal</span>
            </div>
            <span className={cn('text-xs font-bold px-2 py-1 rounded-lg', calOver ? 'bg-red-50 dark:bg-red-950 text-red-500' : 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400')}>
              {calOver ? `+${t.calories - tg.calories}` : `${calPct}%`}
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${calPct}%`, backgroundColor: calOver ? '#ef4444' : '#6c5ce7' }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Proteine',    val: t.protein, tgt: tg.protein, color: '#5a9e5a' },
            { label: 'Carboidrati', val: t.carbs,   tgt: tg.carbs,   color: '#e8813a' },
            { label: 'Grassi',      val: t.fat,     tgt: tg.fat,     color: '#9b59b6' },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 font-semibold truncate">{m.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: m.color }}>{m.val}<span className="text-xs text-gray-400 font-normal">/{m.tgt}g</span></p>
              <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM CARDS */}
      <div className="grid grid-cols-2 gap-2 min-h-0 flex-1">

        <button onClick={() => router.push('/food/diary')}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left min-h-0">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Pasti</p>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col justify-between p-1.5 gap-0.5">
            {MEALS.map(({ name, icon, color }) => {
              const m = data?.meals.find(x => x.name === name)
              const kcal = m?.calories ?? 0
              return (
                <div key={name} className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18', color }}>
                    <MealIcon type={icon} size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {kcal > 0 ? (
                      <p className="text-[9px] text-gray-400 leading-tight truncate">
                        <span className="font-bold text-gray-600 dark:text-gray-300">{kcal}</span>
                        {' '}·{' '}
                        <span style={{ color: '#5a9e5a' }}>P{m!.protein}</span>{' '}
                        <span style={{ color: '#e8813a' }}>C{m!.carbs}</span>{' '}
                        <span style={{ color: '#9b59b6' }}>G{m!.fat}</span>
                      </p>
                    ) : (
                      <p className="text-[9px] text-gray-300 dark:text-gray-600">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </button>

        <button onClick={() => router.push('/training/diary')}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left min-h-0">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Allenamento</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-3 gap-2">
            {data?.workout.exists ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v6M18 4v6M3 9h4M17 9h4M6 14v6M18 14v6M3 15h4M17 15h4M9 12h6"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-blue-500">WO completato</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{data.workout.exerciseCount} esercizi</p>
                  <p className="text-[10px] text-gray-400">{data.workout.setCount} serie</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c-1 4-4 6-4 10a4 4 0 0 0 8 0c0-4-3-6-4-10z"/><path d="M10 17a2 2 0 0 0 4 0"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-400">Giorno OFF</p>
                  <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Riposo</p>
                </div>
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
