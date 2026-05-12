'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, BookOpen, Calendar, PartyPopper } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { cn } from '@/lib/utils'

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
  const calRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  const fetchEntries = useCallback(async () => {
    const r = await fetch(`/api/diary?userId=${userId}&date=${selectedDate}`)
    setEntries(await r.json())
    setFreeMeals(new Set()) // reset free meals on date change
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

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  function toggleFreeMeal(meal: string) {
    setFreeMeals(prev => {
      const next = new Set(prev)
      next.has(meal) ? next.delete(meal) : next.add(meal)
      return next
    })
  }

  // Totals excluding free meals
  const activeMealEntries = entries.filter(e => !freeMeals.has(e.meal))
  const totals = activeMealEntries.reduce((acc, e) => ({
    calories: acc.calories + calc(e.food.calories, e.quantity),
    protein: acc.protein + calc(e.food.protein, e.quantity),
    carbs: acc.carbs + calc(e.food.carbs, e.quantity),
    fat: acc.fat + calc(e.food.fat, e.quantity),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Diario Alimentare" icon={BookOpen} accent="food" />

      {/* Date nav */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-3 py-2.5 flex items-center gap-2">
        <button onClick={() => changeDate(-1)}
          className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => calRef.current?.showPicker?.()}
          className="flex-1 flex items-center justify-center gap-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
          <Calendar size={14} className="text-orange-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">{dateLabel}</span>
        </button>
        <input ref={calRef} type="date" value={selectedDate} max={today}
          onChange={e => e.target.value && setSelectedDate(e.target.value)}
          className="sr-only" />
        {!isToday && (
          <button onClick={() => setSelectedDate(today)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-500 text-xs font-bold">
            Oggi
          </button>
        )}
        <button onClick={() => changeDate(1)} disabled={isToday}
          className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 shrink-0',
            isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Macro summary */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold" style={{ color: '#6c5ce7' }}>{totals.calories}</span>
          <span className="text-sm text-gray-400">/ {userProfile.targetCalories} kcal</span>
          {freeMeals.size > 0 && <span className="text-xs text-orange-400 font-medium ml-1">({freeMeals.size} pasto libero escluso)</span>}
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, userProfile.targetCalories > 0 ? Math.round((totals.calories / userProfile.targetCalories) * 100) : 0)}%`, backgroundColor: '#6c5ce7' }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: 'Proteine', val: totals.protein, tgt: userProfile.targetProtein, color: '#5a9e5a' },
            { label: 'Carboidrati', val: totals.carbs, tgt: userProfile.targetCarbs, color: '#e8813a' },
            { label: 'Grassi', val: totals.fat, tgt: userProfile.targetFat, color: '#9b59b6' },
          ].map(m => (
            <div key={m.label} className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold" style={{ color: m.color }}>{m.label}</span>
                <span className="text-gray-400">{m.val}/{m.tgt}g</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.tgt > 0 ? Math.round((m.val / m.tgt) * 100) : 0)}%`, backgroundColor: m.color }} />
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
          <div key={meal} className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
            isFree ? 'border-orange-200 dark:border-orange-800' : 'border-gray-200 dark:border-gray-800'
          )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <p className={cn('font-semibold text-sm truncate', isFree ? 'text-orange-400' : 'text-gray-900 dark:text-gray-100')}>{meal}</p>
                {isFree && <span className="text-[10px] bg-orange-50 dark:bg-orange-950 text-orange-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">LIBERO</span>}
                {!isFree && mealCal > 0 && <p className="text-xs text-gray-400 shrink-0">{mealCal} kcal</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canToggleFree && (
                  <button onClick={() => toggleFreeMeal(meal)}
                    className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      isFree ? 'bg-orange-50 dark:bg-orange-950 text-orange-400' : 'text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-400'
                    )}>
                    <PartyPopper size={14} />
                  </button>
                )}
                <button onClick={() => setModal(meal)}
                  className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-500 flex items-center justify-center hover:bg-orange-100 transition-colors">
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {isFree ? (
              <div className="px-4 py-3 flex items-center gap-2">
                <span className="text-lg">🎉</span>
                <p className="text-sm text-orange-400 font-medium">Pasto libero — escluso dal conteggio</p>
              </div>
            ) : mealEntries.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 py-3">Nessun alimento registrato</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {mealEntries.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.food.name}</p>
                      <p className="text-xs text-gray-400">
                        {e.quantity}g · {calc(e.food.calories, e.quantity)} kcal ·{' '}
                        <span style={{ color: '#5a9e5a' }}>P {calc(e.food.protein, e.quantity)}g</span> ·{' '}
                        <span style={{ color: '#e8813a' }}>C {calc(e.food.carbs, e.quantity)}g</span> ·{' '}
                        <span style={{ color: '#9b59b6' }}>G {calc(e.food.fat, e.quantity)}g</span>
                      </p>
                    </div>
                    <button onClick={() => deleteEntry(e.id)}
                      className="ml-2 w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
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
        <AddFoodModal meal={modal} date={selectedDate} onClose={() => setModal(null)} onAdded={fetchEntries} />
      )}
    </div>
  )
}
