import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "AbsSelection" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "templateId" TEXT NOT NULL,
      "exerciseId" TEXT NOT NULL,
      type TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE("userId","templateId","exerciseId")
    )
  `).catch(() => {})
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const templateId = req.nextUrl.searchParams.get('templateId')
  if (!userId || !templateId) return NextResponse.json([])
  try {
    await ensureTable()
    const { rows } = await pool.query(
      `SELECT "exerciseId",type FROM "AbsSelection" WHERE "userId"=$1 AND "templateId"=$2`,
      [userId, templateId]
    )
    return NextResponse.json(rows.map((r: { exerciseId: string; type: string }) => ({ id: r.exerciseId, type: r.type })))
  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const { userId, templateId, selections } = await req.json()
  if (!userId || !templateId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  try {
    await ensureTable()
    await pool.query(`DELETE FROM "AbsSelection" WHERE "userId"=$1 AND "templateId"=$2`, [userId, templateId])
    for (const sel of (selections ?? [])) {
      await pool.query(
        `INSERT INTO "AbsSelection" (id,"userId","templateId","exerciseId",type) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT ("userId","templateId","exerciseId") DO UPDATE SET type=EXCLUDED.type`,
        [crypto.randomUUID(), userId, templateId, sel.id, sel.type]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
