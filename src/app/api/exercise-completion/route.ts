import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ExerciseCompletion" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      date TEXT NOT NULL,
      "exerciseId" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE("userId", date, "exerciseId")
    )
  `).catch(() => {})
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    await ensureTable()
    const { rows } = await pool.query(
      `SELECT date,"exerciseId" FROM "ExerciseCompletion" WHERE "userId"=$1`,
      [userId]
    )
    return NextResponse.json(rows.map((r: { date: string; exerciseId: string }) => `${r.date}_${r.exerciseId}`))
  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, exerciseId, completed } = await req.json()
  if (!userId || !date || !exerciseId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  try {
    await ensureTable()
    if (completed) {
      await pool.query(
        `INSERT INTO "ExerciseCompletion" (id,"userId",date,"exerciseId") VALUES ($1,$2,$3,$4)
         ON CONFLICT ("userId",date,"exerciseId") DO NOTHING`,
        [crypto.randomUUID(), userId, date, exerciseId]
      )
    } else {
      await pool.query(
        `DELETE FROM "ExerciseCompletion" WHERE "userId"=$1 AND date=$2 AND "exerciseId"=$3`,
        [userId, date, exerciseId]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
