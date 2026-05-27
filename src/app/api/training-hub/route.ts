import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const fromParam = req.nextUrl.searchParams.get('from')
  const toParam   = req.nextUrl.searchParams.get('to')
  const year   = req.nextUrl.searchParams.get('year')
  const month  = req.nextUrl.searchParams.get('month')

  if (!userId) return NextResponse.json({ templates: [] })

  let from: string, next: string
  if (fromParam && toParam) {
    from = fromParam
    // next = day after toParam
    const d = new Date(toParam + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    next = d.toISOString().slice(0, 10)
  } else if (year && month) {
    const m = String(month).padStart(2, '0')
    from = `${year}-${m}-01`
    next = Number(month) === 12
      ? `${Number(year) + 1}-01-01`
      : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`
  } else {
    return NextResponse.json({ templates: [] })
  }

  try {
    const { rows: plans } = await pool.query(
      `SELECT id FROM "WorkoutPlan" WHERE "userId"=$1 ORDER BY "isActive" DESC, "createdAt" DESC LIMIT 1`,
      [userId]
    )
    if (!plans.length) return NextResponse.json({ templates: [] })

    const [{ rows }, { rows: tennisRows }] = await Promise.all([
      // Workout template dates: match via templateId OR weekId→WorkoutWeek→template
      pool.query(
        `SELECT
           t.id, t.name, t."order",
           COALESCE(
             json_agg(DISTINCT wd.date::text)
               FILTER (WHERE wd.date IS NOT NULL AND wd.date >= $2 AND wd.date < $3),
             '[]'
           ) AS dates
         FROM "WorkoutTemplate" t
         LEFT JOIN "WorkoutDiary" wd ON wd."userId" = $1
           AND (
             wd."templateId" = t.id
             OR wd."weekId" IN (
               SELECT id FROM "WorkoutWeek" WHERE "templateId" = t.id
             )
           )
         WHERE t."planId" = $4
         GROUP BY t.id, t.name, t."order"
         ORDER BY t."order"`,
        [userId, from, next, plans[0].id]
      ),
      // Tennis dates: sessioni dedicate (tennisType) + esercizi 'Tennis' in WorkoutSet
      pool.query(
        `SELECT DISTINCT date::text AS date
         FROM "WorkoutDiary"
         WHERE "userId" = $1
           AND "tennisType" IS NOT NULL
           AND date >= $2 AND date < $3
         UNION
         SELECT DISTINCT w.date::text AS date
         FROM "WorkoutDiary" w
         JOIN "WorkoutSet" s ON s."workoutDiaryId" = w.id
         JOIN "Exercise" e ON e.id = s."exerciseId"
         WHERE w."userId" = $1 AND e.name ILIKE 'Tennis'
           AND w.date >= $2 AND w.date < $3
         ORDER BY date DESC`,
        [userId, from, next]
      ),
    ])

    return NextResponse.json({
      templates: rows,
      tennisDates: tennisRows.map((r: { date: string }) => r.date),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ templates: [] })
  }
}
