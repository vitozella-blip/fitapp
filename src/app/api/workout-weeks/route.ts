import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS "WorkoutWeek" (
    id TEXT PRIMARY KEY, "templateId" TEXT NOT NULL, name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0, "createdAt" TIMESTAMP DEFAULT NOW()
  )`)
  await pool.query(`CREATE TABLE IF NOT EXISTS "WorkoutWeekParam" (
    id TEXT PRIMARY KEY, "weekId" TEXT NOT NULL, "templateExId" TEXT NOT NULL,
    sets INTEGER DEFAULT 3, reps TEXT, "restSeconds" INTEGER DEFAULT 90,
    notes TEXT, "suggestedWeight" FLOAT, UNIQUE("weekId", "templateExId")
  )`)
}

export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get('templateId')
  if (!templateId) return NextResponse.json([])
  try {
    await ensureSchema()
    const { rows } = await pool.query(
      `SELECT * FROM "WorkoutWeek" WHERE "templateId"=$1 ORDER BY "order" ASC`, [templateId]
    )
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { templateId, name } = await req.json()
  try {
    await ensureSchema()
    const { rows: m } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutWeek" WHERE "templateId"=$1`, [templateId]
    )
    const id = `ww-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutWeek" (id,"templateId",name,"order","createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [id, templateId, name, m[0].next]
    )
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
