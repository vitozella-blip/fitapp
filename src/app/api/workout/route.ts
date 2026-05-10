import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  const all = req.nextUrl.searchParams.get('all')

  if (!userId) return NextResponse.json([])
  try {
    if (all) {
      const { rows } = await pool.query(
        `SELECT w.*, COUNT(s.id) as "setCount", COUNT(DISTINCT s."exerciseId") as "exerciseCount"
         FROM "WorkoutDiary" w LEFT JOIN "WorkoutSet" s ON s."workoutDiaryId" = w.id
         WHERE w."userId" = $1 GROUP BY w.id ORDER BY w.date DESC LIMIT 30`,
        [userId]
      )
      return NextResponse.json(rows)
    }
    const { rows } = await pool.query(
      `SELECT w.*, json_agg(json_build_object('id',s.id,'setNumber',s."setNumber",'reps',s.reps,'weight',s.weight,'exerciseId',s."exerciseId",'exercise',e)) as sets
       FROM "WorkoutDiary" w
       LEFT JOIN "WorkoutSet" s ON s."workoutDiaryId" = w.id
       LEFT JOIN "Exercise" e ON e.id = s."exerciseId"
       WHERE w."userId" = $1 AND w.date = $2
       GROUP BY w.id`,
      [userId, date]
    )
    return NextResponse.json(rows[0] || null)
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, exerciseId, sets, reps, weight } = await req.json()
  try {
    await pool.query(
      `INSERT INTO "User" (id, name, "targetCalories", "targetProtein", "targetCarbs", "targetFat", goal, "createdAt") VALUES ($1,'Utente',2000,150,220,65,'maintain',NOW()) ON CONFLICT (id) DO NOTHING`,
      [userId]
    )
    let workoutId: string
    const { rows: existing } = await pool.query(
      `SELECT id FROM "WorkoutDiary" WHERE "userId" = $1 AND date = $2`, [userId, date]
    )
    if (existing.length > 0) {
      workoutId = existing[0].id
    } else {
      workoutId = crypto.randomUUID()
      await pool.query(
        `INSERT INTO "WorkoutDiary" (id, "userId", date, "createdAt") VALUES ($1,$2,$3,NOW())`,
        [workoutId, userId, date]
      )
    }
    for (let i = 0; i < sets; i++) {
      await pool.query(
        `INSERT INTO "WorkoutSet" (id, "workoutDiaryId", "exerciseId", "setNumber", reps, weight) VALUES ($1,$2,$3,$4,$5,$6)`,
        [crypto.randomUUID(), workoutId, exerciseId, i + 1, reps, weight || null]
      )
    }
    return NextResponse.json({ ok: true, workoutId })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
