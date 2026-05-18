'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function buildWorkoutColors(): Record<string, string> {
  const map: Record<string, string> = {}
  if (typeof window === 'undefined') return map
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('workout_scheda_')) continue
    const date = key.slice('workout_scheda_'.length)
    try {
      const info = JSON.parse(localStorage.getItem(key) ?? '')
      if (info?.color) map[date] = info.color
    } catch {}
  }
  return map
}

function CalendarModal({ selectedDate, onChange, onClose, accent, disableWorkoutColors = false }: {
  selectedDate: string
  onChange: (d: string) => void
  onClose: () => void
  accent: string
  disableWorkoutColors?: boolean
}) {
  const today = new Date().toISOString().split('T')[0]
  const initial = new Date(selectedDate + 'T12:00:00')
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })

  const workoutColors = useMemo(() => disableWorkoutColors ? {} : buildWorkoutColors(), [view, disableWorkoutColors])

  const { year, month } = view
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  function prevMonth() {
    setView(v => {
      const m = v.month === 0 ? 11 : v.month - 1
      const y = v.month === 0 ? v.year - 1 : v.year
      return { year: y, month: m }
    })
  }
  function nextMonth() {
    setView(v => {
      const m = v.month === 11 ? 0 : v.month + 1
      const y = v.month === 11 ? v.year + 1 : v.year
      return { year: y, month: m }
    })
  }

  function pick(d: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    onChange(dateStr)
    onClose()
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-xs p-4 shadow-xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">{monthLabel}</span>
          <button onClick={nextMonth}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === today
            const color = workoutColors[dateStr]

            return (
              <button key={i} onClick={() => pick(day)}
                className="flex flex-col items-center justify-center py-1 rounded-xl transition-colors relative">
                <span
                  className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isSelected
                      ? 'text-white font-bold'
                      : isToday
                      ? 'font-bold text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                  style={isSelected
                    ? { backgroundColor: color ?? accent }
                    : color
                    ? { backgroundColor: color + '28', color }
                    : undefined}
                >
                  {day}
                </span>
                {isToday && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: accent }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Oggi shortcut */}
        <button onClick={() => { onChange(today); onClose() }}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: accent + 'cc' }}>
          Oggi
        </button>
      </div>
    </div>
  )
}

export function DateNav({ selectedDate, onChange, accent, schedaColor, showWorkoutColors = true }: {
  selectedDate: string
  onChange: (d: string) => void
  accent: string
  schedaColor?: string
  showWorkoutColors?: boolean
}) {
  const [open, setOpen] = useState(false)
  const today    = new Date().toISOString().split('T')[0]
  const isToday  = selectedDate === today
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    onChange(d.toISOString().split('T')[0])
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Date band */}
        <div className={cn("flex-1 h-9 rounded-2xl px-2 flex items-center gap-1 border transition-colors",
            !schedaColor && "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800")}
          style={schedaColor ? { backgroundColor: schedaColor + '18', borderColor: schedaColor + '50' } : undefined}>
          <button onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors">
            <ChevronLeft size={17} />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">
            {dateLabel}
          </span>
          <button onClick={() => changeDate(1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 shrink-0 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={17} />
          </button>
        </div>

        {/* Calendar button */}
        <button onClick={() => setOpen(true)}
          className="w-9 h-9 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-center shrink-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Calendar size={16} style={{ color: accent }} />
        </button>

        {/* Oggi button */}
        <button onClick={() => onChange(today)} disabled={isToday}
          className={cn(
            'shrink-0 h-9 px-3 rounded-xl text-xs font-bold border transition-colors',
            isToday
              ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'border-transparent text-white'
          )}
          style={isToday ? {} : { backgroundColor: accent + 'cc' }}>
          Oggi
        </button>
      </div>

      {open && (
        <CalendarModal
          selectedDate={selectedDate}
          onChange={onChange}
          onClose={() => setOpen(false)}
          accent={accent}
          disableWorkoutColors={!showWorkoutColors}
        />
      )}
    </>
  )
}
