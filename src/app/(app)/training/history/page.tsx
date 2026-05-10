'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { History, Dumbbell } from 'lucide-react'

type WorkoutSummary = { id: string; date: string; setCount: number; exerciseCount: number; name?: string }

export default function TrainingHistoryPage() {
  const userId = useAppStore((s) => s.userId)
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])

  useEffect(() => {
    fetch(`/api/workout?userId=${userId}&all=1`).then(r => r.json()).then(setWorkouts)
  }, [userId])

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Storico Allenamenti" icon={History} accent="training" />
      {workouts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <History size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessun allenamento registrato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map(w => {
            const date = new Date(w.date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <div key={w.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                    <Dumbbell size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{date}</p>
                    <p className="text-xs text-gray-400">{w.exerciseCount} esercizi · {w.setCount} serie</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
