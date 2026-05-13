'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { AddExerciseModal } from '@/components/training/AddExerciseModal'

const C_TRAINING = '#7aafc8'

type WorkoutSet = { id: string; setNumber: number; reps: number; weight: number | null; exerciseId: string; exercise: { name: string; muscleGroup: string } }
type Workout = { id: string; sets: WorkoutSet[] }

export default function TrainingDiaryPage() {
  const { userId, selectedDate, setSelectedDate } = useAppStore()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchWorkout = useCallback(async () => {
    const r = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    setWorkout(await r.json())
  }, [userId, selectedDate])

  useEffect(() => { fetchWorkout() }, [fetchWorkout])

  async function deleteSet(id: string) {
    await fetch(`/api/workout/set/${id}`, { method: 'DELETE' })
    setWorkout(w => w ? { ...w, sets: w.sets.filter(s => s.id !== id) } : null)
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  const grouped = workout?.sets?.filter(Boolean).reduce((acc, s) => {
    if (!s?.exercise) return acc
    const key = s.exerciseId
    if (!acc[key]) acc[key] = { name: s.exercise.name, group: s.exercise.muscleGroup, sets: [] }
    acc[key].sets.push(s)
    return acc
  }, {} as Record<string, { name: string; group: string; sets: WorkoutSet[] }>) ?? {}

  const totalSets = workout?.sets?.filter(Boolean).length ?? 0
  const totalExercises = Object.keys(grouped).length

  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Diario Workout" icon={Dumbbell} accent="training"
        action={
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: C_TRAINING + 'dd' }}>
            <Plus size={15} /> Esercizio
          </button>
        }
      />

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2.5">
        <button onClick={() => changeDate(-1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 transition-colors">
          <ChevronLeft size={17} />
        </button>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{dateLabel}</p>
        <button onClick={() => changeDate(1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 transition-colors">
          <ChevronRight size={17} />
        </button>
      </div>

      {/* Stats */}
      {totalSets > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Esercizi',      val: totalExercises },
            { label: 'Serie totali',  val: totalSets },
          ].map(({ label, val }) => (
            <div key={label} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-center"
              style={{ backgroundColor: C_TRAINING + '12' }}>
              <p className="text-2xl font-bold" style={{ color: C_TRAINING }}>{val}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Exercises */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
          <Dumbbell size={30} className="mx-auto mb-3" style={{ color: C_TRAINING + '80' }} />
          <p className="text-gray-500 font-medium text-sm">Nessun allenamento oggi</p>
          <p className="text-xs text-gray-400 mt-1">Clicca "+ Esercizio" per iniziare</p>
        </div>
      ) : (
        Object.values(grouped).map(({ name, group, sets }) => (
          <div key={name} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{group}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                style={{ color: C_TRAINING, backgroundColor: C_TRAINING + '18' }}>
                {sets.length} serie
              </span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {sets.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: C_TRAINING + '18', color: C_TRAINING }}>
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {s.reps} reps {s.weight ? `· ${s.weight} kg` : ''}
                    </p>
                  </div>
                  <button onClick={() => deleteSet(s.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && <AddExerciseModal date={selectedDate} onClose={() => setShowModal(false)} onAdded={fetchWorkout} />}
    </div>
  )
}
