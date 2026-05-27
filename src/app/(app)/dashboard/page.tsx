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
        <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.kcal} schedaColor={schedaInfo?.color} />
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0 md:grid md:gap-3" style={{ gridTemplateRows: gridRows }}>

        {/* MACRO */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <p className="text-center text-sm font-bold uppercase tracking-widest py-1 shrink-0 border-b border-gray-100 dark:border-gray-800"
            style={{ color: C.kcal }}>Macro</p>

          <div className="flex-1 min-h-0 flex flex-col">

            {/* Kcal */}
            <div className="flex-1 flex flex-col justify-center px-3">
              <div className="flex items-baseline justify-between mb-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold leading-none" style={{ color: calOver ? '#f87171' : C.kcal }}>
                    {t.calories}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">/ {tg.calories} kcal</span>
                </div>
                <span className="text-sm font-extrabold" style={{ color: calOver ? '#f87171' : C.kcal }}>
                  {calOver ? `+${t.calories - tg.calories}` : `${calPct}%`}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: C.kcal + '30' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
              </div>
            </div>

            {/* G / C / P */}
            <div className="flex-1 grid grid-cols-3 gap-2 px-3 pb-2">
              {[
                { label: 'Grassi',      val: t.fat,     tgt: tg.fat,     color: C.fat },
                { label: 'Carboidrati', val: t.carbs,   tgt: tg.carbs,   color: C.carbs },
                { label: 'Proteine',    val: t.protein, tgt: tg.protein, color: C.protein },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-[8px] font-bold uppercase tracking-wide mb-0.5" style={{ color: m.color }}>{m.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold leading-none" style={{ color: m.color }}>{m.val}</span>
                    <span className="text-[10px] text-gray-500">/ {m.tgt} g</span>
                  </div>
                  <div className="shrink-0 rounded-full overflow-hidden mt-0.5" style={{ height: 4, backgroundColor: m.color + '30' }}>
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

          <div className="px-2 py-1.5 shrink-0 border-b border-gray-100 dark:border-gray-800">
            <p className="text-center text-sm font-bold uppercase tracking-wide"
              style={{ color: '#e8924a' }}>Pasti</p>
          </div>

          <div className="flex-1 min-h-0 px-1 py-2 grid grid-cols-5 gap-1">
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
                        <p className="text-sm font-bold text-center leading-tight" style={{ color: C.kcal }}><span className="text-xs font-medium">kcal </span>{kcal}</p>
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
          className="flex-1 md:flex-none bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl overflow-hidden flex flex-col text-left active:scale-[0.98] transition-transform">

          <div className="px-2 py-1.5 shrink-0 border-b border-gray-100 dark:border-gray-800">
            <p className="text-center text-sm font-bold uppercase tracking-wide"
              style={{ color: C.training }}>Allenamento</p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">

            {/* Calendario settimanale — full width, sopra le pills */}
            <div className="px-2 py-1.5 shrink-0 border-b border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((wd, i) => {
                  const entry      = data?.weekSummary?.find(e => e.date === wd)
                  const isToday    = wd === today
                  const isSelected = wd === selectedDate
                  return (
                    <div key={wd} className="flex flex-col items-center gap-0.5 py-1"
                      style={{ backgroundColor: isToday ? C.training + '22' : isSelected ? C.training + '12' : undefined, borderRadius: 9999 }}>
                      <span className="text-[10px] font-bold leading-none"
                        style={{ color: isToday ? C.training : isSelected ? C.training + 'bb' : '#9ca3af' }}>
                        {WEEK_LABELS[i]}
                      </span>
                      {entry?.hasGym && entry?.hasTennis ? (
                        <div className="mt-0.5" style={{ width: 26, height: 14, borderRadius: 9999, overflow: 'hidden', background: `linear-gradient(to right, #6abf6a calc(50% - 1px), white calc(50% - 1px), white calc(50% + 1px), ${C.training} calc(50% + 1px))`, flexShrink: 0 }} />
                      ) : entry?.hasGym ? (
                        <div className="mt-0.5" style={{ width: 26, height: 14, borderRadius: 9999, backgroundColor: C.training, flexShrink: 0 }} />
                      ) : entry?.hasTennis ? (
                        <div className="mt-0.5" style={{ width: 26, height: 14, borderRadius: 9999, backgroundColor: '#6abf6a', flexShrink: 0 }} />
                      ) : (
                        <div className="mt-0.5" style={{ width: 26, height: 14, borderRadius: 9999, border: '1.5px solid #d1d5db', flexShrink: 0 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pills — 2 colonne */}
            <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800 overflow-y-auto">

              {/* Colonna sinistra — Tennis */}
              <div className="px-2 py-1.5">
                {data?.workout.hasTennis ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-gray-200 dark:bg-gray-700">
                      <Em e="🎾" size={16} />
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">TENNIS</span>
                    </div>
                    {tennisMeta && (
                      <p className="text-xs font-semibold px-1" style={{ color: C.training }}>
                        {(`${tennisMeta.type}${tennisMeta.hours ? ` - ${tennisMeta.hours}H` : ''}`).toUpperCase()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-gray-200 dark:bg-gray-700">
                    <Em e="🎾" size={16} />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">Riposo</span>
                  </div>
                )}
              </div>

              {/* Colonna destra — Palestra */}
              <div className="px-2 py-1.5 overflow-y-auto">
                {data?.workout.exists ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-gray-200 dark:bg-gray-700">
                      <img src="/icon-training.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">PALESTRA</span>
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
                          <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{ex.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-gray-200 dark:bg-gray-700">
                    <Em e="🛋️" size={16} />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">Riposo</span>
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
