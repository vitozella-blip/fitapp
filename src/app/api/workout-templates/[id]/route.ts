import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { rows: [t] } = await pool.query(`SELECT id, name FROM "WorkoutTemplate" WHERE id=$1`, [id])
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { rows: exs } = await pool.query(
      `SELECT te.id, te.sets, te.reps, te."restSeconds", te."noteScheda", te."notePersonali",
              e.id as "exId", e.name as "exName", e."muscleGroup"
       FROM "WorkoutTemplateExercise" te
       JOIN "Exercise" e ON e.id = te."exerciseId"
       WHERE te."templateId" = $1
       ORDER BY te."order"`, [id]
    )
    return NextResponse.json({
      id: t.id, name: t.name,
      exercises: exs.map(r => ({
        id: r.id, sets: r.sets, reps: r.reps, restSeconds: r.restSeconds,
        noteScheda: r.noteScheda, notePersonali: r.notePersonali,
        exercise: { id: r.exId, name: r.exName, muscleGroup: r.muscleGroup },
      })),
    })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    if (body.action === 'reorder') {
      const { rows: t } = await pool.query(`SELECT "planId" FROM "WorkoutTemplate" WHERE id=$1`, [id])
      const { rows: all } = await pool.query(`SELECT id,"order" FROM "WorkoutTemplate" WHERE "planId"=$1 ORDER BY "order"`, [t[0].planId])
      const idx = all.findIndex((r: {id:string}) => r.id === id)
      const si = body.direction === 'up' ? idx - 1 : idx + 1
      if (si >= 0 && si < all.length) {
        await pool.query(`UPDATE "WorkoutTemplate" SET "order"=$1 WHERE id=$2`, [all[si].order, all[idx].id])
        await pool.query(`UPDATE "WorkoutTemplate" SET "order"=$1 WHERE id=$2`, [all[idx].order, all[si].id])
      }
      return NextResponse.json({ ok: true })
    }
    await pool.query(`UPDATE "WorkoutTemplate" SET name=$1 WHERE id=$2`, [body.name, id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "WorkoutTemplate" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
