import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    if (body.action === 'reorder') {
      const { rows: ex } = await pool.query(`SELECT "templateId" FROM "WorkoutTemplateExercise" WHERE id=$1`, [id])
      const { rows: all } = await pool.query(`SELECT id,"order" FROM "WorkoutTemplateExercise" WHERE "templateId"=$1 ORDER BY "order"`, [ex[0].templateId])
      const idx = all.findIndex((r: {id:string}) => r.id === id)
      const si = body.direction === 'up' ? idx - 1 : idx + 1
      if (si >= 0 && si < all.length) {
        await pool.query(`UPDATE "WorkoutTemplateExercise" SET "order"=$1 WHERE id=$2`, [all[si].order, all[idx].id])
        await pool.query(`UPDATE "WorkoutTemplateExercise" SET "order"=$1 WHERE id=$2`, [all[idx].order, all[si].id])
      }
      return NextResponse.json({ ok: true })
    }
    const { sets, reps, restSeconds, noteScheda, notePersonali } = body
    await pool.query(
      `UPDATE "WorkoutTemplateExercise" SET sets=$1,reps=$2,"restSeconds"=$3,"noteScheda"=$4,"notePersonali"=$5 WHERE id=$6`,
      [sets, reps, restSeconds, noteScheda||null, notePersonali||null, id]
    )
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "WorkoutTemplateExercise" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
