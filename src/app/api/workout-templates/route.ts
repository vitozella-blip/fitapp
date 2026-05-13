import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get('planId')
  if (!planId) return NextResponse.json([])
  try {
    const { rows } = await pool.query(
      `SELECT * FROM "WorkoutTemplate" WHERE "planId"=$1 ORDER BY "order" ASC, "createdAt" ASC`,
      [planId]
    )
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { planId, userId, name, notes } = await req.json()
  try {
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutTemplate" WHERE "planId"=$1`, [planId]
    )
    const id = `wt-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutTemplate" (id,"planId",name,"userId","order",notes,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [id, planId, name, userId, maxRow[0].next, notes || null]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
