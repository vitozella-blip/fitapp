'use client'
import React, { useEffect, useState, useCallback, type ReactElement } from 'react'
import { Check } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { DateNav } from '@/components/shared/DateNav'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { useDateSwipe } from '@/hooks/useDateSwipe'

const C = {
  kcal:     '#6abf6a',
  protein:  '#9d8fcc',
  carbs:    '#f0aa78',
  fat:      '#5b9bd5',
  training: '#7aafc8',
} as const

const Em = ({ e, size }: { e: string; size: number }) => (
  <span style={{ fontSize: size, lineHeight: 1, display: 'inline-block', userSelect: 'none' }}>{e}</span>
)

type MealDef = { name: string; label: string; renderIcon: (color: string, size: number) => ReactElement; color: string }

const MEALS: MealDef[] = [
  { name: 'Colazione',           label: 'Colazione',      color: C.carbs,   renderIcon: (_, s) => <Em e="☕" size={s} /> },
  { name: 'Spuntino mattina',    label: 'Sp. Mattina',    color: C.protein, renderIcon: (_, s) => <Em e="🍫" size={s} /> },
  { name: 'Pranzo',              label: 'Pranzo',         color: C.kcal,    renderIcon: (_, s) => <Em e="🍗" size={s} /> },
  { name: 'Spuntino pomeriggio', label: 'Sp. Pomeriggio', color: C.carbs,   renderIcon: (_, s) => <Em e="🍌" size={s} /> },
  { name: 'Cena',                label: 'Cena',           color: C.fat,     renderIcon: (_, s) => <Em e="🐟" size={s} /> },
]

type Exercise = { id: string; name: string }
type DashData = {
  totals:  { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  meals:   { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number; hasTennis?: boolean; exercises?: Exercise[] }
}

export default function DashboardPage() {
  const { userId, selectedDate, setSelectedDate, userProfile, workoutDataVersion } = useAppStore()
  const router = useRouter()
  const [data, setData]         = useState<DashData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [schedaInfo, setSchedaInfo] = useState<{ name: string; order: number; color?: string; weekOrder?: number | null } | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [tennisMeta, setTennisMeta] = useState<{ type: string; hours: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`workout_scheda_${selectedDate}`)
      setSchedaInfo(raw ? JSON.parse(raw) : null)
    } catch { setSchedaInfo(null) }
    try {
      const raw = localStorage.getItem(`tennis_meta_${selectedDate}`)
      setTennisMeta(raw ? JSON.parse(raw) : null)
    } catch { setTennisMeta(null) }
  }, [selectedDate])

  const refreshCompleted = useCallback(() => {
    try {
      const raw = localStorage.getItem('workout_completed_v1')
      const arr: string[] = raw ? JSON.parse(raw) : []
      setCompletedIds(new Set(arr))
    } catch { setCompletedIds(new Set()) }
  }, [])

  useEffect(() => { refreshCompleted() }, [refreshCompleted, selectedDate])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/dashboard?userId=${userId}&date=${selectedDate}`)
      setData(await r.json())
    } catch { setData(null) }
    setLoading(false)
  }, [userId, selectedDate])

  const refreshAll = useCallback(() => {
    fetchData()
    refreshCompleted()
  }, [fetchData, refreshCompleted])

  useEffect(() => { fetchData() }, [fetchData])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (workoutDataVersion > 0) refreshAll() }, [workoutDataVersion])
  useRefreshOnFocus(refreshAll)

  const t  = data?.totals  ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const tg = data?.targets ?? {
    calories: userProfile.targetCalories, protein: userProfile.targetProtein,
    carbs:    userProfile.targetCarbs,    fat:     userProfile.targetFat,
  }

  const calPct  = tg.calories > 0 ? Math.min(100, Math.round((t.calories / tg.calories) * 100)) : 0
  const calOver = t.calories > tg.calories
  const pct = (v: number, mx: number) => mx > 0 ? Math.min(100, Math.round((v / mx) * 100)) : 0

  const hasWorkout = data?.workout.exists || data?.workout.hasTennis || !!schedaInfo

  const pillLabel = schedaInfo
    ? (schedaInfo.weekOrder != null ? `WO ${schedaInfo.order} - W ${schedaInfo.weekOrder}` : `WO ${schedaInfo.order}`)
    : 'Allenamento'

  const completedExercises = (data?.workout.exercises ?? []).filter(ex =>
    completedIds.has(`${selectedDate}_${ex.id}`)
  )

  const swipe = useDateSwipe(selectedDate, setSelectedDate)

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: C.kcal, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none md:h-auto h-[calc(100dvh-7.5rem)]" {...swipe}>

      <div className="shrink-0">
        <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.kcal} schedaColor={schedaInfo?.color} />
      </div>

      {/* Macro card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 pt-2 pb-3 shrink-0">
        <p className="text-center text-[10px] font-bold uppercase tracking-widest mb-1.5"
          style={{ color: C.kcal }}>Macro</p>

        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: calOver ? '#f87171' : C.kcal }}>
              {t.calories}
            </span>
            <span className="text-sm font-medium text-gray-500">/ {tg.calories} kcal</span>
          </div>
          <span className="text-xl font-bold" style={{ color: calOver ? '#f87171' : C.kcal }}>
            {calOver ? `+${t.calories - tg.calories} kcal` : `${calPct}%`}
          </span>
        </div>

        <div className="h-1.5 rounded-full overflow-hidden mb-2.5"
          style={{ backgroundColor: C.kcal + '38' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Grassi',      val: t.fat,     tgt: tg.fat,     color: C.fat },
            { label: 'Carboidrati', val: t.carbs,   tgt: tg.carbs,   color: C.carbs },
            { label: 'Proteine',    val: t.protein, tgt: tg.protein, color: C.protein },
          ].map(m => (
            <div key={m.label}>
              <p className="text-[10px] font-bold mb-0.5" style={{ color: m.color }}>{m.label}</p>
              <p className="text-lg font-bold leading-none" style={{ color: m.color }}>
                {m.val}<span className="text-xs font-medium text-gray-500"> / {m.tgt} g</span>
              </p>
              <div className="h-1 rounded-full overflow-hidden mt-1"
                style={{ backgroundColor: m.color + '40' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-2 gap-2 min-h-0 flex-1">

        {/* PASTI */}
        <button onClick={() => router.push('/food/diary')}
          className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">

          <div className="px-3 py-2 border-b border-orange-200/70 dark:border-orange-900/50 shrink-0">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide"
              style={{ color: '#e8924a' }}>Pasti</p>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-2 py-1.5">
            {MEALS.map(({ name, label, renderIcon }) => {
              const m    = data?.meals.find(x => x.name === name)
              const kcal = m?.calories ?? 0
              const free = m?.isFree ?? false
              return (
                <div key={name} className="flex-1 flex flex-col">
                  <div className="flex items-center justify-center gap-1.5 py-2 min-h-[2.5rem] rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <span style={{ flexShrink: 0 }}>{free ? <Em e="🍟" size={20} /> : renderIcon('', 20)}</span>
                    <span className="text-[10px] font-bold truncate text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                  <div className="mt-0.5 text-center px-0.5 leading-tight flex-1 flex flex-col justify-start">
                    {free ? (
                      <>
                        <p className="text-xs font-semibold" style={{ color: C.carbs }}>Cheat meal</p>
                        <p className="text-xs">&nbsp;</p>
                      </>
                    ) : kcal > 0 ? (
                      <>
                        <p className="text-xs font-semibold" style={{ color: C.kcal }}>{kcal} kcal</p>
                        <p className="text-xs">
                          <span style={{ color: C.fat }}>G {m!.fat}</span>
                          <span className="text-gray-400 dark:text-gray-500"> · </span>
                          <span style={{ color: C.carbs }}>C {m!.carbs}</span>
                          <span className="text-gray-400 dark:text-gray-500"> · </span>
                          <span style={{ color: C.protein }}>P {m!.protein}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-400 dark:text-gray-500">—</p>
                        <p className="text-xs">&nbsp;</p>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </button>

        {/* ALLENAMENTO */}
        <button onClick={() => router.push('/training/diary')}
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">

          <div className="px-3 py-2 border-b border-blue-200/70 dark:border-blue-900/50 shrink-0">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide"
              style={{ color: C.training }}>Allenamento</p>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-1.5">

            {/* Pill */}
            {data?.workout.hasTennis && (data?.workout.exists || !!schedaInfo) ? (
              /* Combined: 5 flex-1 slots to align with food column */
              <div className="h-full flex flex-col">
                {/* Slot 1 — Tennis (aligns with Colazione) */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-center gap-1.5 py-2 min-h-[2.5rem] rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <span style={{ flexShrink: 0 }}><Em e="🎾" size={20} /></span>
                    <span className="text-[10px] font-bold truncate text-gray-500 dark:text-gray-400">Tennis</span>
                  </div>
                  <div className="mt-0.5 text-center px-0.5 leading-tight flex-1 flex flex-col justify-start">
                    {tennisMeta?.type || tennisMeta?.hours ? (
                      <>
                        <p className="text-xs font-semibold uppercase" style={{ color: C.training }}>{tennisMeta?.type ?? ''}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{tennisMeta?.hours ? `${tennisMeta.hours}h` : ''}&nbsp;</p>
                      </>
                    ) : (
                      <><p className="text-xs text-gray-400 dark:text-gray-500">—</p><p className="text-xs">&nbsp;</p></>
                    )}
                  </div>
                </div>
                {/* Slot 2 — Workout (aligns with Sp. Mattina) */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-center gap-1.5 py-2 min-h-[2.5rem] rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <span style={{ flexShrink: 0 }}><img src="/icon-training.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /></span>
                    <span className="text-[10px] font-bold truncate text-gray-500 dark:text-gray-400">{pillLabel}</span>
                  </div>
                  <div className="mt-0.5 px-0.5 leading-tight flex-1">
                    {schedaInfo && (
                      <p className="text-xs font-semibold truncate text-center" style={{ color: C.training }}>
                        {schedaInfo.name.replace(/^(workout|wo)\s*\d+\s*[—–\-]\s*/i, '').toUpperCase()}
                      </p>
                    )}
                    {completedExercises.map(ex => (
                      <div key={ex.id} className="flex items-center gap-1 py-0.5 text-left">
                        <Check size={9} className="shrink-0" style={{ color: C.training }} />
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate leading-tight">{ex.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Slots 3-5 — spacers (align with Pranzo, Sp. Pomeriggio, Cena) */}
                <div className="flex-1" />
                <div className="flex-1" />
                <div className="flex-1" />
              </div>
            ) : data?.workout.hasTennis ? (
              <>
                <div className="flex items-center justify-center gap-1.5 py-2 min-h-[2.5rem] rounded-2xl bg-gray-100 dark:bg-gray-800 mb-0.5">
                  <span style={{ flexShrink: 0 }}><Em e="🎾" size={20} /></span>
                  <span className="text-[10px] font-bold truncate text-gray-500 dark:text-gray-400">Tennis</span>
                </div>
                <div className="mt-0.5 text-center px-0.5 leading-tight h-[1.875rem] flex flex-col justify-center">
                  {tennisMeta?.type || tennisMeta?.hours ? (
                    <>
                      <p className="text-xs font-semibold capitalize" style={{ color: C.training }}>{tennisMeta?.type ?? ''}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{tennisMeta?.hours ? `${tennisMeta.hours}h` : ''}&nbsp;</p>
                    </>
                  ) : (
                    <><p className="text-xs text-gray-400 dark:text-gray-500">—</p><p className="text-xs">&nbsp;</p></>
                  )}
                </div>
              </>
            ) : (data?.workout.exists || !!schedaInfo) ? (
              <>
                <div className="flex items-center justify-center gap-1.5 py-2 min-h-[2.5rem] rounded-2xl bg-gray-100 dark:bg-gray-800 mb-0.5">
                  <span style={{ flexShrink: 0 }}><img src="/icon-training.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /></span>
                  <span className="text-[10px] font-bold truncate text-gray-500 dark:text-gray-400">{pillLabel}</span>
                </div>
                <div className="mt-0.5 px-0.5 leading-tight">
                  {schedaInfo && (
                    <p className="text-xs font-semibold truncate text-center" style={{ color: C.training }}>
                      {schedaInfo.name.replace(/^(workout|wo)\s*\d+\s*[—–\-]\s*/i, '').toUpperCase()}
                    </p>
                  )}
                  {completedExercises.map(ex => (
                    <div key={ex.id} className="flex items-center gap-1 py-0.5 text-left">
                      <Check size={9} className="shrink-0" style={{ color: C.training }} />
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate leading-tight">{ex.name}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 rounded-2xl mb-1"
                style={{ backgroundColor: '#b0b8c830' }}>
                <Em e="🛋️" size={18} />
                <span className="text-[10px] font-bold" style={{ color: '#b0b8c8' }}>Riposo</span>
              </div>
            )}

          </div>
        </button>

      </div>
    </div>
  )
}
