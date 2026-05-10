'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { BarChart3, Dumbbell, TrendingUp, Calendar } from 'lucide-react'

type WorkoutSummary = { id: string; date: string; setCount: string; exerciseCount: string }

export default function TrainingStatsPage() {
  const userId = useAppStore((s) => s.userId)
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])

  useEffect(() => {
    fetch(`/api/workout?userId=${userId}&all=1`).then(r => r.json()).then(setWorkouts)
  }, [userId])

  const thisMonth = workouts.filter(w => {
    const now = new Date()
    const d = new Date(w.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const totalSets = workouts.reduce((s, w) => s + Number(w.setCount), 0)
  const totalWorkouts = workouts.length

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Statistiche" icon={BarChart3} accent="training" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Allenamenti" value={totalWorkouts} icon={Dumbbell} accent="training" sub="Totali" />
        <StatCard label="Questo mese" value={thisMonth.length} icon={Calendar} accent="training" sub="Allenamenti" />
        <StatCard label="Serie totali" value={totalSets} icon={TrendingUp} accent="training" sub="Completate" />
        <StatCard label="Media serie" value={totalWorkouts > 0 ? Math.round(totalSets / totalWorkouts) : 0} icon={BarChart3} accent="training" sub="Per allenamento" />
      </div>
      {workouts.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <BarChart3 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nessun dato disponibile</p>
          <p className="text-sm text-gray-400 mt-1">Inizia ad allenarti per vedere le statistiche</p>
        </div>
      )}
    </div>
  )
}
