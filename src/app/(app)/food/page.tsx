'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { localToday } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BookOpen, Apple, ShoppingCart, ChefHat, Target, CalendarDays } from 'lucide-react'

const COLOR = '#e8924a'
const C = { kcal: '#6abf6a', protein: '#9d8fcc', carbs: '#f0aa78', fat: '#5b9bd5' }

const DIARY  = { label: 'Diario Pasti', href: '/food/diary', icon: BookOpen }
const SECTIONS = [
  { label: 'Alimenti',          href: '/food/database',  icon: Apple },
  { label: 'Lista della Spesa', href: '/food/shopping',  icon: ShoppingCart },
  { label: 'Ricette',           href: '/food/recipes',   icon: ChefHat },
  { label: 'Completa Macro',    href: '/food/macros',    icon: Target },
  { label: 'Piano Alimentare',  href: '/food/plan',      icon: CalendarDays },
]

type Period = 'settimana' | 'mese' | 'mese_scorso' | 'custom'

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

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FoodHubPage() {
  const { userId, userProfile } = useAppStore()
  const [data, setData] = useState<MacroData | null>(null)

  const today = localToday()
  const [period, setPeriod] = useState<Period>('mese')
  const [from, setFrom] = useState(today.slice(0, 8) + '01')
  const [to, setTo]     = useState(today)

  function applyPeriod(p: Period) {
    setPeriod(p)
    const d = new Date(today + 'T00:00:00')
    if (p === 'settimana') {
      const f = new Date(d); f.setDate(d.getDate() - 6)
      setFrom(isoDate(f)); setTo(today)
    } else if (p === 'mese') {
      setFrom(today.slice(0, 8) + '01'); setTo(today)
    } else if (p === 'mese_scorso') {
      const first = new Date(d.getFullYear(), d.getMonth() - 1, 1)
      const last  = new Date(d.getFullYear(), d.getMonth(), 0)
      setFrom(isoDate(first)); setTo(isoDate(last))
    }
    // custom: leave from/to as-is
  }
  const [stats, setStats] = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/dashboard?userId=${userId}&date=${today}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }, [userId, today])

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
    <div className="max-w-2xl mx-auto md:max-w-none flex flex-col gap-2 md:gap-4 h-full min-h-0">

      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <img src="/icon-food.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alimentazione</h1>
      </div>

      {/* Body */}
      <div className="grid gap-2 md:gap-4 flex-1 min-h-0" style={{ gridTemplateRows: '1fr 0.75fr' }}>

        {/* TOP — statistics */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col min-h-0">

          <div className="px-2 py-2 shrink-0 border-b border-gray-100 dark:border-gray-800"
            style={{ backgroundColor: COLOR + '12' }}>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: COLOR }}>Statistiche</p>
              <div className="flex items-center gap-1 flex-1">
                {(['settimana', 'mese', 'mese_scorso', 'custom'] as const).map(p => (
                  <button key={p} onClick={() => applyPeriod(p)}
                    className={cn(
                      'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors',
                      period === p
                        ? 'text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700'
                    )}
                    style={period === p ? { backgroundColor: COLOR } : undefined}>
                    {p === 'settimana' ? 'Sett.' : p === 'mese' ? 'Mese' : p === 'mese_scorso' ? 'Prec.' : 'Custom'}
                  </button>
                ))}
              </div>
              {from && to && from <= to && (
                <span className="text-[10px] font-semibold shrink-0" style={{ color: COLOR }}>
                  {Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1}g
                </span>
              )}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-orange-300"
                  style={{ width: 110 }} />
                <span className="text-[10px] text-gray-400 shrink-0">→</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="min-w-0 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-[10px] font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-orange-300"
                  style={{ width: 110 }} />
              </div>
            )}
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
              <div className="px-3 py-2 min-h-0 border-b border-gray-100 dark:border-gray-800 flex flex-col justify-center">
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

        {/* BOTTOM — 4 equal-height rows: Diario Pasti + 3 rows of 2 */}
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {/* Row 1 — Diario Pasti full width */}
          <Link href={DIARY.href}
            className="flex items-center justify-center gap-3 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
            style={{ flex: '0 0 25%', backgroundColor: COLOR + '35' }}>
            <DIARY.icon className="!w-6 !h-6" style={{ color: COLOR }} />
            <span className="text-sm font-bold tracking-wide" style={{ color: COLOR }}>{DIARY.label}</span>
          </Link>
          {/* Rows 2-4 — 5 sections split into 3 rows of 2 */}
          {[SECTIONS.slice(0, 2), SECTIONS.slice(2, 4), SECTIONS.slice(4, 5)].map((row, ri) => (
            <div key={ri} className="flex gap-2 flex-1 min-h-0">
              {row.map(s => (
                <Link key={s.href} href={s.href}
                  className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
                  style={{ backgroundColor: COLOR + '20' }}>
                  <s.icon className="!w-5 !h-5" style={{ color: COLOR }} />
                  <span className="text-xs font-bold text-center leading-tight px-1" style={{ color: COLOR }}>{s.label}</span>
                </Link>
              ))}
              {row.length < 2 && <div className="flex-1" />}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
