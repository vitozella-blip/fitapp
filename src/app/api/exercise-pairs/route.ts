import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ExercisePairConfig" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "exerciseAId" TEXT NOT NULL,
      "exerciseAName" TEXT NOT NULL,
      "exerciseBId" TEXT NOT NULL,
      "exerciseBName" TEXT NOT NULL,
      type TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE("userId","exerciseAId","exerciseBId")
    )
  `).catch(() => {})
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({})
  try {
    await ensureTable()
    const { rows } = await pool.query(
      `SELECT "exerciseAId","exerciseAName","exerciseBId","exerciseBName",type FROM "ExercisePairConfig" WHERE "userId"=$1`,
      [userId]
    )
    const result: Record<string, { partnerId: string; partnerName: string; type: string }> = {}
    for (const r of rows) {
      result[r.exerciseAId] = { partnerId: r.exerciseBId, partnerName: r.exerciseBName, type: r.type }
      result[r.exerciseBId] = { partnerId: r.exerciseAId, partnerName: r.exerciseAName, type: r.type }
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({})
  }
}

export async function POST(req: NextRequest) {
  const { userId, pairs } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  try {
    await ensureTable()
    // Deduplicate: store only A→B where A < B lexicographically
    const seen = new Set<string>()
    const toInsert: { a: string; aName: string; b: string; bName: string; type: string }[] = []
    for (const [exId, pair] of Object.entries(pairs as Record<string, { partnerId: string; partnerName: string; type: string }>)) {
      const isAFirst = exId < pair.partnerId
      const [a, aName, b, bName] = isAFirst
        ? [exId, '', pair.partnerId, pair.partnerName]
        : [pair.partnerId, pair.partnerName, exId, '']
      const key = `${a}_${b}`
      if (!seen.has(key)) {
        seen.add(key)
        toInsert.push({ a, aName, b, bName, type: pair.type })
      }
    }
    await pool.query(`DELETE FROM "ExercisePairConfig" WHERE "userId"=$1`, [userId])
    for (const p of toInsert) {
      await pool.query(
        `INSERT INTO "ExercisePairConfig" (id,"userId","exerciseAId","exerciseAName","exerciseBId","exerciseBName",type) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [crypto.randomUUID(), userId, p.a, p.aName, p.b, p.bName, p.type]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
