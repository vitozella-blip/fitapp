'use client'
import React from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const C = {
  kcal:     '#9d8fcc',
  protein:  '#7dbf7d',
  carbs:    '#f0aa78',
  fat:      '#c4a0d6',
  training: '#7aafc8',
} as const

const MealIcon = ({ type, size = 22 }: { type: string; size?: number }) => {
  const s = size
  const icons: Record<string, React.ReactElement> = {
    colazione: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
    spuntino_m: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 3.87-2.69 8-7 11C7.69 17 5 12.87 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
    pranzo: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    spuntino_p: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8C8 10 5.9 16.17 3.82 20.63"/><path d="M17 8c1.5-2 2.5-4 1-6-3 0-4.5 2-4.5 4"/><path d="M9.5 11.5C7 14 5 17 3.82 20.63"/><path d="M16.5 15C14 17 11.5 19 3.82 20.63"/>
      </svg>
    ),
    cena: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
      </svg>
    ),
  }
  return icons[type] ?? icons.pranzo
}

const MEALS = [
  { name: 'Colazione',           icon: 'colazione',  color: C.carbs },
  { name: 'Spuntino mattina',    icon: 'spuntino_m', color: C.protein },
  { name: 'Pranzo',              icon: 'pranzo',     color: C.kcal },
  { name: 'Spuntino pomeriggio', icon: 'spuntino_p', color: C.carbs },
  { name: 'Cena',                icon: 'cena',       color: C.fat },
]

type DashData = {
  totals:  { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  meals:   { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number; hasTennis?: boolean; exercises?: string[] }
}

export default function DashboardPage() {
  const { userId, selectedDate, userProfile } = useAppStore()
  const router = useRouter()
  const [data, setData]       = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [schedaInfo, setSchedaInfo] = useState<{ name: string; order: number } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`workout_scheda_${selectedDate}`)
      setSchedaInfo(raw ? JSON.parse(raw) : null)
    } catch { setSchedaInfo(null) }
  }, [selectedDate])

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

  const hasWorkout = data?.workout.exists || data?.workout.hasTennis

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.kcal, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none md:space-y-3 md:h-auto h-[calc(100dvh-7.5rem)]">

      {/* KCAL + MACRO — unified card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 pt-3 pb-3 shrink-0">
        {/* Kcal row */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Calorie</span>
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-lg',
            calOver ? 'bg-red-50 dark:bg-red-950/50 text-red-400' : 'text-white'
          )} style={!calOver ? { backgroundColor: C.kcal + 'cc' } : {}}>
            {calOver ? `+${t.calories - tg.calories}` : `${calPct}%`}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-3xl font-bold" style={{ color: calOver ? '#f87171' : C.kcal }}>{t.calories}</span>
          <span className="text-xs text-gray-400">/ {tg.calories} kcal</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
        </div>
        {/* Macro bars */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Proteine', val: t.protein, tgt: tg.protein, color: C.protein },
            { label: 'Carbo',    val: t.carbs,   tgt: tg.carbs,   color: C.carbs },
            { label: 'Grassi',   val: t.fat,     tgt: tg.fat,     color: C.fat },
          ].map(m => (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-400 font-medium">{m.label}</span>
                <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.val}g</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: m.color + '22' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
              </div>
              <span className="text-[9px] text-gray-400 mt-0.5 block">/ {m.tgt}g</span>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM CARDS */}
      <div className="grid grid-cols-2 gap-2 min-h-0 flex-1">

        {/* PASTI */}
        <button onClick={() => router.push('/food/diary')}
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pasti</p>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col justify-around px-2 py-2 gap-0">
            {MEALS.map(({ name, icon, color }) => {
              const m = data?.meals.find(x => x.name === name)
              const kcal = m?.calories ?? 0
              return (
                <div key={name} className="flex items-center gap-2 px-1 py-0.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: color + '1a', color }}>
                    <MealIcon type={icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 leading-none truncate mb-0.5">{name}</p>
                    {kcal > 0 ? (
                      <p className="text-[9px] text-gray-400 leading-tight truncate">
                        <span className="font-bold text-gray-600 dark:text-gray-300">{kcal}</span>
                        {' '}·{' '}
                        <span style={{ color: C.protein }}>P{m!.protein}</span>{' '}
                        <span style={{ color: C.carbs }}>C{m!.carbs}</span>{' '}
                        <span style={{ color: C.fat }}>G{m!.fat}</span>
                      </p>
                    ) : (
                      <p className="text-[9px] text-gray-300 dark:text-gray-600 leading-tight">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </button>

        {/* ALLENAMENTO */}
        <button onClick={() => router.push('/training/diary')}
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Allenamento</p>
          </div>

          {hasWorkout ? (
            <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2 min-h-0">
              {/* Icon + scheda header */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: C.training + '18' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.training} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v6M18 4v6M3 9h4M17 9h4M6 14v6M18 14v6M3 15h4M17 15h4M9 12h6"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  {schedaInfo ? (
                    <>
                      <p className="text-xs font-bold leading-tight" style={{ color: C.training }}>
                        WO {schedaInfo.order}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate leading-tight">{schedaInfo.name}</p>
                    </>
                  ) : (
                    <p className="text-xs font-bold" style={{ color: C.training }}>Allenamento</p>
                  )}
                </div>
              </div>

              {/* Exercise list */}
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {(data?.workout.exercises ?? []).map(ex => (
                  <div key={ex} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: C.training + '99' }} />
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate leading-tight">{ex}</p>
                  </div>
                ))}
                {data?.workout.hasTennis && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#5a8a5a99' }} />
                    <p className="text-[10px] font-semibold leading-tight" style={{ color: '#5a8a5a' }}>🎾 Tennis</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-3 gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#b0b8c8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  <circle cx="12" cy="12" r="1"/>
                  <path d="M12 8v1M12 15v1M8 12h1M15 12h1"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-400">Riposo</p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Recupero attivo</p>
              </div>
            </div>
          )}
        </button>

      </div>
    </div>
  )
}
