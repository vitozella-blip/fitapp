'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export type NutritionTargets = {
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

/**
 * Returns the effective nutrition targets for the given date.
 * Prefers the active MealPlan covering that date; falls back to User base targets.
 */
export function useNutritionTargets(date: string): NutritionTargets {
  const { userId, userProfile } = useAppStore()

  const fallback: NutritionTargets = {
    targetCalories: userProfile.targetCalories,
    targetProtein:  userProfile.targetProtein,
    targetCarbs:    userProfile.targetCarbs,
    targetFat:      userProfile.targetFat,
  }

  const [targets, setTargets] = useState<NutritionTargets>(fallback)

  useEffect(() => {
    if (!userId || !date) return
    // Optimistic: show store values immediately while fetching
    setTargets(fallback)
    fetch(`/api/nutrition-targets?userId=${userId}&date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (d?.targetCalories) {
          setTargets({
            targetCalories: d.targetCalories,
            targetProtein:  d.targetProtein,
            targetCarbs:    d.targetCarbs,
            targetFat:      d.targetFat,
          })
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, date])

  return targets
}
