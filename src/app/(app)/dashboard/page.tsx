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
      // cornetto / croissant
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18Q8 10 12 10Q16 10 20 18"/>
        <path d="M4 18Q8 15 12 15Q16 15 20 18"/>
        <path d="M12 10C11.5 7 11.5 5 12 3C12.5 5 12.5 7 12 10"/>
        <path d="M7.5 15L12 10"/><path d="M16.5 15L12 10"/>
      </svg>
    ),
    spuntino_m: (
      // vasetto di yogurt
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 8h8l-1.5 11h-5z"/>
        <path d="M8 8V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
        <path d="M11 12.5h2M10.5 16h3"/>
      </svg>
    ),
    pranzo: (
      // campana cloche + sole in alto a destra
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="18" x2="21" y2="18"/>
        <path d="M5 18a7 7 0 0 1 14 0"/>
        <path d="M10 11h4M12 11V9"/>
        <circle cx="19" cy="5" r="1.5"/>
        <path d="M19 2.5v.8M19 7.2v.8M16.5 5h.8M21.2 5h.8"/>
      </svg>
    ),
    spuntino_p: (
      // banana
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20C5 15 8 9 14 7C19 6 22 9 21 13"/>
        <path d="M5 18C6 14 9 9 14 8"/>
        <path d="M21 13C20 16 17 18 13 18"/>
      </svg>
    ),
    cena: (
      // campana cloche + luna in alto a sinistra
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="18" x2="21" y2="18"/>
        <path d="M5 18a7 7 0 0 1 14 0"/>
        <path d="M10 11h4M12 11V9"/>
        <g transform="translate(-1.5 1) scale(0.28)" strokeWidth={1.6 / 0.28}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </g>
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
              {/* Icons (stacked) + scheda header */}
              <div className="flex items-start gap-2 shrink-0">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  {data?.workout.hasTennis && (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#5a8a5a15', color: '#5a8a5a' }}>
                      {/* tennis racket */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="14" cy="9" rx="5" ry="6"/>
                        <path d="M11.5 14L7 19"/>
                        <path d="M14 3v12M9.5 9h9"/>
                      </svg>
                    </div>
                  )}
                  {data?.workout.exists && (
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: C.training + '18', color: C.training }}>
                      {/* dumbbell */}
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6.5 12h11"/>
                        <path d="M5.5 8.5v7M18.5 8.5v7"/>
                        <path d="M3 10v4M21 10v4"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  {schedaInfo ? (
                    <>
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mb-1"
                        style={{ backgroundColor: C.training + 'cc' }}>
                        WO {schedaInfo.order}
                      </span>
                      <p className="text-sm font-bold truncate leading-tight" style={{ color: C.training }}>
                        {schedaInfo.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold" style={{ color: C.training }}>
                      {!data?.workout.exists && data?.workout.hasTennis ? 'Tennis' : 'Allenamento'}
                    </p>
                  )}
                </div>
              </div>

              {/* Exercise list */}
              {(data?.workout.exercises ?? []).length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                  {(data?.workout.exercises ?? []).map(ex => (
                    <div key={ex} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: C.training + '99' }} />
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate leading-tight">{ex}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-3 gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center" style={{ color: '#b0b8c8' }}>
                {/* moon / rest icon */}
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
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
