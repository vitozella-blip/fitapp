import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId     = req.nextUrl.searchParams.get('userId') ?? ''
  const exerciseId = req.nextUrl.searchParams.get('exerciseId') ?? ''
  const beforeDate = req.nextUrl.searchParams.get('beforeDate') ?? ''

  if (!userId || !exerciseId || !beforeDate) return NextResponse.json(null)

  try {
    // Find the most recent workout date before today that has sets for this exercise
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

    const date = dateRows[0].date

    const { rows: sets } = await pool.query(
      `SELECT s.reps, s.weight, s."isWarmup"
       FROM "WorkoutSet" s
       JOIN "WorkoutDiary" w ON w.id = s."workoutDiaryId"
       WHERE w."userId" = $1 AND s."exerciseId" = $2 AND w.date = $3
       ORDER BY s."createdAt" ASC`,
      [userId, exerciseId, date]
    )

    return NextResponse.json({ date, sets })
  } catch {
    return NextResponse.json(null)
  }
}
