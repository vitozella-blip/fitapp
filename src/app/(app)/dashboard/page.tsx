'use client'
import React, { useEffect, useState, useCallback, type ReactElement } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DateNav } from '@/components/shared/DateNav'

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

type DashData = {
  totals:  { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
  meals:   { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  workout: { exists: boolean; exerciseCount?: number; setCount?: number; hasTennis?: boolean; exercises?: string[] }
}

export default function DashboardPage() {
  const { userId, selectedDate, setSelectedDate, userProfile } = useAppStore()
  const router = useRouter()
  const [data, setData]         = useState<DashData | null>(null)
  const [loading, setLoading]   = useState(true)
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
  const tg = data?.targets ?? {
    calories: userProfile.targetCalories, protein: userProfile.targetProtein,
    carbs:    userProfile.targetCarbs,    fat:     userProfile.targetFat,
  }

  const calPct  = tg.calories > 0 ? Math.min(100, Math.round((t.calories / tg.calories) * 100)) : 0
  const calOver = t.calories > tg.calories
  const pct = (v: number, mx: number) => mx > 0 ? Math.min(100, Math.round((v / mx) * 100)) : 0

  const hasWorkout = data?.workout.exists || data?.workout.hasTennis
  const onlyTennis = !data?.workout.exists && data?.workout.hasTennis

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: C.kcal, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none md:h-auto h-[calc(100dvh-7.5rem)]">

      {/* ── HEADER DATA ─────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.kcal} />
      </div>

      {/* ── CARD MACRO ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 pt-2 pb-3 shrink-0">

        {/* Titolo centrato */}
        <p className="text-center text-[10px] font-bold uppercase tracking-widest mb-1.5"
          style={{ color: C.kcal }}>Macro</p>

        {/* Calorie: 130 / 2450 kcal    7% */}
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

        {/* Barra calorie */}
        <div className="h-1.5 rounded-full overflow-hidden mb-2.5"
          style={{ backgroundColor: C.kcal + '38' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
        </div>

        {/* Macro — valori compatti */}
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

      {/* ── BOTTOM CARDS (50/50) ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 min-h-0 flex-1">

        {/* ────────── PASTI ────────── */}
        <button onClick={() => router.push('/food/diary')}
          className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">

          {/* Titolo centrato */}
          <div className="px-3 py-2 border-b border-orange-200/70 dark:border-orange-900/50 shrink-0">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide"
              style={{ color: '#e8924a' }}>Pasti</p>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col justify-between px-2 py-1.5 gap-0">
            {MEALS.map(({ name, label, renderIcon, color }) => {
              const m    = data?.meals.find(x => x.name === name)
              const kcal = m?.calories ?? 0
              return (
                <div key={name}>
                  {/* Pillola: icona + nome centrati */}
                  <div className="flex items-center justify-center gap-1.5 py-2 rounded-2xl"
                    style={{ backgroundColor: color + '28' }}>
                    <span style={{ flexShrink: 0 }}>
                      {renderIcon(color, 20)}
                    </span>
                    <span className="text-[10px] font-bold truncate" style={{ color }}>{label}</span>
                  </div>

                  {/* Macro sotto la pillola — 2 righe: kcal / G · C · P */}
                  <div className="mt-0.5 text-center px-0.5 leading-tight h-[1.875rem] flex flex-col justify-center">
                    {kcal > 0 ? (
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

        {/* ────────── ALLENAMENTO ────────── */}
        <button onClick={() => router.push('/training/diary')}
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">

          {/* Titolo centrato */}
          <div className="px-3 py-2 border-b border-blue-200/70 dark:border-blue-900/50 shrink-0">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide"
              style={{ color: C.training }}>Allenamento</p>
          </div>

          {/* 5 slot identici a PASTI: justify-between + stessa padding → allineamento riga per riga */}
          <div className="flex-1 overflow-hidden flex flex-col justify-between px-2 py-1.5 gap-0">

            {/* ── Slot 0: Tennis  |  Riposo  |  Workout-solo ── */}
            <div>
              {data?.workout.hasTennis ? (
                <div className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl"
                  style={{ backgroundColor: '#7aaa4028' }}>
                  <Em e="🎾" size={20} />
                  <span className="text-[10px] font-bold" style={{ color: '#7aaa40' }}>Tennis</span>
                </div>
              ) : data?.workout.exists ? (
                <div className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl"
                  style={{ backgroundColor: C.training + '28' }}>
                  <img src="/icon-training.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  <span className="text-[10px] font-bold" style={{ color: C.training }}>
                    {schedaInfo ? `WO ${schedaInfo.order}` : 'Allenamento'}
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl"
                  style={{ backgroundColor: '#b0b8c830' }}>
                  <Em e="🛋️" size={20} />
                  <span className="text-[10px] font-bold" style={{ color: '#b0b8c8' }}>Riposo</span>
                </div>
              )}
              {/* spacer = stessa altezza riga macro di PASTI */}
              <p className="text-xs leading-tight mt-0.5 text-center truncate px-1 h-[1.875rem] flex items-center justify-center"
                style={{ color: C.training, opacity: !data?.workout.hasTennis && !data?.workout.exists ? 0 : 1 }}>
                {!data?.workout.hasTennis && data?.workout.exists && schedaInfo ? schedaInfo.name : ' '}
              </p>
            </div>

            {/* ── Slot 1: Workout (solo se c'è anche Tennis) ── */}
            <div>
              <div className={cn(
                'w-full flex items-center justify-center gap-2 py-2 rounded-2xl',
                !(data?.workout.hasTennis && data?.workout.exists) && 'invisible'
              )} style={{ backgroundColor: C.training + '28' }}>
                <img src="/icon-training.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                <span className="text-[10px] font-bold" style={{ color: C.training }}>
                  {schedaInfo ? `WO ${schedaInfo.order}` : 'Allenamento'}
                </span>
              </div>
              <p className="text-xs leading-tight mt-0.5 text-center truncate px-1 h-[1.875rem] flex items-center justify-center"
                style={{ color: C.training }}>
                {data?.workout.hasTennis && data?.workout.exists && schedaInfo ? schedaInfo.name : ' '}
              </p>
            </div>

            {/* ── Slot 2-4: esercizi — min-h-9 mantiene stessa altezza delle pillole PASTI ── */}
            {[0, 1, 2].map(i => {
              const ex = (data?.workout.exercises ?? [])[i]
              return (
                <div key={i}>
                  <div className="flex items-center gap-1.5 px-1 min-h-9">
                    {ex ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: C.training + '99' }} />
                        <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate leading-tight">{ex}</p>
                      </>
                    ) : null}
                  </div>
                  <p className="text-xs leading-tight mt-0.5 h-[1.875rem]">&nbsp;</p>
                </div>
              )
            })}

          </div>
        </button>

      </div>
    </div>
  )
}
