'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, BookOpen, PartyPopper } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateNav } from '@/components/shared/DateNav'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { cn } from '@/lib/utils'

const C = {
  kcal:    '#9d8fcc',
  protein: '#7dbf7d',
  carbs:   '#f0aa78',
  fat:     '#c4a0d6',
} as const

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']
const FREE_MEAL_ALLOWED = ['Pranzo', 'Cena']

type Entry = {
  id: string; meal: string; quantity: number
  food: { name: string; calories: number; protein: number; carbs: number; fat: number }
}

const calc = (v: number, q: number) => Math.round((v * q) / 100)

export default function FoodDiaryPage() {
  const { userId, selectedDate, setSelectedDate, userProfile } = useAppStore()
  const [entries, setEntries] = useState<Entry[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [freeMeals, setFreeMeals] = useState<Set<string>>(new Set())

  const fetchEntries = useCallback(async () => {
    const r = await fetch(`/api/diary?userId=${userId}&date=${selectedDate}`)
    setEntries(await r.json())
    setFreeMeals(new Set())
  }, [userId, selectedDate])

  useEffect(() => { fetchEntries() }, [fetchEntries])

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


  function toggleFreeMeal(meal: string) {
    setFreeMeals(prev => {
      const next = new Set(prev)
      next.has(meal) ? next.delete(meal) : next.add(meal)
      return next
    })
  }

  const activeMealEntries = entries.filter(e => !freeMeals.has(e.meal))
  const totals = activeMealEntries.reduce((acc, e) => ({
    calories: acc.calories + calc(e.food.calories, e.quantity),
    protein:  acc.protein  + calc(e.food.protein,  e.quantity),
    carbs:    acc.carbs    + calc(e.food.carbs,    e.quantity),
    fat:      acc.fat      + calc(e.food.fat,      e.quantity),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const calPct = userProfile.targetCalories > 0
    ? Math.min(100, Math.round((totals.calories / userProfile.targetCalories) * 100))
    : 0

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Diario Alimentare" icon={BookOpen} accent="food" />

      <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.carbs} />

      {/* Macro summary */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold" style={{ color: C.kcal }}>{totals.calories}</span>
            <span className="text-xs text-gray-400">/ {userProfile.targetCalories} kcal</span>
            {freeMeals.size > 0 && (
              <span className="text-[10px] font-medium ml-1" style={{ color: C.carbs }}>
                ({freeMeals.size} libero)
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-white"
            style={{ backgroundColor: C.kcal + 'bb' }}>
            {calPct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.kcal + '20' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${calPct}%`, backgroundColor: C.kcal }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
          {[
            { label: 'Grassi',      val: totals.fat,     tgt: userProfile.targetFat,     color: C.fat },
            { label: 'Carboidrati', val: totals.carbs,   tgt: userProfile.targetCarbs,   color: C.carbs },
            { label: 'Proteine',    val: totals.protein, tgt: userProfile.targetProtein, color: C.protein },
          ].map(m => (
            <div key={m.label} className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold" style={{ color: m.color }}>{m.label}</span>
                <span className="text-gray-400">{m.val}/{m.tgt}g</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: m.color + '20' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, m.tgt > 0 ? Math.round((m.val / m.tgt) * 100) : 0)}%`, backgroundColor: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {MEALS.map(meal => {
        const mealEntries = entries.filter(e => e.meal === meal)
        const isFree = freeMeals.has(meal)
        const mealCal = mealEntries.reduce((s, e) => s + calc(e.food.calories, e.quantity), 0)
        const canToggleFree = FREE_MEAL_ALLOWED.includes(meal)

        return (
          <div key={meal} className={cn(
            'bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
            isFree ? 'border-amber-100 dark:border-amber-900/50' : 'border-gray-100 dark:border-gray-800'
          )}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <p className={cn('font-semibold text-sm truncate', isFree ? '' : 'text-gray-900 dark:text-gray-100')}
                  style={isFree ? { color: C.carbs } : {}}>
                  {meal}
                </p>
                {isFree && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: C.carbs + '18', color: C.carbs }}>
                    LIBERO
                  </span>
                )}
                {!isFree && mealCal > 0 && (
                  <p className="text-xs text-gray-400 shrink-0">{mealCal} kcal</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canToggleFree && (
                  <button onClick={() => toggleFreeMeal(meal)}
                    className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      isFree ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'
                    )}
                    style={isFree ? { backgroundColor: C.carbs + '18' } : {}}>
                    <PartyPopper size={13} />
                  </button>
                )}
                <button onClick={() => setModal(meal)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-white"
                  style={{ backgroundColor: C.carbs + 'cc' }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {isFree ? (
              <div className="px-4 py-2.5 flex items-center gap-2">
                <span className="text-base">🍣</span>
                <p className="text-sm font-medium" style={{ color: C.carbs }}>Pasto libero</p>
              </div>
            ) : mealEntries.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 py-2.5">Nessun alimento registrato</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {mealEntries.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.food.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {e.quantity}g · {calc(e.food.calories, e.quantity)} kcal ·{' '}
                        <span style={{ color: C.fat }}>G {calc(e.food.fat, e.quantity)}g</span> ·{' '}
                        <span style={{ color: C.carbs }}>C {calc(e.food.carbs, e.quantity)}g</span> ·{' '}
                        <span style={{ color: C.protein }}>P {calc(e.food.protein, e.quantity)}g</span>
                      </p>
                    </div>
                    <button onClick={() => deleteEntry(e.id)}
                      className="ml-2 w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {modal && (
        <AddFoodModal meal={modal} date={selectedDate} onClose={() => setModal(null)} onAdded={fetchEntries} />
      )}
    </div>
  )
}
