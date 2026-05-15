import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureSchema() {
  await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "startDate" TEXT`)
  await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "endDate" TEXT`)
  await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT false`)
  await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "weeks" TEXT`)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    await ensureSchema()
    const { rows } = await pool.query(
      `SELECT * FROM "WorkoutPlan" WHERE "userId"=$1 ORDER BY "order" ASC, "createdAt" ASC`,
      [userId]
    )
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { userId, name, startDate, endDate, weeks } = await req.json()
  try {
    await ensureSchema()
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutPlan" WHERE "userId"=$1`, [userId]
    )
    const order = maxRow[0].next
    const id = `wp-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutPlan" (id, name, "userId", "order", "startDate", "endDate", "weeks", "isActive", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,NOW()) RETURNING *`,
      [id, name, userId, order, startDate || null, endDate || null, JSON.stringify(weeks ?? [])]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
