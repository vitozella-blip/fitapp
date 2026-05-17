import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    if (body.name !== undefined) {
      await pool.query(`UPDATE "WorkoutWeek" SET name=$1 WHERE id=$2`, [body.name, id])
    }
    if (body.order !== undefined) {
      await pool.query(`UPDATE "WorkoutWeek" SET "order"=$1 WHERE id=$2`, [body.order, id])
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
