'use client'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Target } from 'lucide-react'
import { useEffect, useState } from 'react'

type Entry = { quantity: number; food: { calories: number; protein: number; carbs: number; fat: number } }

export default function MacrosPage() {
  const { userId, selectedDate, userProfile } = useAppStore()
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    fetch(`/api/diary?userId=${userId}&date=${selectedDate}`)
      .then(r => r.json()).then(setEntries)
  }, [userId, selectedDate])

  const calc = (val: number, qty: number) => Math.round((val * qty) / 100)
  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + calc(e.food.calories, e.quantity),
    protein: acc.protein + calc(e.food.protein, e.quantity),
    carbs: acc.carbs + calc(e.food.carbs, e.quantity),
    fat: acc.fat + calc(e.food.fat, e.quantity),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const remaining = {
    calories: userProfile.targetCalories - totals.calories,
    protein: userProfile.targetProtein - totals.protein,
    carbs: userProfile.targetCarbs - totals.carbs,
    fat: userProfile.targetFat - totals.fat,
  }

  const macros = [
    { label: 'Calorie', current: totals.calories, target: userProfile.targetCalories, remaining: remaining.calories, unit: 'kcal', color: 'bg-emerald-500' },
    { label: 'Proteine', current: totals.protein, target: userProfile.targetProtein, remaining: remaining.protein, unit: 'g', color: 'bg-emerald-400' },
    { label: 'Carboidrati', current: totals.carbs, target: userProfile.targetCarbs, remaining: remaining.carbs, unit: 'g', color: 'bg-orange-400' },
    { label: 'Grassi', current: totals.fat, target: userProfile.targetFat, remaining: remaining.fat, unit: 'g', color: 'bg-blue-400' },
  ]

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Completa Macro" subtitle="Oggi" icon={Target} accent="food" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {macros.map(m => {
          const pct = Math.min(100, Math.round((m.current / m.target) * 100))
          const over = m.remaining < 0
          return (
            <div key={m.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{m.label}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${over ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                  {over ? `+${Math.abs(m.remaining)}` : m.remaining} {m.unit}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${m.color} ${over ? 'opacity-50' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{m.current} {m.unit} consumati</span>
                <span>Obiettivo: {m.target} {m.unit}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
