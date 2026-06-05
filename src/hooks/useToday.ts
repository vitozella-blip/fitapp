'use client'
import { useState, useEffect } from 'react'
import { localToday } from '@/lib/utils'

/**
 * Returns today's date as "YYYY-MM-DD" and refreshes automatically at midnight.
 */
export function useToday(): string {
  const [today, setToday] = useState(localToday)

  useEffect(() => {
    function scheduleUpdate() {
      const now = new Date()
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()

      const timer = setTimeout(() => {
        setToday(localToday())
        scheduleUpdate() // reschedule for the next midnight
      }, msUntilMidnight + 100) // +100ms buffer

      return timer
    }

    const timer = scheduleUpdate()
    return () => clearTimeout(timer)
  }, [])

  return today
}
