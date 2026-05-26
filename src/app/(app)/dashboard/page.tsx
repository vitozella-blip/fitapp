'use client'
import React, { useEffect, useState, useCallback, type ReactElement } from 'react'
import { Check, Minus, X, LayoutDashboard } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { localToday } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { DateNav } from '@/components/shared/DateNav'
import { PageHeader } from '@/components/shared/PageHeader'
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
  meals:   { name: string; isFree?: boolean; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number; hasTennis?: boolean; exercises?: Exercise[] }
  schedaInfo: { templateId: string; name: string; order: number; color?: string; weekId?: string | null; weekName?: string | null; weekOrder?: number | null } | null
  tennisMeta: { type: string; hours: string } | null
}

export default function DashboardPage() {
  const { userId, userProfile, workoutDataVersion } = useAppStore()
  const [selectedDate, setSelectedDate] = useState(localToday)
  const router = useRouter()
  const [data, setData]         = useState<DashData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [schedaInfo, setSchedaInfo] = useState<{ name: string; order: number; color?: string; weekOrder?: number | null } | null>(null)
  type ExStatus = 'done' | 'partial' | 'skipped'
  const [exStatusMap, setExStatusMap] = useState<Record<string, ExStatus>>({})
  const [tennisMeta, setTennisMeta] = useState<{ type: string; hours: string } | null>(null)

  const refreshCompleted = useCallback(() => {
    fetch(`/api/exercise-completion?userId=${userId}`)
      .then(r => r.json())
      .then((arr: string[]) => {
        // API gives 'done' keys; merge with localStorage for partial/skipped
        const map: Record<string, ExStatus> = {}
        arr.forEach(k => { map[k] = 'done' })
        try {
          const local = JSON.parse(localStorage.getItem('workout_ex_status_v2') ?? '{}')
          for (const [k, v] of Object.entries(local)) {
            if (v === 'partial' || v === 'skipped') map[k] = v as ExStatus
          }
        } catch {}
        setExStatusMap(map)
      })
      .catch(() => {
        try { setExStatusMap(JSON.parse(localStorage.getItem('workout_ex_status_v2') ?? '{}')) }
        catch { setExStatusMap({}) }
      })
  }, [userId])

  useEffect(() => { refreshCompleted() }, [refreshCompleted, selectedDate])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/dashboard?userId=${userId}&date=${selectedDate}`)
      const d: DashData = await r.json()
      setData(d)
      if (d?.schedaInfo) {
        setSchedaInfo({ name: d.schedaInfo.name, order: d.schedaInfo.order, color: d.schedaInfo.color, weekOrder: d.schedaInfo.weekOrder ?? null })
      } else {
        // Fallback to localStorage for data not yet migrated to DB
        try {
          const raw = localStorage.getItem(`workout_scheda_${selectedDate}`)
          setSchedaInfo(raw ? JSON.parse(raw) : null)
        } catch { setSchedaInfo(null) }
      }
      if (d?.tennisMeta) {
        setTennisMeta(d.tennisMeta)
      } else {
        try {
          const raw = localStorage.getItem(`tennis_meta_${selectedDate}`)
          setTennisMeta(raw ? JSON.parse(raw) : null)
        } catch { setTennisMeta(null) }
      }
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

  const exercisesWithStatus = (data?.workout.exercises ?? [])
    .map(ex => ({ ...ex, status: exStatusMap[`${selectedDate}_${ex.id}`] ?? null }))
    .filter(ex => ex.status !== null)

  const swipe = useDateSwipe(selectedDate, setSelectedDate)

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: C.kcal, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none md:h-full" {...swipe}>

      <div className="shrink-0">
        <PageHeader title="Dashboard" icon={LayoutDashboard} accent="primary" />
      </div>

      <div className="shrink-0">
        <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.kcal} schedaColor={schedaInfo?.color} />
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0 md:grid md:gap-3" style={{ gridTemplateRows: '1fr 1fr 1fr' }}>

        {/* MACRO */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <p className="text-center text-sm font-bold uppercase tracking-widest py-1.5 shrink-0"
            style={{ color: C.kcal }}>Macro</p>

          <div className="flex-1 min-h-0 flex flex-col">

            {/* Kcal */}
            <div className="flex-1 flex flex-col justify-center px-4 gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold leading-none" style={{ color: calOver ? '#f87171' : C.kcal }}>
                  {t.calories}
                </span>
                <span className="text-sm text-gray-400 font-medium">/ {tg.calories} kcal</span>
                <span className="ml-auto text-xl font-extrabold" style={{ color: calOver ? '#f87171' : C.kcal }}>
                  {calOver ? `+${t.calories - tg.calories}` : `${calPct}%`}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.kcal + '30' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
              </div>
            </div>

            {/* G / C / P */}
            <div className="flex-1 grid grid-cols-3">
              {[
                { label: 'Grassi',      val: t.fat,     tgt: tg.fat,     color: C.fat },
                { label: 'Carboidrati', val: t.carbs,   tgt: tg.carbs,   color: C.carbs },
                { label: 'Proteine',    val: t.protein, tgt: tg.protein, color: C.protein },
              ].map(m => (
                <div key={m.label} className="flex flex-col justify-center gap-1.5 px-3">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: m.color }}>{m.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base md:text-2xl font-extrabold leading-none" style={{ color: m.color }}>{m.val}</span>
                    <span className="text-[10px] md:text-xs text-gray-400 font-medium whitespace-nowrap">/ {m.tgt} g</span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: m.color + '30' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* PASTI — meals in a horizontal row */}
        <button onClick={() => router.push('/food/diary')}
          className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 rounded-2xl overflow-hidden flex flex-col text-left active:scale-[0.98] transition-transform">

          <div className="px-3 py-2 shrink-0">
            <p className="text-center text-sm font-bold uppercase tracking-wide"
              style={{ color: '#e8924a' }}>Pasti</p>
          </div>

          <div className="flex-1 min-h-0 px-2 py-2 grid grid-cols-5 gap-1.5">
            {MEALS.map(({ name, label, renderIcon }) => {
              const m    = data?.meals.find(x => x.name === name)
              const kcal = m?.calories ?? 0
              const free = m?.isFree ?? false
              return (
                <div key={name} className="flex flex-col min-h-0 min-w-0">
                  <div className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0">
                    {renderIcon('', 16)}
                    <span className="hidden md:inline text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight truncate">{label}</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-0.5 px-1 pt-1">
                    {free ? (
                      <p className="text-sm font-semibold text-center" style={{ color: C.carbs }}>Cheat</p>
                    ) : kcal > 0 ? (
                      <>
                        <p className="text-sm font-bold text-center leading-tight" style={{ color: C.kcal }}>{kcal} <span className="text-xs font-medium">kcal</span></p>
                        <p className="text-sm font-semibold leading-tight text-center"><span style={{ color: C.fat }}>G </span><span style={{ color: C.fat }}>{m!.fat}</span></p>
                        <p className="text-sm font-semibold leading-tight text-center"><span style={{ color: C.carbs }}>C </span><span style={{ color: C.carbs }}>{m!.carbs}</span></p>
                        <p className="text-sm font-semibold leading-tight text-center"><span style={{ color: C.protein }}>P </span><span style={{ color: C.protein }}>{m!.protein}</span></p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 text-center">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </button>

        {/* ALLENAMENTO */}
        <button onClick={() => router.push('/training/diary')}
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl overflow-hidden flex flex-col text-left active:scale-[0.98] transition-transform">

          <div className="px-3 py-2 shrink-0">
            <p className="text-center text-sm font-bold uppercase tracking-wide"
              style={{ color: C.training }}>Allenamento</p>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-2">

            {/* Colonna sinistra — Tennis */}
            <div className="px-3 py-2 overflow-y-auto">
              {data?.workout.hasTennis ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-gray-200 dark:bg-gray-700">
                    <Em e="🎾" size={18} />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 capitalize">
                      {tennisMeta?.type ?? 'Tennis'}
                    </span>
                  </div>
                  {tennisMeta?.hours && (
                    <p className="text-xs font-semibold px-1" style={{ color: C.training }}>{tennisMeta.hours}h</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-gray-200 dark:bg-gray-700">
                  <Em e="🎾" size={18} />
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">Riposo</span>
                </div>
              )}
            </div>

            {/* Colonna destra — Allenamento */}
            <div className="px-3 py-2 overflow-y-auto">
              {data?.workout.exists ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-gray-200 dark:bg-gray-700">
                    <img src="/icon-training.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">{pillLabel}</span>
                  </div>
                  {schedaInfo && (
                    <p className="text-xs font-semibold px-1" style={{ color: C.training }}>
                      {schedaInfo.name.replace(/^(workout|wo)\s*\d+\s*[—–\-]\s*/i, '').toUpperCase()}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5 px-1 md:grid md:grid-cols-3 md:gap-x-1">
                    {exercisesWithStatus.slice(0, 12).map(ex => (
                      <div key={ex.id} className="flex items-center gap-1 min-w-0">
                        {ex.status === 'done'    && <Check  size={9} className="shrink-0" style={{ color: '#7dbf7d' }} />}
                        {ex.status === 'partial' && <Minus  size={9} className="shrink-0" style={{ color: '#f0aa78' }} />}
                        {ex.status === 'skipped' && <X      size={9} className="shrink-0" style={{ color: '#94a3b8' }} />}
                        <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{ex.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-gray-200 dark:bg-gray-700">
                  <Em e="🛋️" size={18} />
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">Riposo</span>
                </div>
              )}
            </div>

          </div>
        </button>

      </div>{/* end 3-col wrapper */}
    </div>
  )
}
