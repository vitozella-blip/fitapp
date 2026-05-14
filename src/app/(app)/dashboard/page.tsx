'use client'
import React from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const C = {
  kcal:     '#9d8fcc',
  protein:  '#7dbf7d',
  carbs:    '#f0aa78',
  fat:      '#c4a0d6',
  training: '#7aafc8',
} as const

const C_TENNIS_BALL = '#c8c040'   // pallina giallo pastello
const C_TENNIS_BG   = '#f5f09820' // pill bg giallo chiarissimo

const MealIcon = ({ type, size = 22 }: { type: string; size?: number }) => {
  const s = size
  const icons: Record<string, React.ReactElement> = {
    colazione: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18Q8 10 12 10Q16 10 20 18"/>
        <path d="M4 18Q8 15 12 15Q16 15 20 18"/>
        <path d="M12 10C11.5 7 11.5 5 12 3C12.5 5 12.5 7 12 10"/>
        <path d="M7.5 15L12 10"/><path d="M16.5 15L12 10"/>
      </svg>
    ),
    spuntino_m: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 8h8l-1.5 11h-5z"/>
        <path d="M8 8V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
        <path d="M11 12.5h2M10.5 16h3"/>
      </svg>
    ),
    pranzo: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="18" x2="21" y2="18"/>
        <path d="M5 18a7 7 0 0 1 14 0"/>
        <path d="M10 11h4M12 11V9"/>
        <circle cx="19" cy="5" r="1.5"/>
        <path d="M19 2.5v.8M19 7.2v.8M16.5 5h.8M21.2 5h.8"/>
      </svg>
    ),
    spuntino_p: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20C5 15 8 9 14 7C19 6 22 9 21 13"/>
        <path d="M5 18C6 14 9 9 14 8"/>
        <path d="M21 13C20 16 17 18 13 18"/>
      </svg>
    ),
    cena: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="18" x2="21" y2="18"/>
        <path d="M5 18a7 7 0 0 1 14 0"/>
        <path d="M10 11h4M12 11V9"/>
        <g transform="translate(-1.5 1) scale(0.28)" strokeWidth={1.7 / 0.28}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </g>
      </svg>
    ),
  }
  return icons[type] ?? icons.pranzo
}

/* Pallina da tennis con cucitura S */
const TennisBallIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" fill={C_TENNIS_BALL + '40'} stroke={C_TENNIS_BALL} strokeWidth="1.5"/>
    <path d="M5.5 5.5C8.5 8.5 8.5 15.5 5.5 18.5" stroke={C_TENNIS_BALL} strokeWidth="1.5"/>
    <path d="M18.5 5.5C15.5 8.5 15.5 15.5 18.5 18.5" stroke={C_TENNIS_BALL} strokeWidth="1.5"/>
  </svg>
)

/* Manubrio */
const DumbbellIcon = ({ size = 22, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12h11"/>
    <path d="M5.5 8.5v7M18.5 8.5v7"/>
    <path d="M3 10v4M21 10v4"/>
  </svg>
)

const MEALS = [
  { name: 'Colazione',           label: 'Colazione',  icon: 'colazione',  color: C.carbs },
  { name: 'Spuntino mattina',    label: 'Mattina',    icon: 'spuntino_m', color: C.protein },
  { name: 'Pranzo',              label: 'Pranzo',     icon: 'pranzo',     color: C.kcal },
  { name: 'Spuntino pomeriggio', label: 'Pomeriggio', icon: 'spuntino_p', color: C.carbs },
  { name: 'Cena',                label: 'Cena',       icon: 'cena',       color: C.fat },
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
  const [data, setData]       = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [schedaInfo, setSchedaInfo] = useState<{ name: string; order: number } | null>(null)

  const today   = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

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
  const onlyTennis = !data?.workout.exists && data?.workout.hasTennis

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: C.kcal, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none md:h-auto h-[calc(100dvh-7.5rem)]">

      {/* ── DATE NAV ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 flex items-center gap-2 shrink-0">
        <button onClick={() => changeDate(-1)}
          className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors">
          <ChevronLeft size={17} />
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">
          {dateLabel}
        </p>
        {!isToday && (
          <button onClick={() => setSelectedDate(today)}
            className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: C.kcal + 'cc' }}>
            Oggi
          </button>
        )}
        <button onClick={() => changeDate(1)} disabled={isToday}
          className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 shrink-0 transition-colors',
            isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}>
          <ChevronRight size={17} />
        </button>
      </div>

      {/* ── MACRO CARD ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 pt-3 pb-4 shrink-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Macro</p>

        {/* Calorie + % stessa riga */}
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold" style={{ color: calOver ? '#f87171' : C.kcal }}>
              {t.calories}
            </span>
            <span className="text-xs text-gray-400">kcal</span>
          </div>
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-lg',
            calOver ? 'bg-red-50 dark:bg-red-950/50 text-red-400' : 'text-white'
          )} style={!calOver ? { backgroundColor: C.kcal + 'cc' } : {}}>
            {calOver ? `+${t.calories - tg.calories}` : `${calPct}%`}
          </span>
        </div>

        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Proteine',    val: t.protein, tgt: tg.protein, color: C.protein },
            { label: 'Carboidrati', val: t.carbs,   tgt: tg.carbs,   color: C.carbs },
            { label: 'Grassi',      val: t.fat,     tgt: tg.fat,     color: C.fat },
          ].map(m => (
            <div key={m.label}>
              <p className="text-[11px] font-bold mb-1" style={{ color: m.color }}>{m.label}</p>
              <p className="text-sm font-bold leading-none text-gray-800 dark:text-gray-100">
                {m.val}
                <span className="text-[10px] font-medium text-gray-400"> / {m.tgt}g</span>
              </p>
              <div className="h-1.5 rounded-full overflow-hidden mt-1.5" style={{ backgroundColor: m.color + '22' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM CARDS ── */}
      <div className="grid grid-cols-2 gap-2 min-h-0 flex-1">

        {/* ────── PASTI ────── */}
        <button onClick={() => router.push('/food/diary')}
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pasti</p>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col justify-between px-2 py-2">
            {MEALS.map(({ name, label, icon, color }) => {
              const m    = data?.meals.find(x => x.name === name)
              const kcal = m?.calories ?? 0
              return (
                <div key={name}>
                  {/* Pillola centrata: icona + nome */}
                  <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl"
                    style={{ backgroundColor: color + '18' }}>
                    <span style={{ color }}><MealIcon type={icon} size={19} /></span>
                    <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
                  </div>
                  {/* Macro sotto la pillola */}
                  <div className="text-center mt-0.5">
                    {kcal > 0 ? (
                      <p className="text-[8px] leading-tight text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{kcal}</span>
                        {' kcal · '}
                        <span style={{ color: C.protein }}>P{m!.protein}</span>
                        {' '}
                        <span style={{ color: C.carbs }}>C{m!.carbs}</span>
                        {' '}
                        <span style={{ color: C.fat }}>G{m!.fat}</span>
                      </p>
                    ) : (
                      <p className="text-[8px] text-gray-300 dark:text-gray-600">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </button>

        {/* ────── ALLENAMENTO ────── */}
        <button onClick={() => router.push('/training/diary')}
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col text-left min-h-0 active:scale-[0.98] transition-transform">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Allenamento</p>
          </div>

          {hasWorkout ? (
            <div className="flex-1 overflow-hidden flex flex-col p-2.5 gap-2 min-h-0">

              {/* Pillola Tennis — larghezza piena */}
              {data?.workout.hasTennis && (
                <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl"
                  style={{ backgroundColor: C_TENNIS_BG }}>
                  <TennisBallIcon size={22} />
                  <span className="text-xs font-bold" style={{ color: C_TENNIS_BALL }}>Tennis</span>
                </div>
              )}

              {/* Pillola Allenamento — larghezza piena */}
              {data?.workout.exists && (
                <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl"
                  style={{ backgroundColor: C.training + '18' }}>
                  <DumbbellIcon size={22} color={C.training} />
                  <span className="text-xs font-bold" style={{ color: C.training }}>
                    {schedaInfo ? `WO ${schedaInfo.order}` : 'Allenamento'}
                  </span>
                </div>
              )}

              {/* Nome scheda */}
              {schedaInfo && data?.workout.exists && (
                <p className="text-[10px] font-semibold text-center truncate px-1 leading-tight"
                  style={{ color: C.training }}>
                  {schedaInfo.name}
                </p>
              )}

              {/* Lista esercizi */}
              {(data?.workout.exercises ?? []).length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                  {(data?.workout.exercises ?? []).map(ex => (
                    <div key={ex} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: C.training + '99' }} />
                      <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate leading-tight">{ex}</p>
                    </div>
                  ))}
                </div>
              )}

              {onlyTennis && (data?.workout.exercises ?? []).length === 0 && (
                <p className="text-[9px] text-center text-gray-400">Sessione completata</p>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-3 gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                style={{ color: '#b0b8c8' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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
