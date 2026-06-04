'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Check, Minus, X, LayoutDashboard, ChevronRight, Dumbbell } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { localToday } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { DateNav } from '@/components/shared/DateNav'
import { PageHeader } from '@/components/shared/PageHeader'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { useDateSwipe } from '@/hooks/useDateSwipe'
import { MACRO, SECTION, ACTIVITY, alpha } from '@/lib/theme'
import { MealIcon, TennisBall, TennisBadge } from '@/components/shared/icons'

const C = {
  kcal:     MACRO.kcal,
  protein:  MACRO.protein,
  carbs:    MACRO.carbs,
  fat:      MACRO.fat,
  training: SECTION.training,
} as const

const MEALS = [
  { name: 'Colazione',           short: 'Col.' },
  { name: 'Spuntino mattina',    short: 'Mat.' },
  { name: 'Pranzo',              short: 'Pra.' },
  { name: 'Spuntino pomeriggio', short: 'Pom.' },
  { name: 'Cena',                short: 'Cen.' },
]

type Exercise = { id: string; name: string }
type DashData = {
  totals:  { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  meals:   { name: string; isFree?: boolean; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number; hasTennis?: boolean; exercises?: Exercise[] }
  schedaInfo: { templateId: string; name: string; order: number; color?: string; weekId?: string | null; weekName?: string | null; weekOrder?: number | null } | null
  tennisMeta: { type: string; hours: string } | null
  weekSummary: { date: string; hasGym: boolean; hasTennis: boolean }[]
}

const WEEK_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function getISOWeekDates(isoDate: string): string[] {
  const d = new Date(isoDate + 'T00:00:00')
  const dow = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon)
    dd.setDate(mon.getDate() + i)
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
  })
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

  // Quanto resta al target (grassi / carbo / proteine)
  const left = {
    calories: Math.max(0, tg.calories - t.calories),
    fat:      Math.max(0, tg.fat - t.fat),
    carbs:    Math.max(0, tg.carbs - t.carbs),
    protein:  Math.max(0, tg.protein - t.protein),
  }

  const hasWorkout = data?.workout.exists || data?.workout.hasTennis || !!schedaInfo

  const abbrevName = (name: string) => {
    const m = name.match(/(?:workout|wo)\s*\d+\s*[—–\-]+\s*(.+)/i)
    if (!m) return name.slice(0, 4).toUpperCase()
    return m[1].trim().split(/[\s+&,]+/).filter(Boolean).map((w: string) => w[0].toUpperCase()).join('')
  }

  const gymSubtitle = schedaInfo
    ? (schedaInfo.weekOrder != null
        ? `WO ${schedaInfo.order} - ${abbrevName(schedaInfo.name)} - W${schedaInfo.weekOrder}`
        : `WO ${schedaInfo.order} - ${abbrevName(schedaInfo.name)}`)
    : null

  const exercisesWithStatus = (data?.workout.exercises ?? [])
    .map(ex => ({ ...ex, status: exStatusMap[`${selectedDate}_${ex.id}`] ?? null }))
    .filter(ex => ex.status !== null)

  const weekDates = getISOWeekDates(selectedDate)
  const today = localToday()

  // D — layout adattivo: più spazio a MACRO/PASTI quando ALLENAMENTO è vuota
  const gridRows = data?.workout.exists ? '1fr 1fr 1.2fr' : '1.1fr 1fr 0.9fr'

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
        <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.kcal} schedaColor={schedaInfo?.color} controlColor="#9d8fcc" />
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0 md:grid md:gap-3" style={{ gridTemplateRows: gridRows }}>

        {/* MACRO — al posto dei pasti, con ordine: kcal → 3 macro → Ti restano */}
        <button onClick={() => router.push('/food/diary')}
          className="surface bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left active:scale-[0.98] transition-transform"
          style={{ borderTopWidth: 3, borderTopColor: '#9ca3af' }}>
          <div className="flex-1 min-h-0 flex flex-col justify-center gap-2.5 px-4 py-3">

            {/* Titolo + legenda */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Macro</p>
              <div className="flex items-center gap-2.5 flex-wrap justify-end">
                {[['Calorie', C.kcal], ['Grassi', C.fat], ['Carboidrati', C.carbs], ['Proteine', C.protein]].map(([lbl, col]) => (
                  <span key={lbl} className="flex items-center gap-1">
                    <span style={{ width: 7, height: 7, borderRadius: 9999, backgroundColor: col, display: 'inline-block' }} />
                    <span className="text-[10px] text-gray-400">{lbl}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Kcal */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: calOver ? '#f87171' : C.kcal, display: 'inline-block' }} />
                <span className="text-3xl font-extrabold leading-none tracking-tight" style={{ color: calOver ? '#f87171' : C.kcal }}>{t.calories}</span>
                <span className="text-xs text-gray-400 font-medium">/ {tg.calories} kcal</span>
              </div>
              <span className="text-lg font-extrabold" style={{ color: calOver ? '#f87171' : C.kcal }}>
                {calOver ? `+${t.calories - tg.calories}` : `${calPct}%`}
              </span>
            </div>

            {/* Barra calorie */}
            <div className="h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
            </div>

            {/* 3 Macro */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: t.fat,     tgt: tg.fat,     color: C.fat },
                { val: t.carbs,   tgt: tg.carbs,   color: C.carbs },
                { val: t.protein, tgt: tg.protein, color: C.protein },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span style={{ width: 7, height: 7, borderRadius: 9999, backgroundColor: m.color, display: 'inline-block' }} />
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{m.val}<span className="text-gray-400 font-medium">/{m.tgt} g</span></span>
                  </div>
                  <div className="rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800" style={{ height: 6 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Ti restano */}
            <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: C.kcal + '1f' }}>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Ti restano</span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-extrabold" style={{ color: C.kcal }}>{left.calories}<span className="text-[10px] font-medium text-gray-400"> kcal</span></span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[13px] font-medium" style={{ color: C.fat }}>{left.fat}<span className="text-[9px] text-gray-400">g</span></span>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-[13px] font-medium" style={{ color: C.carbs }}>{left.carbs}<span className="text-[9px] text-gray-400">g</span></span>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-[13px] font-medium" style={{ color: C.protein }}>{left.protein}<span className="text-[9px] text-gray-400">g</span></span>
              </span>
            </div>

          </div>
        </button>

        {/* PASTI */}
        <button onClick={() => router.push('/food/diary')}
          className="surface bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left active:scale-[0.98] transition-transform"
          style={{ borderTopWidth: 3, borderTopColor: SECTION.food }}>
          <div className="px-3 py-1.5 shrink-0 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Pasti</p>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </div>
          <div className="flex-1 min-h-0 px-1 py-2 grid grid-cols-5 gap-1">
            {MEALS.map(({ name, short }) => {
              const m    = data?.meals.find(x => x.name === name)
              const kcal = m?.calories ?? 0
              const free = m?.isFree ?? false
              const done = free || kcal > 0
              return (
                <div key={name} className="flex flex-col min-h-0 min-w-0">
                  <div className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl shrink-0 bg-gray-100 dark:bg-gray-800">
                    <MealIcon name={name} size={16} color={done ? SECTION.food : '#9ca3af'} />
                    <span className="text-[9px] font-bold leading-none" style={{ color: done ? SECTION.food : '#9ca3af' }}>{short}</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-0.5 px-1 pt-1">
                    {free ? (
                      <p className="text-sm font-semibold text-center" style={{ color: C.carbs }}>Cheat</p>
                    ) : kcal > 0 ? (
                      <>
                        <span className="flex items-center justify-center gap-1 leading-tight">
                          <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: C.kcal, display: 'inline-block', flexShrink: 0 }} />
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{kcal}</span>
                        </span>
                        {([['fat', m!.fat], ['carbs', m!.carbs], ['protein', m!.protein]] as const).map(([k, v]) => (
                          <span key={k} className="flex items-center justify-center gap-1 leading-tight">
                            <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: C[k], display: 'inline-block', flexShrink: 0 }} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{v}</span>
                          </span>
                        ))}
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
          className="surface flex-1 md:flex-none bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left active:scale-[0.98] transition-transform"
          style={{ borderTopWidth: 3, borderTopColor: C.training }}>

          <div className="px-3 py-1.5 shrink-0 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Allenamento</p>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">

            {/* Calendario settimanale — full width, sopra le pills */}
            <div className="px-2 py-1.5 shrink-0 border-b border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((wd, i) => {
                  const entry      = data?.weekSummary?.find(e => e.date === wd)
                  const isToday    = wd === today
                  const isSelected = wd === selectedDate
                  const circle = 'mt-0.5 rounded-full flex items-center justify-center shrink-0'
                  return (
                    <div key={wd} className="flex flex-col items-center gap-0.5 py-1">
                      <span className="text-[10px] font-bold leading-none"
                        style={{ color: isToday ? C.training : isSelected ? C.training + 'bb' : '#9ca3af' }}>
                        {WEEK_LABELS[i]}
                      </span>
                      {entry?.hasGym && entry?.hasTennis ? (
                        <div className={circle} style={{ position: 'relative', width: 22, height: 22, overflow: 'hidden', background: `linear-gradient(135deg, ${ACTIVITY.gym} 0 50%, #c8a800 50% 100%)` }}>
                          <Dumbbell size={9} color="#fff" style={{ position: 'absolute', top: 2, left: 1.5 }} />
                          <span style={{ position: 'absolute', bottom: 1.5, right: 1 }}><TennisBall size={9} color="#fff" strokeWidth={2.4} /></span>
                        </div>
                      ) : entry?.hasGym ? (
                        <div className={circle} style={{ width: 22, height: 22, backgroundColor: ACTIVITY.gym }}>
                          <Dumbbell size={11} color="#fff" />
                        </div>
                      ) : entry?.hasTennis ? (
                        <TennisBadge size={22} />
                      ) : (
                        <div className={circle} style={{ width: 22, height: 22, border: `1.5px solid ${isToday ? C.training : '#d1d5db'}` }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pills — 2 colonne */}
            <div className="flex-1 min-h-0 grid grid-cols-2 overflow-y-auto">

              {/* Colonna sinistra — Tennis */}
              <div className="px-2 py-1.5">
                {data?.workout.hasTennis ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl" style={{ backgroundColor: alpha(ACTIVITY.tennis, 0.16) }}>
                      <TennisBall size={15} color={ACTIVITY.tennis} strokeWidth={2} />
                      <span className="text-[10px] font-bold" style={{ color: ACTIVITY.tennis }}>TENNIS</span>
                    </div>
                    {tennisMeta && (
                      <p className="text-xs font-semibold px-1" style={{ color: C.training }}>
                        {(`${tennisMeta.type}${tennisMeta.hours ? ` - ${tennisMeta.hours}H` : ''}`).toUpperCase()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                    <TennisBall size={15} color="#9ca3af" strokeWidth={2} />
                    <span className="text-[10px] font-bold text-gray-400">Riposo</span>
                  </div>
                )}
              </div>

              {/* Colonna destra — Palestra */}
              <div className="px-2 py-1.5 overflow-y-auto">
                {data?.workout.exists ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl" style={{ backgroundColor: alpha(ACTIVITY.gym, 0.16) }}>
                      <Dumbbell size={15} color={ACTIVITY.gym} strokeWidth={2} />
                      <span className="text-[10px] font-bold" style={{ color: ACTIVITY.gym }}>PALESTRA</span>
                    </div>
                    {gymSubtitle && (
                      <p className="text-xs font-semibold px-1" style={{ color: C.training }}>{gymSubtitle}</p>
                    )}
                    <div className="flex flex-col gap-0.5 px-1 md:grid md:grid-cols-3 md:gap-x-1">
                      {exercisesWithStatus.slice(0, 12).map(ex => (
                        <div key={ex.id} className="flex items-center gap-1 min-w-0">
                          {ex.status === 'done'    && <Check size={9} className="shrink-0" style={{ color: '#7dbf7d' }} />}
                          {ex.status === 'partial' && <Minus size={9} className="shrink-0" style={{ color: '#f0aa78' }} />}
                          {ex.status === 'skipped' && <X     size={9} className="shrink-0" style={{ color: '#94a3b8' }} />}
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{ex.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                    <Dumbbell size={15} color="#9ca3af" strokeWidth={2} />
                    <span className="text-[10px] font-bold text-gray-400">Riposo</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </button>

      </div>{/* end 3-col wrapper */}
    </div>
  )
}
