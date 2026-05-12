import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
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
    const { name } = body
    const { rows } = await pool.query(
      `UPDATE "WorkoutPlan" SET name=$1 WHERE id=$2 RETURNING *`, [name, id]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "WorkoutPlan" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
