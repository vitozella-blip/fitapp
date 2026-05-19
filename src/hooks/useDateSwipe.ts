import { useRef } from 'react'

const THRESHOLD = 60

export function useDateSwipe(selectedDate: string, onChange: (d: string) => void) {
  const startX    = useRef(0)
  const startY    = useRef(0)
  const committed = useRef<'none' | 'h' | 'v'>('none')

  function shiftDay(delta: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    onChange(d.toISOString().split('T')[0])
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current    = e.touches[0].clientX
    startY.current    = e.touches[0].clientY
    committed.current = 'none'
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (committed.current === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      committed.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (committed.current !== 'h') return
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    if (Math.abs(dx) >= THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      shiftDay(dx < 0 ? 1 : -1)
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
