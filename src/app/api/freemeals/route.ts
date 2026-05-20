import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "FreeMeal" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      UNIQUE ("userId", date, meal)
    )
  `)
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const userId = req.nextUrl.searchParams.get('userId')
  const date   = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json([])
  const { rows } = await pool.query(
    `SELECT meal FROM "FreeMeal" WHERE "userId"=$1 AND date=$2`,
    [userId, date]
  )
  return NextResponse.json(rows.map((r: { meal: string }) => r.meal))
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const { userId, date, meal } = await req.json()
  const { rows: existing } = await pool.query(
    `SELECT id FROM "FreeMeal" WHERE "userId"=$1 AND date=$2 AND meal=$3`,
    [userId, date, meal]
  )
  if (existing.length > 0) {
    await pool.query(`DELETE FROM "FreeMeal" WHERE "userId"=$1 AND date=$2 AND meal=$3`, [userId, date, meal])
    return NextResponse.json({ free: false })
  }
  await pool.query(
    `INSERT INTO "FreeMeal" (id, "userId", date, meal) VALUES ($1,$2,$3,$4)`,
    [`fm-${Date.now()}`, userId, date, meal]
  )
  return NextResponse.json({ free: true })
}
