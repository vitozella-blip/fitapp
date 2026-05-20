import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId     = req.nextUrl.searchParams.get('userId')
  const exerciseId = req.nextUrl.searchParams.get('exerciseId')
  const weeks      = req.nextUrl.searchParams.get('weeks') // null = all

  if (!userId) return NextResponse.json(null)

  try {
    // ── List of exercises done by this user ──────────────────────────────
    if (!exerciseId) {
      const { rows } = await pool.query(
        `SELECT e.id, e.name, e."muscleGroup",
                COUNT(DISTINCT w.date)::int          AS sessions,
                MAX(s.weight)                        AS "maxWeight",
                MAX(s.duration)                      AS "maxDuration",
                BOOL_OR(s.duration IS NOT NULL AND s.weight IS NULL) AS "isDuration"
         FROM "WorkoutSet" s
         JOIN "Exercise"     e ON e.id  = s."exerciseId"
         JOIN "WorkoutDiary" w ON w.id  = s."workoutDiaryId"
         WHERE w."userId" = $1
         GROUP BY e.id, e.name, e."muscleGroup"
         ORDER BY sessions DESC, e.name`,
        [userId]
      )
      return NextResponse.json(rows)
    }

    // ── Time-series for one exercise ─────────────────────────────────────
    const params: unknown[] = [userId, exerciseId]
    let dateFilter = ''
    if (weeks) {
      dateFilter = `AND w.date >= (CURRENT_DATE - ($3 || ' weeks')::interval)::text`
      params.push(weeks)
    }

    const { rows } = await pool.query(
      `SELECT
         w.date,
         MAX(s.weight)                          AS "maxWeight",
         SUM(s.reps * COALESCE(s.weight, 0))   AS "volume",
         SUM(s.duration)                        AS "totalDuration",
         COUNT(s.id)::int                       AS "setCount",
         json_agg(
           json_build_object(
             'setNumber', s."setNumber",
             'reps',      s.reps,
             'weight',    s.weight,
             'duration',  s.duration
           ) ORDER BY s."setNumber"
         ) AS sets
       FROM "WorkoutDiary" w
       JOIN "WorkoutSet" s ON s."workoutDiaryId" = w.id
       WHERE w."userId" = $1
         AND s."exerciseId" = $2
         ${dateFilter}
       GROUP BY w.date
       ORDER BY w.date ASC`,
      params
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error('GET /api/training/progress error:', e)
    return NextResponse.json([])
  }
}
