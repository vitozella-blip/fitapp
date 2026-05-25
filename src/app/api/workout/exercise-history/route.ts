import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId     = req.nextUrl.searchParams.get('userId') ?? ''
  const exerciseId = req.nextUrl.searchParams.get('exerciseId') ?? ''
  const beforeDate = req.nextUrl.searchParams.get('beforeDate') ?? ''
  const date       = req.nextUrl.searchParams.get('date') ?? ''
  const listDates  = req.nextUrl.searchParams.get('dates') ?? ''

  if (!userId || !exerciseId) return NextResponse.json(null)

  try {
    // Return list of all session dates for this exercise
    if (listDates) {
      const { rows } = await pool.query(
        `SELECT DISTINCT w.date::text AS date
         FROM "WorkoutSet" s
         JOIN "WorkoutDiary" w ON w.id = s."workoutDiaryId"
         WHERE w."userId" = $1 AND s."exerciseId" = $2
         ORDER BY date DESC
         LIMIT 20`,
        [userId, exerciseId]
      )
      return NextResponse.json(rows.map((r: { date: string }) => r.date))
    }

    // Resolve target date
    let targetDate: string
    if (date) {
      targetDate = date
    } else {
      if (!beforeDate) return NextResponse.json(null)
      const { rows: dateRows } = await pool.query(
        `SELECT w.date::text
         FROM "WorkoutSet" s
         JOIN "WorkoutDiary" w ON w.id = s."workoutDiaryId"
         WHERE w."userId" = $1 AND s."exerciseId" = $2 AND w.date < $3
         ORDER BY w.date DESC
         LIMIT 1`,
        [userId, exerciseId, beforeDate]
      )
      if (!dateRows.length) return NextResponse.json(null)
      targetDate = dateRows[0].date
    }

    const { rows: sets } = await pool.query(
      `SELECT s.id::text, s.reps, s.weight
       FROM "WorkoutSet" s
       JOIN "WorkoutDiary" w ON w.id = s."workoutDiaryId"
       WHERE w."userId" = $1 AND s."exerciseId" = $2 AND w.date = $3
       ORDER BY s.id ASC`,
      [userId, exerciseId, targetDate]
    )

    return NextResponse.json({ date: targetDate, sets })
  } catch {
    return NextResponse.json(null)
  }
}
