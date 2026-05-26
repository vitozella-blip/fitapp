'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { BookOpen, Apple, ShoppingCart, ChefHat, Target, CalendarDays } from 'lucide-react'

const COLOR = '#e8924a'
const C = { kcal: '#6abf6a', protein: '#9d8fcc', carbs: '#f0aa78', fat: '#5b9bd5' }

const SECTIONS = [
  { label: 'Diario Pasti',      href: '/food/diary',     icon: BookOpen },
  { label: 'Alimenti',          href: '/food/database',  icon: Apple },
  { label: 'Lista della Spesa', href: '/food/shopping',  icon: ShoppingCart },
  { label: 'Ricette',           href: '/food/recipes',   icon: ChefHat },
  { label: 'Completa Macro',    href: '/food/macros',    icon: Target },
  { label: 'Piano Alimentare',  href: '/food/plan',      icon: CalendarDays },
]

const MEAL_META: Record<string, { label: string; emoji: string }> = {
  'Colazione':           { label: 'Colazione',  emoji: '☕' },
  'Spuntino mattina':    { label: 'Sp. Mattina', emoji: '🍫' },
  'Pranzo':              { label: 'Pranzo',      emoji: '🍗' },
  'Spuntino pomeriggio': { label: 'Sp. Pom.',    emoji: '🍌' },
  'Cena':                { label: 'Cena',        emoji: '🐟' },
}

type MacroData = {
  totals:  { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
}

type StatsData = {
  days: number
  avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number
  meals: { name: string; avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number }[]
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FoodHubPage() {
  const { userId, selectedDate, userProfile } = useAppStore()
  const [data, setData] = useState<MacroData | null>(null)

  const today = selectedDate
  const firstOfMonth = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo]     = useState(today)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/dashboard?userId=${userId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }, [userId, selectedDate])

  useEffect(() => {
    if (!from || !to || from > to) return
    setStatsLoading(true)
    fetch(`/api/food-stats?userId=${userId}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [userId, from, to])

  const t  = data?.totals  ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const tg = data?.targets ?? {
    calories: userProfile.targetCalories, protein: userProfile.targetProtein,
    carbs:    userProfile.targetCarbs,    fat:     userProfile.targetFat,
  }
  const calPct  = tg.calories > 0 ? Math.min(100, Math.round((t.calories / tg.calories) * 100)) : 0
  const calOver = t.calories > tg.calories
  const pct = (v: number, mx: number) => mx > 0 ? Math.min(100, Math.round((v / mx) * 100)) : 0

  const avgCalOver = stats ? stats.avgCalories > tg.calories : false
  const avgCalPct  = stats && tg.calories > 0 ? Math.min(100, Math.round((stats.avgCalories / tg.calories) * 100)) : 0

  return (
    <div className="max-w-2xl mx-auto md:max-w-none flex flex-col gap-2 md:gap-4 h-full">

      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/icon-food.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alimentazione</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestisci la tua nutrizione</p>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-2 md:gap-4 flex-1 min-h-0" style={{ gridTemplateRows: '1fr 0.75fr' }}>

        {/* TOP — statistics */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col min-h-0">

          <div className="px-4 pt-3 pb-2 shrink-0 border-b border-gray-100 dark:border-gray-800"
            style={{ backgroundColor: COLOR + '12' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: COLOR }}>Statistiche</p>
              <div className="flex items-center gap-1.5 flex-1">
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-orange-300" style={{ width: 110 }} />
                <span className="text-[10px] text-gray-400 shrink-0">→</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-orange-300" style={{ width: 110 }} />
                {from && to && from <= to && (
                  <span className="text-[10px] font-semibold shrink-0" style={{ color: COLOR }}>
                    {Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1} giorni
                  </span>
                )}
              </div>
            </div>
          </div>

          {statsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLOR, borderTopColor: 'transparent' }} />
            </div>
          ) : !stats || stats.days === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">Nessun dato nel periodo selezionato</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 grid overflow-hidden" style={{ gridTemplateRows: '1fr 1fr' }}>

              {/* Row 1 — avg macros */}
              <div className="px-4 py-3 min-h-0 border-b border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-gray-400">Media giornaliera</p>
                <div className="flex items-baseline justify-between mb-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold leading-none" style={{ color: avgCalOver ? '#f87171' : C.kcal }}>
                      {stats.avgCalories}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">/ {tg.calories} kcal</span>
                  </div>
                  <span className="text-sm font-extrabold" style={{ color: avgCalOver ? '#f87171' : C.kcal }}>
                    {avgCalOver ? `+${stats.avgCalories - tg.calories}` : `${avgCalPct}%`}
                  </span>
                </div>
                <div className="shrink-0 rounded-full overflow-hidden mb-2" style={{ height: 8, backgroundColor: C.kcal + '40' }}>
                  <div style={{ height: '100%', width: `${avgCalPct}%`, borderRadius: 9999, backgroundColor: avgCalOver ? '#f87171' : C.kcal }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Grassi',      val: stats.avgFat,     tgt: tg.fat,     color: C.fat },
                    { label: 'Carboidrati', val: stats.avgCarbs,   tgt: tg.carbs,   color: C.carbs },
                    { label: 'Proteine',    val: stats.avgProtein, tgt: tg.protein, color: C.protein },
                  ].map(m => (
                    <div key={m.label}>
                      <p className="text-[8px] font-bold uppercase tracking-wide mb-0.5 text-gray-400">{m.label}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold leading-none" style={{ color: m.color }}>{m.val}</span>
                        <span className="text-[10px] text-gray-500">/ {m.tgt} g</span>
                      </div>
                      <div className="shrink-0 rounded-full overflow-hidden mt-0.5" style={{ height: 4, backgroundColor: m.color + '30' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 2 — avg per meal (dashboard structure) */}
              <div className="flex-1 min-h-0 overflow-hidden px-2 py-2 grid grid-cols-5 gap-1.5">
                {stats.meals.map(meal => {
                  const meta = MEAL_META[meal.name]
                  const kcal = meal.avgCalories
                  return (
                    <div key={meal.name} className="flex flex-col min-h-0 min-w-0">
                      <div className="flex items-center justify-center py-2 px-1 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0">
                        <span style={{ fontSize: 18, lineHeight: 1, display: 'inline-block', userSelect: 'none' }}>{meta?.emoji}</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-0.5 px-1 pt-1">
                        {kcal > 0 ? (
                          <>
                            <p className="text-xs font-bold text-center leading-tight" style={{ color: C.kcal }}>{kcal}<span className="text-[10px] font-medium"> kcal</span></p>
                            <p className="text-xs font-semibold leading-tight text-center"><span style={{ color: C.fat }}>G </span><span style={{ color: C.fat }}>{meal.avgFat}</span></p>
                            <p className="text-xs font-semibold leading-tight text-center"><span style={{ color: C.carbs }}>C </span><span style={{ color: C.carbs }}>{meal.avgCarbs}</span></p>
                            <p className="text-xs font-semibold leading-tight text-center"><span style={{ color: C.protein }}>P </span><span style={{ color: C.protein }}>{meal.avgProtein}</span></p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 text-center">—</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          )}
        </div>

        {/* BOTTOM — quick links 3×2 */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 min-h-0" style={{ gridTemplateRows: '1fr 1fr' }}>
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}
              className="flex flex-col items-center justify-center gap-1.5 md:gap-3 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
              style={{ backgroundColor: COLOR + '20' }}>
              <s.icon className="!w-5 !h-5 md:!w-9 md:!h-9" style={{ color: COLOR }} />
              <span className="text-xs md:text-sm font-bold text-center leading-tight px-1 md:px-2" style={{ color: COLOR }}>{s.label}</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
