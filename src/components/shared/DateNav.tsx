'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { cn, localToday, shiftDate } from '@/lib/utils'

const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

// Single color used for ALL workout shape indicators in the calendar
const CAL_WORKOUT_COLOR = '#5b9ec9'

const TENNIS_COLOR = '#6aaa6a'

// shape: 0 = circle · 1 = hexagon · 2 = diamond  (derived from order % 3)
// Hexagon (pointy-top) for 28×28 viewBox (center 14,14 r=11)
const CAL_HEXAGON = '14,3 24,9 24,20 14,25 4,20 4,9'
// Diamond for 28×28 viewBox
const CAL_DIAMOND = '14,2 26,14 14,26 2,14'
function buildWorkoutInfo(): Record<string, { color: string; shape: number }> {
  const map: Record<string, { color: string; shape: number }> = {}
  if (typeof window === 'undefined') return map
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('workout_scheda_')) continue
    const date = key.slice('workout_scheda_'.length)
    try {
      const info = JSON.parse(localStorage.getItem(key) ?? '')
      if (info?.color) {
        const order = typeof info.order === 'number' ? info.order : 1
        map[date] = { color: info.color, shape: (order - 1) % 3 }
      }
    } catch {}
  }
  return map
}

function buildTennisDates(): Set<string> {
  const s = new Set<string>()
  if (typeof window === 'undefined') return s
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('tennis_meta_')) continue
    const date = key.slice('tennis_meta_'.length)
    try {
      const info = JSON.parse(localStorage.getItem(key) ?? '')
      if (info?.hours && Number(info.hours) > 0) s.add(date)
    } catch {}
  }
  return s
}

function CalendarModal({ selectedDate, onChange, onClose, accent, disableWorkoutColors = false }: {
  selectedDate: string
  onChange: (d: string) => void
  onClose: () => void
  accent: string
  disableWorkoutColors?: boolean
}) {
  const today = localToday()
  const initial = new Date(selectedDate + 'T12:00:00')
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })

  const workoutInfo  = useMemo(() => disableWorkoutColors ? {} : buildWorkoutInfo(), [view, disableWorkoutColors])
  const tennisDates  = useMemo(() => buildTennisDates(), [view])

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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-xs p-4 shadow-xl overflow-hidden"
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
            const isToday    = dateStr === today
            const info       = workoutInfo[dateStr]
            const shape      = info?.shape ?? 0        // 0=circle 1=hexagon 2=diamond
            const hasWO      = !!info
            const hasTennis  = tennisDates.has(dateStr)

            // ── SELECTED + WO or TENNIS → filled shape ──────────────────────
            if (isSelected && (hasWO || hasTennis)) {
              const fillColor = hasTennis ? TENNIS_COLOR : CAL_WORKOUT_COLOR
              // Shape 1 (hexagon) or 2 (diamond) → SVG filled; shape 0 → CSS circle
              if (hasWO && !hasTennis && shape !== 0) {
                const pts = shape === 2 ? CAL_DIAMOND : CAL_HEXAGON
                return (
                  <button key={i} onClick={() => pick(day)}
                    className="flex items-center justify-center py-1 rounded-xl relative">
                    <div className="relative flex items-center justify-center" style={{ width: 28, height: 28 }}>
                      <svg viewBox="0 0 28 28" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                        <polygon points={pts} fill={fillColor} />
                      </svg>
                      <span className="relative z-10 text-sm font-bold text-white">{day}</span>
                    </div>
                  </button>
                )
              }
              return (
                <button key={i} onClick={() => pick(day)} className="flex items-center justify-center py-1 rounded-xl relative">
                  <span className="w-7 h-7 flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: fillColor, borderRadius: '50%' }}>{day}</span>
                </button>
              )
            }

            // ── SELECTED + no WO/tennis → accent filled square ───────────────
            if (isSelected) {
              return (
                <button key={i} onClick={() => pick(day)} className="flex items-center justify-center py-1 rounded-xl relative">
                  <span className="w-7 h-7 flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: accent, borderRadius: '4px' }}>{day}</span>
                </button>
              )
            }

            // ── WO day (not selected) → hollow shape, neutral number ────────
            if (hasWO) {
              // Shape 0: circle (CSS), Shape 1: hexagon (SVG), Shape 2: diamond (SVG)
              if (shape === 0) {
                return (
                  <button key={i} onClick={() => pick(day)}
                    className="flex flex-col items-center justify-center py-1 rounded-xl relative">
                    <span className={cn('w-7 h-7 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400', isToday && 'font-bold text-gray-900 dark:text-gray-100')}
                      style={{ border: `2px solid ${CAL_WORKOUT_COLOR}`, borderRadius: '50%' }}>
                      {day}
                    </span>
                    {isToday && <span className="w-3 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: CAL_WORKOUT_COLOR }} />}
                  </button>
                )
              }
              const pts = shape === 2 ? CAL_DIAMOND : CAL_HEXAGON
              return (
                <button key={i} onClick={() => pick(day)}
                  className="flex flex-col items-center justify-center py-1 rounded-xl relative">
                  <div className="relative flex items-center justify-center" style={{ width: 28, height: 28 }}>
                    <svg viewBox="0 0 28 28" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                      <polygon points={pts} fill="none" stroke={CAL_WORKOUT_COLOR} strokeWidth="2" />
                    </svg>
                    <span className={cn('relative z-10 text-sm text-gray-500 dark:text-gray-400', isToday && 'font-bold text-gray-900 dark:text-gray-100')}>
                      {day}
                    </span>
                  </div>
                  {isToday && <span className="w-3 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: CAL_WORKOUT_COLOR }} />}
                </button>
              )
            }

            // ── Tennis day (not selected) → hollow green circle, green number ─
            if (hasTennis) {
              return (
                <button key={i} onClick={() => pick(day)}
                  className="flex flex-col items-center justify-center py-1 rounded-xl relative">
                  <span className={cn('w-7 h-7 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400', isToday && 'font-bold text-gray-900 dark:text-gray-100')}
                    style={{ border: `2px solid ${TENNIS_COLOR}`, borderRadius: '50%' }}>
                    {day}
                  </span>
                  {isToday && <span className="w-3 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: TENNIS_COLOR }} />}
                </button>
              )
            }

            // ── Regular day ─────────────────────────────────────────────────
            return (
              <button key={i} onClick={() => pick(day)}
                className="flex flex-col items-center justify-center py-1 rounded-xl relative">
                <span className={cn('w-7 h-7 flex items-center justify-center text-sm',
                  isToday ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400')}>
                  {day}
                </span>
                {isToday && <span className="w-3 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: accent }} />}
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
    onChange(shiftDate(selectedDate, days))
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Date band */}
        <div className={cn("flex-1 min-w-0 h-9 rounded-2xl px-1 flex items-center gap-0.5 border transition-colors",
            !schedaColor && "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800")}
          style={schedaColor ? { backgroundColor: schedaColor + '18', borderColor: schedaColor + '50' } : undefined}>
          <button onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="flex-1 text-center text-xs md:text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize whitespace-nowrap overflow-hidden">
            {dateLabel}
          </span>
          <button onClick={() => changeDate(1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 shrink-0 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={16} />
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
