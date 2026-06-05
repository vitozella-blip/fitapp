import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

/**
 * GET /api/nutrition-targets?userId=&date=YYYY-MM-DD
 *
 * Returns the effective macro targets for a given date:
 * - If a MealPlan with startDate <= date exists (and endDate is null or >= date), use its __TOTALE__ targets
 * - Otherwise, fall back to User.targetCalories / targetProtein / targetCarbs / targetFat
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date   = req.nextUrl.searchParams.get('date')
  if (!userId) return NextResponse.json(null)

  try {
    // Find the most recent MealPlan that covers the requested date
    const { rows: plans } = await pool.query(
      `SELECT mp.id
       FROM "MealPlan" mp
       WHERE mp."userId" = $1
         AND (mp."startDate" IS NULL OR mp."startDate" <= $2)
         AND (mp."endDate"   IS NULL OR mp."endDate"   >= $2)
       ORDER BY mp."startDate" DESC NULLS LAST, mp."createdAt" DESC
       LIMIT 1`,
      [userId, date ?? new Date().toISOString().slice(0, 10)]
    )

    if (plans.length > 0) {
      // Return the __TOTALE__ target from the active plan
      const { rows: targets } = await pool.query(
        `SELECT calories, protein, carbs, fat
         FROM "MealPlanTarget"
         WHERE "planId" = $1 AND meal = '__TOTALE__'`,
        [plans[0].id]
      )
      if (targets.length > 0 && targets[0].calories > 0) {
        return NextResponse.json({
          targetCalories: targets[0].calories,
          targetProtein:  targets[0].protein,
          targetCarbs:    targets[0].carbs,
          targetFat:      targets[0].fat,
          source: 'plan',
          planId: plans[0].id,
        })
      }
    }

    // Fallback: User base targets
    const { rows: users } = await pool.query(
      `SELECT "targetCalories", "targetProtein", "targetCarbs", "targetFat" FROM "User" WHERE id=$1`,
      [userId]
    )
    if (!users.length) return NextResponse.json(null)
    const u = users[0]
    return NextResponse.json({
      targetCalories: u.targetCalories ?? 2000,
      targetProtein:  u.targetProtein  ?? 150,
      targetCarbs:    u.targetCarbs    ?? 220,
      targetFat:      u.targetFat      ?? 65,
      source: 'user',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}
