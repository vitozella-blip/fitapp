import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { templateId, exerciseId, sets, reps, restSeconds, noteScheda, notePersonali } = await req.json()
  try {
    const { rows: m } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutTemplateExercise" WHERE "templateId"=$1`, [templateId]
    )
    const id = `wte-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutTemplateExercise"
       (id,"templateId","exerciseId","order",sets,reps,"restSeconds","noteScheda","notePersonali","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
      [id, templateId, exerciseId, m[0].next, sets||3, reps||'10', restSeconds||90, noteScheda||null, notePersonali||null]
    )
    const { rows: ex } = await pool.query(`SELECT * FROM "Exercise" WHERE id=$1`, [exerciseId])
    return NextResponse.json({ ...rows[0], exercise: ex[0] })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
