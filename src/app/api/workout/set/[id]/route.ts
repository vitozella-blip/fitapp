import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    await Promise.all([
      pool.query(`ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "isWarmup" BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {}),
      pool.query(`ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "tag" TEXT`).catch(() => {}),
    ])
    const setClauses: string[] = []
    const vals: unknown[] = []
    if (body.reps !== undefined) { setClauses.push(`reps=$${vals.length + 1}`); vals.push(body.reps) }
    if ('weight' in body) { setClauses.push(`weight=$${vals.length + 1}`); vals.push(body.weight ?? null) }
    if (body.isWarmup !== undefined) { setClauses.push(`"isWarmup"=$${vals.length + 1}`); vals.push(body.isWarmup) }
    if ('tag' in body) { setClauses.push(`tag=$${vals.length + 1}`); vals.push(body.tag ?? null) }
    if (setClauses.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    vals.push(id)
    const { rows } = await pool.query(
      `UPDATE "WorkoutSet" SET ${setClauses.join(', ')} WHERE id=$${vals.length} RETURNING *`,
      vals
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "WorkoutSet" WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
