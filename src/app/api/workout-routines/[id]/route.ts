import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function findOrCreateExercise(name: string, userId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM "Exercise" WHERE LOWER(name) = LOWER($1) LIMIT 1`, [name.trim()]
  )
  if (rows.length > 0) return rows[0].id
  const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await pool.query(
    `INSERT INTO "Exercise" (id, name, "muscleGroup", "userId") VALUES ($1, $2, $3, $4)`,
    [id, name.trim(), '', userId]
  )
  return id
}

async function findOrCreateTemplateExercise(
  templateId: string, exerciseId: string, noteScheda: string, notePersonali: string
): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM "WorkoutTemplateExercise" WHERE "templateId"=$1 AND "exerciseId"=$2 LIMIT 1`,
    [templateId, exerciseId]
  )
  if (rows.length > 0) {
    await pool.query(
      `UPDATE "WorkoutTemplateExercise" SET "noteScheda"=$1, "notePersonali"=$2 WHERE id=$3`,
      [noteScheda || null, notePersonali || null, rows[0].id]
    )
    return rows[0].id
  }
  const { rows: mx } = await pool.query(
    `SELECT COALESCE(MAX("order"), 0) + 1 as next FROM "WorkoutTemplateExercise" WHERE "templateId"=$1`,
    [templateId]
  )
  const id = `wte-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await pool.query(
    `INSERT INTO "WorkoutTemplateExercise"
     (id, "templateId", "exerciseId", "order", sets, reps, "restSeconds", "noteScheda", "notePersonali", "createdAt")
     VALUES ($1, $2, $3, $4, 3, '10', 90, $5, $6, NOW())`,
    [id, templateId, exerciseId, mx[0].next, noteScheda || null, notePersonali || null]
  )
  return id
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: weekId } = await params
  const { name, templateId, userId, exercises } = await req.json()
  try {
    if (name !== undefined) {
      await pool.query(`UPDATE "WorkoutWeek" SET name=$1 WHERE id=$2`, [name, weekId])
    }
    if (exercises !== undefined && templateId && userId) {
      await pool.query(`DELETE FROM "WorkoutWeekParam" WHERE "weekId"=$1`, [weekId])
      for (const ex of exercises) {
        if (!ex.name?.trim()) continue
        const exerciseId = await findOrCreateExercise(ex.name, userId)
        const templateExId = await findOrCreateTemplateExercise(
          templateId, exerciseId, ex.noteScheda || '', ex.notePersonali || ''
        )
        const pid = `wwp-${Date.now()}-${Math.random().toString(36).slice(2)}`
        await pool.query(
          `INSERT INTO "WorkoutWeekParam" (id,"weekId","templateExId",sets,reps,"restSeconds",notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT ("weekId","templateExId") DO UPDATE SET
             sets=EXCLUDED.sets, reps=EXCLUDED.reps, "restSeconds"=EXCLUDED."restSeconds", notes=EXCLUDED.notes`,
          [pid, weekId, templateExId, ex.sets ?? 3, ex.reps || '', ex.restSeconds ?? 90, ex.noteScheda || null]
        )
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "WorkoutWeekParam" WHERE "weekId"=$1`, [id])
    await pool.query(`DELETE FROM "WorkoutWeek" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
