import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const from   = req.nextUrl.searchParams.get('from')
  const to     = req.nextUrl.searchParams.get('to')
  if (!userId || !from || !to) return NextResponse.json(null)

  try {
    // Count distinct days with food data in period
    const { rows: dayRows } = await pool.query(
      `SELECT COUNT(DISTINCT e.date) as days
       FROM "FoodDiaryEntry" e
       WHERE e."userId"=$1 AND e.date BETWEEN $2 AND $3`,
      [userId, from, to]
    )
    const days = Number(dayRows[0]?.days ?? 0)
    if (days === 0) return NextResponse.json({ days: 0, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, meals: [] })

    // Daily totals (excluding free meals)
    const { rows: dailyRows } = await pool.query(
      `SELECT
         SUM(ROUND((f.calories * e.quantity) / 100.0)) as calories,
         SUM(ROUND((f.protein  * e.quantity) / 100.0)) as protein,
         SUM(ROUND((f.carbs    * e.quantity) / 100.0)) as carbs,
         SUM(ROUND((f.fat      * e.quantity) / 100.0)) as fat
       FROM "FoodDiaryEntry" e
       JOIN "Food" f ON e."foodId" = f.id
       LEFT JOIN "FreeMeal" fm ON fm."userId"=e."userId" AND fm.date=e.date AND fm.meal=e.meal
       WHERE e."userId"=$1 AND e.date BETWEEN $2 AND $3 AND fm.meal IS NULL`,
      [userId, from, to]
    )
    const d = dailyRows[0]

    // Per-meal totals
    const { rows: mealRows } = await pool.query(
      `SELECT e.meal,
         SUM(ROUND((f.calories * e.quantity) / 100.0)) as calories,
         SUM(ROUND((f.protein  * e.quantity) / 100.0)) as protein,
         SUM(ROUND((f.carbs    * e.quantity) / 100.0)) as carbs,
         SUM(ROUND((f.fat      * e.quantity) / 100.0)) as fat
       FROM "FoodDiaryEntry" e
       JOIN "Food" f ON e."foodId" = f.id
       LEFT JOIN "FreeMeal" fm ON fm."userId"=e."userId" AND fm.date=e.date AND fm.meal=e.meal
       WHERE e."userId"=$1 AND e.date BETWEEN $2 AND $3 AND fm.meal IS NULL
       GROUP BY e.meal`,
      [userId, from, to]
    )

    const mealMap = Object.fromEntries(mealRows.map((r: { meal: string; calories: string; protein: string; carbs: string; fat: string }) => [r.meal, r]))

    const meals = MEALS.map(name => {
      const m = mealMap[name]
      return {
        name,
        avgCalories: m ? Math.round(Number(m.calories) / days) : 0,
        avgProtein:  m ? Math.round(Number(m.protein)  / days) : 0,
        avgCarbs:    m ? Math.round(Number(m.carbs)    / days) : 0,
        avgFat:      m ? Math.round(Number(m.fat)      / days) : 0,
      }
    })

    return NextResponse.json({
      days,
      avgCalories: Math.round(Number(d.calories ?? 0) / days),
      avgProtein:  Math.round(Number(d.protein  ?? 0) / days),
      avgCarbs:    Math.round(Number(d.carbs    ?? 0) / days),
      avgFat:      Math.round(Number(d.fat      ?? 0) / days),
      meals,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}
