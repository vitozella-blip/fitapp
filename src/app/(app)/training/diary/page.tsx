'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Dumbbell, Check, Flame, Calendar } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { AddWorkoutModal } from '@/components/training/AddWorkoutModal'
import { cn } from '@/lib/utils'

const CT       = '#7aafc8'
const C_WARM   = '#f0aa78'
const C_TENNIS = '#a8d8a8'
const TENNIS_NAME = 'Tennis'
const SCHEDA_COLORS = [
  '#7aafc8', '#9d8fcc', '#f0aa78', '#7dbf7d', '#c4a0d6', '#e8a5a5',
]

function getSchedaColor(date: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`workout_scheda_${date}`)
    if (!raw) return null
    const info = JSON.parse(raw)
    if (info.color) return info.color
    if (info.order) return SCHEDA_COLORS[(info.order - 1) % SCHEDA_COLORS.length]
    return CT
  } catch { return null }
}

// ── Mini calendar ─────────────────────────────────────────────────────────────
function WorkoutCalendar({
  userId, selectedDate, onSelect, onClose,
}: {
  userId: string
  selectedDate: string
  onSelect: (d: string) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const initDate = new Date(selectedDate + 'T12:00:00')
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth() + 1) // 1-12
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/workout-dates?userId=${userId}&year=${viewYear}&month=${viewMonth}`)
      .then(r => r.json())
      .then((dates: string[]) => setWorkoutDates(new Set(dates)))
      .catch(() => {})
  }, [userId, viewYear, viewMonth])

  // close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    const ym = `${viewYear}-${String(viewMonth).padStart(2,'0')}`
    const todayYM = today.slice(0, 7)
    if (ym >= todayYM) return
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth - 1, 1)
    .toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay() // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Monday start
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const isNextDisabled = `${viewYear}-${String(viewMonth).padStart(2,'0')}` >= today.slice(0, 7)

  return (
    <div ref={ref}
      className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-3">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth}
          className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">{monthLabel}</span>
        <button onClick={nextMonth} disabled={isNextDisabled}
          className={cn('w-7 h-7 rounded-lg flex items-center justify-center',
            isNextDisabled ? 'text-gray-200 dark:text-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400')}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['L','M','M','G','V','S','D'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-300 dark:text-gray-600 py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = `${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isSelected = iso === selectedDate
          const isToday    = iso === today
          const isFuture   = iso > today
          const dotColor   = workoutDates.has(iso) ? getSchedaColor(iso) : null
          return (
            <button key={i} disabled={isFuture} onClick={() => { onSelect(iso); onClose() }}
              className={cn(
                'flex flex-col items-center py-1 rounded-xl transition-colors',
                isFuture ? 'opacity-30 cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
              style={isSelected ? { outline: `2px solid ${CT}`, outlineOffset: '1px' } : {}}>
              <span className={cn(
                'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                isToday ? 'text-white' : isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300',
              )}
                style={isToday ? { backgroundColor: CT } : {}}>
                {day}
              </span>
              {/* workout dot */}
              <div className="w-1.5 h-1.5 rounded-full mt-0.5"
                style={{ backgroundColor: dotColor ?? 'transparent' }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Exercise = { id: string; name: string; muscleGroup: string }
type WorkoutSet = {
  id: string; setNumber: number; reps: number; weight: number | null
  exerciseId: string; exercise: Exercise
}
type Workout = { id: string; sets: WorkoutSet[] }

const WARMUP_KEY    = 'workout_warmup_v1'
const COMPLETED_KEY = 'workout_completed_v1'

function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) }
  catch { return new Set() }
}
function saveSet(key: string, s: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify([...s]))
}

export default function TrainingDiaryPage() {
  const { userId, selectedDate, setSelectedDate, userProfile } = useAppStore()
  const [workout, setWorkout]   = useState<Workout | null>(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [warmups, setWarmups]   = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [tennisLoading, setTennisLoading] = useState(false)
  const [expandedExId, setExpandedExId] = useState<string | null>(null)
  const [showCal, setShowCal] = useState(false)

  useEffect(() => {
    setWarmups(loadSet(WARMUP_KEY))
    setCompleted(loadSet(COMPLETED_KEY))
  }, [])

  const fetchWorkout = useCallback(async () => {
    // Ensure user exists
    await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: userProfile.name }),
    }).then(r => r.json())
    const r = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    setWorkout(await r.json())
  }, [userId, selectedDate, userProfile.name])

  useEffect(() => { fetchWorkout() }, [fetchWorkout])

  async function deleteSet(id: string) {
    await fetch(`/api/workout/set/${id}`, { method: 'DELETE' })
    setWorkout(w => w ? { ...w, sets: w.sets.filter(s => s.id !== id) } : null)
    if (warmups.has(id)) {
      const nw = new Set(warmups); nw.delete(id)
      setWarmups(nw); saveSet(WARMUP_KEY, nw)
    }
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dateLabel = new Date(selectedDate + 'T12:00:00')
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  // Group sets by exercise (excluding tennis)
  const allSets = (workout?.sets ?? []).filter(Boolean)
  const tennisSets = allSets.filter(s => s.exercise?.name === TENNIS_NAME)
  const tennisActive = tennisSets.length > 0
  const workoutSets  = allSets.filter(s => s.exercise?.name !== TENNIS_NAME)

  const grouped = workoutSets.reduce((acc, s) => {
    if (!s?.exercise) return acc
    const k = s.exerciseId
    if (!acc[k]) acc[k] = { name: s.exercise.name, group: s.exercise.muscleGroup, sets: [] }
    acc[k].sets.push(s)
    return acc
  }, {} as Record<string, { name: string; group: string; sets: WorkoutSet[] }>)

  // Tennis toggle
  async function findOrCreateTennis(): Promise<Exercise> {
    const r = await fetch(`/api/exercises?q=${encodeURIComponent(TENNIS_NAME)}&userId=${userId}`)
    const arr: Exercise[] = await r.json()
    const f = arr.find(e => e.name.toLowerCase() === TENNIS_NAME.toLowerCase())
    if (f) return f
    const cr = await fetch('/api/exercises', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: TENNIS_NAME, muscleGroup: 'Cardio', userId }),
    })
    return await cr.json()
  }

  async function toggleTennis() {
    if (tennisLoading) return
    setTennisLoading(true)
    if (tennisActive) {
      // Remove all tennis sets for today
      for (const s of tennisSets) {
        await fetch(`/api/workout/set/${s.id}`, { method: 'DELETE' })
      }
    } else {
      const ex = await findOrCreateTennis()
      await fetch('/api/workout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, date: selectedDate, exerciseId: ex.id,
          sets: 1, reps: 1, weight: null,
        }),
      })
    }
    await fetchWorkout()
    setTennisLoading(false)
  }

  // Toggle exercise completed
  function toggleCompleted(exerciseId: string) {
    const key = `${selectedDate}_${exerciseId}`
    const nc = new Set(completed)
    if (nc.has(key)) nc.delete(key)
    else nc.add(key)
    setCompleted(nc); saveSet(COMPLETED_KEY, nc)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Diario Workout" icon={Dumbbell} accent="training"
        action={
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTennis} disabled={tennisLoading}
              className={cn(
                'px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50',
                tennisActive && 'text-white'
              )}
              style={
                tennisActive
                  ? { backgroundColor: C_TENNIS }
                  : { backgroundColor: C_TENNIS + '22', color: '#5a8a5a' }
              }>
              Tennis
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ backgroundColor: CT }}>
              <Plus size={15} /> Allenamento
            </button>
          </div>
        }
      />

      {/* Date nav */}
      <div className="relative">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 flex items-center gap-2">
          <button onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors">
            <ChevronLeft size={17} />
          </button>
          <button onClick={() => setShowCal(c => !c)}
            className="flex-1 flex items-center justify-center gap-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Calendar size={13} style={{ color: CT }} className="shrink-0" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">{dateLabel}</span>
          </button>
          <button onClick={() => changeDate(1)}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors">
            <ChevronRight size={17} />
          </button>
        </div>
        {showCal && (
          <WorkoutCalendar
            userId={userId}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onClose={() => setShowCal(false)}
          />
        )}
      </div>

      {/* Empty state */}
      {Object.keys(grouped).length === 0 && !tennisActive && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
          <Dumbbell size={28} className="mx-auto mb-3" style={{ color: CT + '80' }} />
          <p className="text-gray-500 font-medium text-sm">Nessun allenamento oggi</p>
          <p className="text-xs text-gray-400 mt-1">Clicca &ldquo;+ Allenamento&rdquo; o &ldquo;Tennis&rdquo; per iniziare</p>
        </div>
      )}

      {/* Exercise cards */}
      {Object.entries(grouped).map(([exId, { name, group, sets }]) => {
        const compKey = `${selectedDate}_${exId}`
        const isDone = completed.has(compKey)
        const isExpanded = expandedExId === exId
        let workIdx = 0, warmIdx = 0
        return (
          <div key={exId}
            className={cn(
              'bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
              isDone ? 'border-green-200/60 dark:border-green-900/40' : 'border-gray-100 dark:border-gray-800'
            )}>
            <div
              className={cn('px-4 py-3 flex items-center gap-2 cursor-pointer', isExpanded && 'border-b border-gray-100 dark:border-gray-800')}
              onClick={() => setExpandedExId(id => id === exId ? null : exId)}>
              <button onClick={(e) => { e.stopPropagation(); toggleCompleted(exId) }}
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border',
                  isDone
                    ? 'border-transparent text-white'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                )}
                style={isDone ? { backgroundColor: '#7dbf7d' } : {}}>
                {isDone && <Check size={13} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('font-semibold text-sm truncate',
                  isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'
                )}>{name}</p>
                {group && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{group}</p>
                )}
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0"
                style={{ color: CT, backgroundColor: CT + '18' }}>
                {sets.length} set
              </span>
            </div>
            {isExpanded && <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {sets.map(s => {
                const isW = warmups.has(s.id)
                const label = isW ? `R${++warmIdx}` : String(++workIdx)
                return (
                  <div key={s.id} className="flex items-center gap-2 px-4 py-2">
                    <span className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                      style={isW
                        ? { backgroundColor: C_WARM + '20', color: C_WARM }
                        : { backgroundColor: CT + '18', color: CT }}>
                      {label}
                    </span>
                    {isW && <Flame size={10} style={{ color: C_WARM }} className="shrink-0" />}
                    <p className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                      {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ''}
                    </p>
                    <button onClick={() => deleteSet(s.id)}
                      className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>}
          </div>
        )
      })}

      {showAdd && (
        <AddWorkoutModal
          userId={userId}
          date={selectedDate}
          onClose={() => setShowAdd(false)}
          onChanged={fetchWorkout}
        />
      )}
    </div>
  )
}
