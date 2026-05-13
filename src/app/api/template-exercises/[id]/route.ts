import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    if (body.action === 'reorder') {
      const { direction } = body
      const { rows: ex } = await pool.query(`SELECT "templateId" FROM "WorkoutTemplateExercise" WHERE id=$1`, [id])
      const { rows: all } = await pool.query(
        `SELECT id,"order" FROM "WorkoutTemplateExercise" WHERE "templateId"=$1 ORDER BY "order"`, [ex[0].templateId]
      )
      const idx = all.findIndex((r: {id:string}) => r.id === id)
      const si = direction === 'up' ? idx - 1 : idx + 1
      if (si < 0 || si >= all.length) return NextResponse.json({ ok: true })
      await pool.query(`UPDATE "WorkoutTemplateExercise" SET "order"=$1 WHERE id=$2`, [all[si].order, all[idx].id])
      await pool.query(`UPDATE "WorkoutTemplateExercise" SET "order"=$1 WHERE id=$2`, [all[idx].order, all[si].id])
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'move') {
      await pool.query(`UPDATE "WorkoutTemplateExercise" SET "templateId"=$1 WHERE id=$2`, [body.targetTemplateId, id])
      return NextResponse.json({ ok: true })
    }
    const { notes, restSeconds, timerSeconds } = body
    const { rows } = await pool.query(
      `UPDATE "WorkoutTemplateExercise" SET notes=$1,"restSeconds"=$2,"timerSeconds"=$3 WHERE id=$4 RETURNING *`,
      [notes || null, restSeconds || 90, timerSeconds || null, id]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "WorkoutTemplateExercise" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
