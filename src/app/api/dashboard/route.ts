import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json(null)

  await Promise.all([
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "templateId" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "templateName" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "schedaOrder" INT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "schedaColor" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "weekId" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "weekName" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "weekOrder" INT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisType" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisHours" TEXT`).catch(() => {}),
  ])

  try {
    const [userRes, entriesRes, workoutRes, tennisRes, exercisesRes, freeMealsRes, weekRes] = await Promise.all([
      pool.query(`SELECT * FROM "User" WHERE id=$1`, [userId]),
      pool.query(
        `SELECT e.meal, e.quantity, f.calories, f.protein, f.carbs, f.fat
         FROM "FoodDiaryEntry" e JOIN "Food" f ON e."foodId"=f.id
         WHERE e."userId"=$1 AND e.date=$2`,
        [userId, date]
      ),
      pool.query(
        `SELECT w.id, COUNT(DISTINCT s."exerciseId") as "exerciseCount", COUNT(s.id) as "setCount",
                COALESCE(w."templateId", wt2.id)                     AS "templateId",
                COALESCE(w."templateName", wt.name, wt2.name)        AS "templateName",
                COALESCE(w."schedaOrder", wt."order", wt2."order")   AS "schedaOrder",
                w."schedaColor",
                w."weekId",
                COALESCE(w."weekName", ww.name)                      AS "weekName",
                COALESCE(w."weekOrder", ww."order" + 1)              AS "weekOrder",
                w."tennisType", w."tennisHours"
         FROM "WorkoutDiary" w
         LEFT JOIN "WorkoutSet"      s   ON s."workoutDiaryId" = w.id
         LEFT JOIN "WorkoutTemplate" wt  ON wt.id = w."templateId"
         LEFT JOIN "WorkoutWeek"     ww  ON ww.id = w."weekId"
         LEFT JOIN "WorkoutTemplate" wt2 ON wt2.id = ww."templateId"
         WHERE w."userId"=$1 AND w.date=$2
         GROUP BY w.id, wt.name, wt."order", wt2.id, wt2.name, wt2."order", ww.name, ww."order"`,
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
        `SELECT s."exerciseId", e.name,
                MIN(COALESCE(wte."order", 99999)) AS ex_order,
                MIN(COALESCE(s."globalIndex", 99999)) AS gidx
         FROM "WorkoutDiary" w
         JOIN "WorkoutSet" s ON s."workoutDiaryId"=w.id
         JOIN "Exercise" e ON e.id=s."exerciseId"
         LEFT JOIN "WorkoutWeek" ww ON ww.id = w."weekId"
         LEFT JOIN "WorkoutTemplateExercise" wte
           ON wte."templateId" = COALESCE(w."templateId", ww."templateId")
           AND wte."exerciseId" = s."exerciseId"
         WHERE w."userId"=$1 AND w.date=$2 AND e.name != 'Tennis'
         GROUP BY s."exerciseId", e.name
         ORDER BY ex_order ASC, gidx ASC`,
        [userId, date]
      ),
      pool.query(
        `SELECT meal FROM "FreeMeal" WHERE "userId"=$1 AND date=$2`,
        [userId, date]
      ).catch(() => ({ rows: [] })),
      (() => {
        // Compute ISO week bounds (Mon–Sun) in JS to avoid date_trunc timezone issues
        const d0 = new Date(date + 'T12:00:00Z')
        const dow = d0.getUTCDay()
        const mon = new Date(d0)
        mon.setUTCDate(d0.getUTCDate() - (dow === 0 ? 6 : dow - 1))
        const weekStart = mon.toISOString().slice(0, 10)
        const sun = new Date(mon)
        sun.setUTCDate(mon.getUTCDate() + 7)
        const weekEnd = sun.toISOString().slice(0, 10)
        return pool.query(
          `SELECT d.date,
                  COALESCE(bool_or(e.name IS NOT NULL AND e.name != 'Tennis'), false) AS "hasGym",
                  COALESCE(bool_or(e.name = 'Tennis'), false)                         AS "hasTennis"
           FROM "WorkoutDiary" d
           LEFT JOIN "WorkoutSet" s ON s."workoutDiaryId" = d.id
           LEFT JOIN "Exercise"   e ON e.id = s."exerciseId"
           WHERE d."userId" = $1
             AND d.date >= $2
             AND d.date <  $3
           GROUP BY d.date
           ORDER BY d.date`,
          [userId, weekStart, weekEnd]
        ).catch((err) => { console.error('[weekSummary] ERROR:', err); return { rows: [] } })
      })(),
    ])

    const user = userRes.rows[0]
    const entries = entriesRes.rows
    const freeMealSet = new Set(freeMealsRes.rows.map((r: { meal: string }) => r.meal))
    const wr = workoutRes.rows[0]

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
        isFree: freeMealSet.has(name),
        calories: mealEntries.reduce((s, e) => s + calc(e.calories, e.quantity), 0),
        protein: mealEntries.reduce((s, e) => s + calc(e.protein, e.quantity), 0),
        carbs: mealEntries.reduce((s, e) => s + calc(e.carbs, e.quantity), 0),
        fat: mealEntries.reduce((s, e) => s + calc(e.fat, e.quantity), 0),
      }
    })

    const hasTennis = tennisRes.rows.length > 0
    const hasGymExercises = exercisesRes.rows.length > 0
    const workout = wr ? {
      exists: hasGymExercises,
      exerciseCount: Number(wr.exerciseCount),
      setCount: Number(wr.setCount),
      hasTennis,
      exercises: exercisesRes.rows.map((r: { exerciseId: string; name: string }) => ({ id: r.exerciseId, name: r.name })),
    } : { exists: false, hasTennis, exercises: [] }

    const schedaInfo = wr?.templateId ? {
      templateId: wr.templateId,
      name: wr.templateName,
      order: wr.schedaOrder,
      color: wr.schedaColor,
      weekId: wr.weekId,
      weekName: wr.weekName,
      weekOrder: wr.weekOrder,
    } : null

    const tennisMeta = wr?.tennisType ? {
      type: wr.tennisType,
      hours: wr.tennisHours ?? '',
    } : null

    const weekSummary = weekRes.rows.map((r: { date: string; hasGym: boolean; hasTennis: boolean }) => ({
      date: String(r.date).slice(0, 10),
      hasGym: Boolean(r.hasGym),
      hasTennis: Boolean(r.hasTennis),
    }))

    return NextResponse.json({
      user, totals,
      targets: {
        calories: user?.targetCalories ?? 2000,
        protein: user?.targetProtein ?? 150,
        carbs: user?.targetCarbs ?? 220,
        fat: user?.targetFat ?? 65,
      },
      meals, workout, schedaInfo, tennisMeta, weekSummary,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}
