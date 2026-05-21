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

type MacroData = {
  totals:  { calories: number; protein: number; carbs: number; fat: number }
  targets: { calories: number; protein: number; carbs: number; fat: number }
}

export default function FoodHubPage() {
  const { userId, selectedDate, userProfile } = useAppStore()
  const [data, setData] = useState<MacroData | null>(null)

  useEffect(() => {
    fetch(`/api/dashboard?userId=${userId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }, [userId, selectedDate])

  const t  = data?.totals  ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const tg = data?.targets ?? {
    calories: userProfile.targetCalories, protein: userProfile.targetProtein,
    carbs:    userProfile.targetCarbs,    fat:     userProfile.targetFat,
  }
  const calPct  = tg.calories > 0 ? Math.min(100, Math.round((t.calories / tg.calories) * 100)) : 0
  const calOver = t.calories > tg.calories
  const pct = (v: number, mx: number) => mx > 0 ? Math.min(100, Math.round((v / mx) * 100)) : 0

  return (
    <div className="max-w-2xl mx-auto md:max-w-none flex flex-col gap-4 md:h-full">

      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/icon-food.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alimentazione</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestisci la tua nutrizione</p>
        </div>
      </div>

      {/* Body — 50/50 top/bottom split */}
      <div className="grid gap-4 flex-1 min-h-0" style={{ gridTemplateRows: '1fr 1fr' }}>

        {/* TOP — macro recap, full width */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-6 py-4 flex flex-col justify-center min-h-0">
          <div className="flex flex-col justify-between h-full">
            {/* KCAL */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.kcal }}>Calorie</p>
              <div className="flex items-end justify-between mb-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-extrabold leading-none" style={{ color: calOver ? '#f87171' : C.kcal }}>
                    {t.calories}
                  </span>
                  <span className="text-xl text-gray-400 font-medium">/ {tg.calories} kcal</span>
                </div>
                <span className="text-2xl font-extrabold" style={{ color: calOver ? '#f87171' : C.kcal }}>
                  {calOver ? `+${t.calories - tg.calories} kcal` : `${calPct}%`}
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: C.kcal + '38' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
              </div>
            </div>

            {/* P / C / G */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Proteine',    val: t.protein, tgt: tg.protein, color: C.protein },
                { label: 'Carboidrati', val: t.carbs,   tgt: tg.carbs,   color: C.carbs },
                { label: 'Grassi',      val: t.fat,     tgt: tg.fat,     color: C.fat },
              ].map(m => (
                <div key={m.label}>
                  <span className="text-sm font-bold uppercase tracking-wide" style={{ color: m.color }}>{m.label}</span>
                  <div className="flex items-baseline gap-1 mt-1 mb-1">
                    <span className="text-3xl font-extrabold leading-none" style={{ color: m.color }}>{m.val}</span>
                    <span className="text-base text-gray-500 font-medium">g</span>
                  </div>
                  <p className="text-xs text-gray-400 text-right mb-1">/ {m.tgt} g</p>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: m.color + '30' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM — quick links 3×2 */}
        <div className="grid grid-cols-3 gap-3 min-h-0" style={{ gridTemplateRows: '1fr 1fr' }}>
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl active:scale-[0.98] transition-all hover:opacity-90"
              style={{ backgroundColor: COLOR + '20' }}>
              <s.icon size={28} style={{ color: COLOR }} />
              <span className="text-sm font-semibold text-center leading-tight px-2" style={{ color: COLOR }}>{s.label}</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
