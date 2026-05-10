'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { MacroBar } from '@/components/shared/MacroBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { BookOpen } from 'lucide-react'

const MEALS = ['Colazione', 'Pranzo', 'Cena', 'Spuntini']

type Entry = {
  id: string; meal: string; quantity: number
  food: { name: string; calories: number; protein: number; carbs: number; fat: number }
}

function calcMacro(val: number, qty: number) { return Math.round((val * qty) / 100) }

export default function FoodDiaryPage() {
  const { userId, selectedDate, setSelectedDate, userProfile } = useAppStore()
  const [entries, setEntries] = useState<Entry[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/diary?userId=${userId}&date=${selectedDate}`)
    setEntries(await r.json())
    setLoading(false)
  }, [userId, selectedDate])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Ensure user exists
  useEffect(() => {
    fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: userProfile.name }),
    })
  }, [userId, userProfile.name])

  async function deleteEntry(id: string) {
    await fetch(`/api/diary/${id}`, { method: 'DELETE' })
    setEntries(e => e.filter(x => x.id !== id))
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + calcMacro(e.food.calories, e.quantity),
    protein: acc.protein + calcMacro(e.food.protein, e.quantity),
    carbs: acc.carbs + calcMacro(e.food.carbs, e.quantity),
    fat: acc.fat + calcMacro(e.food.fat, e.quantity),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Diario Alimentare" icon={BookOpen} accent="food" />

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3">
        <button onClick={() => changeDate(-1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{dateLabel}</p>
        <button onClick={() => changeDate(1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Macro summary */}
      <MacroBar
        calories={{ current: totals.calories, target: userProfile.targetCalories }}
        protein={{ current: totals.protein, target: userProfile.targetProtein }}
        carbs={{ current: totals.carbs, target: userProfile.targetCarbs }}
        fat={{ current: totals.fat, target: userProfile.targetFat }}
      />

      {/* Meals */}
      {MEALS.map(meal => {
        const mealEntries = entries.filter(e => e.meal === meal)
        const mealCal = mealEntries.reduce((s, e) => s + calcMacro(e.food.calories, e.quantity), 0)
        return (
          <div key={meal} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{meal}</p>
                {mealCal > 0 && <p className="text-xs text-gray-400">{mealCal} kcal</p>}
              </div>
              <button onClick={() => setModal(meal)}
                className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                <Plus size={15} />
              </button>
            </div>
            {mealEntries.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 py-3">Nessun alimento registrato</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {mealEntries.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.food.name}</p>
                      <p className="text-xs text-gray-400">{e.quantity}g · {calcMacro(e.food.calories, e.quantity)} kcal · P {calcMacro(e.food.protein, e.quantity)}g · C {calcMacro(e.food.carbs, e.quantity)}g · G {calcMacro(e.food.fat, e.quantity)}g</p>
                    </div>
                    <button onClick={() => deleteEntry(e.id)} className="ml-2 w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {modal && (
        <AddFoodModal
          meal={modal}
          date={selectedDate}
          onClose={() => setModal(null)}
          onAdded={fetchEntries}
        />
      )}
    </div>
  )
}
