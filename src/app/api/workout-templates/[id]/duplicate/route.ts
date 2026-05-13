import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { rows: orig } = await pool.query(`SELECT * FROM "WorkoutTemplate" WHERE id=$1`, [id])
    if (!orig[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutTemplate" WHERE "planId"=$1`, [orig[0].planId]
    )
    const newId = `wt-${Date.now()}`
    const { rows: newT } = await pool.query(
      `INSERT INTO "WorkoutTemplate" (id,"planId",name,"userId","order",notes,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [newId, orig[0].planId, `${orig[0].name} (copia)`, orig[0].userId, maxRow[0].next, orig[0].notes]
    )
    // Duplicate exercises and sets
    const { rows: exs } = await pool.query(
      `SELECT * FROM "WorkoutTemplateExercise" WHERE "templateId"=$1 ORDER BY "order"`, [id]
    )
    for (const ex of exs) {
      const newExId = `wte-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
      await pool.query(
        `INSERT INTO "WorkoutTemplateExercise" (id,"templateId","exerciseId","order",notes,"restSeconds","timerSeconds","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [newExId, newId, ex.exerciseId, ex.order, ex.notes, ex.restSeconds, ex.timerSeconds]
      )
      const { rows: sets } = await pool.query(
        `SELECT * FROM "WorkoutTemplateSet" WHERE "templateExerciseId"=$1 ORDER BY "setNumber"`, [ex.id]
      )
      for (const s of sets) {
        await pool.query(
          `INSERT INTO "WorkoutTemplateSet" (id,"templateExerciseId","setNumber",reps,weight,notes) VALUES ($1,$2,$3,$4,$5,$6)`,
          [`wts-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, newExId, s.setNumber, s.reps, s.weight, s.notes]
        )
      }
    }
    return NextResponse.json(newT[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
