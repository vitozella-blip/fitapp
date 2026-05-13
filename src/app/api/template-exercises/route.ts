import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get('templateId')
  if (!templateId) return NextResponse.json([])
  try {
    const { rows } = await pool.query(
      `SELECT te.*, row_to_json(e) as exercise,
        (SELECT json_agg(s ORDER BY s."setNumber") FROM "WorkoutTemplateSet" s WHERE s."templateExerciseId"=te.id) as sets
       FROM "WorkoutTemplateExercise" te
       JOIN "Exercise" e ON e.id=te."exerciseId"
       WHERE te."templateId"=$1 ORDER BY te."order"`,
      [templateId]
    )
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { templateId, exerciseId, notes, restSeconds, timerSeconds, sets } = await req.json()
  try {
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutTemplateExercise" WHERE "templateId"=$1`, [templateId]
    )
    const id = `wte-${Date.now()}`
    await pool.query(
      `INSERT INTO "WorkoutTemplateExercise" (id,"templateId","exerciseId","order",notes,"restSeconds","timerSeconds","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [id, templateId, exerciseId, maxRow[0].next, notes || null, restSeconds || 90, timerSeconds || null]
    )
    const setsToCreate = sets ?? [{ setNumber: 1, reps: '10', weight: null }]
    for (const s of setsToCreate) {
      await pool.query(
        `INSERT INTO "WorkoutTemplateSet" (id,"templateExerciseId","setNumber",reps,weight,notes) VALUES ($1,$2,$3,$4,$5,$6)`,
        [`wts-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, id, s.setNumber, s.reps || '10', s.weight || null, s.notes || null]
      )
    }
    const { rows } = await pool.query(
      `SELECT te.*, row_to_json(e) as exercise,
        (SELECT json_agg(s ORDER BY s."setNumber") FROM "WorkoutTemplateSet" s WHERE s."templateExerciseId"=te.id) as sets
       FROM "WorkoutTemplateExercise" te JOIN "Exercise" e ON e.id=te."exerciseId" WHERE te.id=$1`, [id]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
