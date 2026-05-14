import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json(null)

  try {
    const [userRes, entriesRes, workoutRes, tennisRes, exercisesRes] = await Promise.all([
      pool.query(`SELECT * FROM "User" WHERE id=$1`, [userId]),
      pool.query(
        `SELECT e.meal, e.quantity, f.calories, f.protein, f.carbs, f.fat
         FROM "FoodDiaryEntry" e JOIN "Food" f ON e."foodId"=f.id
         WHERE e."userId"=$1 AND e.date=$2`,
        [userId, date]
      ),
      pool.query(
        `SELECT w.id, COUNT(DISTINCT s."exerciseId") as "exerciseCount", COUNT(s.id) as "setCount"
         FROM "WorkoutDiary" w LEFT JOIN "WorkoutSet" s ON s."workoutDiaryId"=w.id
         WHERE w."userId"=$1 AND w.date=$2 GROUP BY w.id`,
        [userId, date]
      ),
      pool.query(
        `SELECT 1 FROM "WorkoutDiary" w
         JOIN "WorkoutSet" s ON s."workoutDiaryId"=w.id
         JOIN "Exercise" e ON e.id=s."exerciseId"
         WHERE w."userId"=$1 AND w.date=$2 AND e.name='Tennis' LIMIT 1`,
        [userId, date]
      ),
      pool.query(
        `SELECT DISTINCT s."exerciseId", e.name
         FROM "WorkoutDiary" w
         JOIN "WorkoutSet" s ON s."workoutDiaryId"=w.id
         JOIN "Exercise" e ON e.id=s."exerciseId"
         WHERE w."userId"=$1 AND w.date=$2 AND e.name != 'Tennis'`,
        [userId, date]
      ),
    ])

    const user = userRes.rows[0]
    const entries = entriesRes.rows

    const calc = (v: number, q: number) => Math.round((v * q) / 100)

    const totals = entries.reduce((acc: Record<string, number>, e) => ({
      calories: acc.calories + calc(e.calories, e.quantity),
      protein: acc.protein + calc(e.protein, e.quantity),
      carbs: acc.carbs + calc(e.carbs, e.quantity),
      fat: acc.fat + calc(e.fat, e.quantity),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

    const meals = MEALS.map(name => {
      const mealEntries = entries.filter(e => e.meal === name)
      return {
        name,
        calories: mealEntries.reduce((s, e) => s + calc(e.calories, e.quantity), 0),
        protein: mealEntries.reduce((s, e) => s + calc(e.protein, e.quantity), 0),
        carbs: mealEntries.reduce((s, e) => s + calc(e.carbs, e.quantity), 0),
        fat: mealEntries.reduce((s, e) => s + calc(e.fat, e.quantity), 0),
      }
    })

    const workout = workoutRes.rows[0] ? {
      exists: true,
      exerciseCount: Number(workoutRes.rows[0].exerciseCount),
      setCount: Number(workoutRes.rows[0].setCount),
      hasTennis: tennisRes.rows.length > 0,
      exercises: exercisesRes.rows.map((r: { name: string }) => r.name),
    } : { exists: false, hasTennis: tennisRes.rows.length > 0, exercises: [] }

    return NextResponse.json({
      user,
      totals,
      targets: {
        calories: user?.targetCalories ?? 2000,
        protein: user?.targetProtein ?? 150,
        carbs: user?.targetCarbs ?? 220,
        fat: user?.targetFat ?? 65,
      },
      meals,
      workout,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}
