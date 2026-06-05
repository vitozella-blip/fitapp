'use client'
import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { cn, localToday, shiftDate } from '@/lib/utils'
import { schedaColorByOrder, schedaAbbrev } from '@/lib/theme'

const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

const TENNIS_COLOR = '#c8a800'

// Mappa data → scheda svolta (colore distinto per ordine + sigla dal nome)
function buildWorkoutInfo(): Record<string, { color: string; label: string }> {
  const map: Record<string, { color: string; label: string }> = {}
  if (typeof window === 'undefined') return map
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('workout_scheda_')) continue
    const date = key.slice('workout_scheda_'.length)
    try {
      const info = JSON.parse(localStorage.getItem(key) ?? '')
      if (info?.templateId || info?.name) {
        const order = typeof info.order === 'number' ? info.order : 1
        // Leggi badge config aggiornata (salvata dal picker) se disponibile
        let freshColor: string | null = null
        let freshLabel: string | null = null
        if (info.templateId) {
          try {
            const raw = localStorage.getItem(`badge_config_${info.templateId}`)
            if (raw) { const bc = JSON.parse(raw); freshColor = bc.color ?? null; freshLabel = bc.label ?? null }
          } catch {}
        }
        const color = freshColor ?? info.badgeColor ?? schedaColorByOrder(order)
        const label = freshLabel || info.badgeLabel || schedaAbbrev(info.name ?? '')
        map[date] = { color, label }
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
  // testo scuro quando l'accento è bianco/chiaro (per leggibilità su fill chiaro)
  const isLightAccent = accent.toLowerCase() === '#ffffff' || accent.toLowerCase() === '#fff'
  const accentText = isLightAccent ? '#1f2937' : '#fff'

  const workoutInfo  = useMemo(() => disableWorkoutColors ? {} : buildWorkoutInfo(), [view, disableWorkoutColors])
  const tennisDates  = useMemo(() => disableWorkoutColors ? new Set<string>() : buildTennisDates(), [view, disableWorkoutColors])

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
            const hasWO      = !!info
            const hasTennis  = tennisDates.has(dateStr)
            // colore di fondo: scheda (per ordine) ha priorità, poi tennis
            const fill = hasWO ? info!.color : hasTennis ? TENNIS_COLOR : null

            // Colore di accento del calendario = accent della sezione (blu allenamento, arancio cibo, ecc.)
            const CAL_ACCENT = accent

            // Pallino angolo basso-destra per "oggi"
            const todayDot = isToday && (
              <span style={{
                position: 'absolute', bottom: 4, right: 5,
                width: 4, height: 4, borderRadius: '50%',
                backgroundColor: CAL_ACCENT,
              }} />
            )

            // ── Giorno con WO/tennis ──
            if (fill) {
              const circleBg = hasWO && hasTennis
                ? { background: `linear-gradient(135deg, ${info!.color} 50%, ${TENNIS_COLOR} 50%)` }
                : { backgroundColor: fill }
              const ringColor = hasWO ? info!.color : TENNIS_COLOR
              return (
                <button key={i} onClick={() => pick(day)}
                  className="flex items-center justify-center py-1 rounded-xl relative">
                  <span className="w-7 h-7 flex items-center justify-center text-sm text-white"
                    style={{
                      ...circleBg, borderRadius: '50%',
                      fontWeight: isToday ? 800 : 700,
                      textShadow: '0 0 3px rgba(0,0,0,0.4)',
                      // Selezionato: bordo bianco + anello colore WO
                      border: isSelected ? '2px solid #fff' : undefined,
                      boxShadow: isSelected ? `0 0 0 2px ${ringColor}` : undefined,
                    }}>
                    {day}
                  </span>
                  {todayDot}
                </button>
              )
            }

            // ── Selezionato senza WO → cerchio vuoto (outline) blu allenamento ──
            if (isSelected) {
              return (
                <button key={i} onClick={() => pick(day)}
                  className="flex items-center justify-center py-1 rounded-xl relative">
                  <span className="w-7 h-7 flex items-center justify-center text-sm"
                    style={{
                      borderRadius: '50%',
                      border: `2px solid ${CAL_ACCENT}`,
                      color: CAL_ACCENT,
                      fontWeight: isToday ? 800 : 700,
                    }}>
                    {day}
                  </span>
                  {todayDot}
                </button>
              )
            }

            // ── Giorno normale ──
            return (
              <button key={i} onClick={() => pick(day)}
                className="flex items-center justify-center py-1 rounded-xl relative">
                <span className={cn('w-7 h-7 flex items-center justify-center text-sm',
                  isToday
                    ? 'font-bold text-gray-900 dark:text-gray-100'
                    : 'font-normal text-gray-500 dark:text-gray-400')}>
                  {day}
                </span>
                {todayDot}
              </button>
            )
          })}
        </div>

        {/* Oggi shortcut */}
        <button onClick={() => { onChange(today); onClose() }}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: isLightAccent ? accent : accent + 'cc', color: accentText }}>
          Oggi
        </button>
      </div>
    </div>
  )
}

export function DateNav({ selectedDate, onChange, accent, schedaColor, showWorkoutColors = true, controlColor }: {
  selectedDate: string
  onChange: (d: string) => void
  accent: string
  schedaColor?: string
  showWorkoutColors?: boolean
  controlColor?: string   // colore di icona calendario + bottone Oggi (default = accent)
}) {
  const ctrl = controlColor ?? accent
  const [open, setOpen] = useState(false)
  const [today, setToday] = useState(() => localToday())

  // Aggiorna "today" alla mezzanotte automaticamente
  useEffect(() => {
    function schedule() {
      const now = new Date()
      const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
      return setTimeout(() => { setToday(localToday()); schedule() }, ms + 100)
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

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
        {/* Date band — colorata con ctrl quando oggi è selezionato */}
        <div className={cn("flex-1 min-w-0 h-9 rounded-2xl px-1 flex items-center gap-0.5 border transition-colors",
            !schedaColor && !isToday && "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800")}
          style={
            isToday && ctrl
              ? { backgroundColor: ctrl + '55', borderColor: ctrl }
              : schedaColor
              ? { backgroundColor: schedaColor + '18', borderColor: schedaColor + '50' }
              : undefined
          }>
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
          <Calendar size={16} style={{ color: ctrl }} />
        </button>

        {/* Oggi button — colorato solo quando NON si è su oggi */}
        <button onClick={() => onChange(today)} disabled={isToday}
          className={cn(
            'shrink-0 h-9 px-3 rounded-xl text-xs font-bold border transition-colors',
            isToday
              ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'border-transparent'
          )}
          style={isToday ? {} : { backgroundColor: ctrl, color: '#fff' }}>
          Oggi
        </button>
      </div>

      {open && (
        <CalendarModal
          selectedDate={selectedDate}
          onChange={onChange}
          onClose={() => setOpen(false)}
          accent={ctrl}
          disableWorkoutColors={!showWorkoutColors}
        />
      )}
    </>
  )
}
