import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const weekId = req.nextUrl.searchParams.get('weekId')
  if (!weekId) return NextResponse.json([])
  try {
    const { rows } = await pool.query(
      `SELECT * FROM "WorkoutWeekParam" WHERE "weekId"=$1`, [weekId]
    )
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function PUT(req: NextRequest) {
  const { weekId, templateExId, sets, reps, restSeconds, notes, suggestedWeight } = await req.json()
  if (!weekId || !templateExId) return NextResponse.json({ error: 'weekId e templateExId obbligatori' }, { status: 400 })
  try {
    const id = `wwp-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutWeekParam" (id,"weekId","templateExId",sets,reps,"restSeconds",notes,"suggestedWeight")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT ("weekId","templateExId") DO UPDATE SET
         sets=EXCLUDED.sets, reps=EXCLUDED.reps, "restSeconds"=EXCLUDED."restSeconds",
         notes=EXCLUDED.notes, "suggestedWeight"=EXCLUDED."suggestedWeight"
       RETURNING *`,
      [id, weekId, templateExId,
       sets ?? 3, reps ?? null, restSeconds ?? 90, notes ?? null, suggestedWeight ?? null]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
