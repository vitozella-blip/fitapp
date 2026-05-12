import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    const { rows } = await pool.query(
      `SELECT * FROM "WorkoutPlan" WHERE "userId"=$1 ORDER BY "order" ASC, "createdAt" ASC`,
      [userId]
    )
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { userId, name } = await req.json()
  try {
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutPlan" WHERE "userId"=$1`, [userId]
    )
    const order = maxRow[0].next
    const id = `wp-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutPlan" (id, name, "userId", "order", "createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [id, name, userId, order]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
