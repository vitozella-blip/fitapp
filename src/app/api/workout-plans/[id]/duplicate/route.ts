import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { rows: orig } = await pool.query(`SELECT * FROM "WorkoutPlan" WHERE id=$1`, [id])
    if (!orig[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutPlan" WHERE "userId"=$1`, [orig[0].userId]
    )
    const newId = `wp-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutPlan" (id, name, "userId", "order", "createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [newId, `${orig[0].name} (copia)`, orig[0].userId, maxRow[0].next]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
