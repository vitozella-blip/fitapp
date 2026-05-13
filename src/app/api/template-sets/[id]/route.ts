import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { reps, weight, notes } = await req.json()
  try {
    const { rows } = await pool.query(
      `UPDATE "WorkoutTemplateSet" SET reps=$1,weight=$2,notes=$3 WHERE id=$4 RETURNING *`,
      [reps, weight || null, notes || null, id]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "WorkoutTemplateSet" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
