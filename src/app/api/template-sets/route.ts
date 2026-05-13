import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { templateExerciseId, setNumber, reps, weight, notes } = await req.json()
  const id = `wts-${Date.now()}`
  try {
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutTemplateSet" (id,"templateExerciseId","setNumber",reps,weight,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, templateExerciseId, setNumber, reps || '10', weight || null, notes || null]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
