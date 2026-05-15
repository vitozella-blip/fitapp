import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "startDate" TEXT`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "endDate" TEXT`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT false`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "weeks" TEXT`)

    if (body.action === 'reorder') {
      const { direction, userId } = body
      const { rows: all } = await pool.query(
        `SELECT id, "order" FROM "WorkoutPlan" WHERE "userId"=$1 ORDER BY "order" ASC`, [userId]
      )
      const idx = all.findIndex((r: { id: string }) => r.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= all.length) return NextResponse.json({ ok: true })
      const a = all[idx], b = all[swapIdx]
      await pool.query(`UPDATE "WorkoutPlan" SET "order"=$1 WHERE id=$2`, [b.order, a.id])
      await pool.query(`UPDATE "WorkoutPlan" SET "order"=$1 WHERE id=$2`, [a.order, b.id])
      return NextResponse.json({ ok: true })
    }

    if (body.isActive !== undefined) {
      const { rows } = await pool.query(`SELECT "userId" FROM "WorkoutPlan" WHERE id=$1`, [id])
      if (rows[0]) {
        await pool.query(`UPDATE "WorkoutPlan" SET "isActive"=false WHERE "userId"=$1`, [rows[0].userId])
        if (body.isActive) await pool.query(`UPDATE "WorkoutPlan" SET "isActive"=true WHERE id=$1`, [id])
      }
      return NextResponse.json({ ok: true })
    }

    const sets: string[] = []
    const vals: unknown[] = []
    let i = 1
    if (body.name !== undefined)      { sets.push(`name=$${i++}`);        vals.push(body.name) }
    if (body.startDate !== undefined) { sets.push(`"startDate"=$${i++}`); vals.push(body.startDate || null) }
    if (body.endDate !== undefined)   { sets.push(`"endDate"=$${i++}`);   vals.push(body.endDate || null) }
    if (body.weeks !== undefined)     { sets.push(`"weeks"=$${i++}`);     vals.push(JSON.stringify(body.weeks ?? [])) }
    if (sets.length === 0) {
      const { rows } = await pool.query(`SELECT * FROM "WorkoutPlan" WHERE id=$1`, [id])
      return NextResponse.json(rows[0])
    }
    vals.push(id)
    const { rows } = await pool.query(
      `UPDATE "WorkoutPlan" SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { rows: tmpls } = await pool.query(`SELECT id FROM "WorkoutTemplate" WHERE "planId"=$1`, [id])
    for (const t of tmpls) {
      await pool.query(`DELETE FROM "WorkoutTemplateExercise" WHERE "templateId"=$1`, [t.id])
    }
    await pool.query(`DELETE FROM "WorkoutTemplate" WHERE "planId"=$1`, [id])
    await pool.query(`DELETE FROM "WorkoutPlan" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
