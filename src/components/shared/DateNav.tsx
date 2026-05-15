'use client'
import { useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DateNav({ selectedDate, onChange, accent }: {
  selectedDate: string
  onChange: (d: string) => void
  accent: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
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

  function openPicker() {
    try { inputRef.current?.showPicker() }
    catch { inputRef.current?.click() }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 flex items-center gap-2">
      <button onClick={() => changeDate(-1)}
        className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 transition-colors">
        <ChevronLeft size={17} />
      </button>

      <button onClick={openPicker}
        className="flex-1 flex items-center justify-center gap-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <Calendar size={13} style={{ color: accent }} className="shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">{dateLabel}</span>
      </button>
      <input ref={inputRef} type="date" value={selectedDate} max={today}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="sr-only" />

      {!isToday && (
        <button onClick={() => onChange(today)}
          className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: accent + 'cc' }}>
          Oggi
        </button>
      )}

      <button onClick={() => changeDate(1)} disabled={isToday}
        className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 shrink-0 transition-colors',
          isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        )}>
        <ChevronRight size={17} />
      </button>
    </div>
  )
}
