import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "WeightEntry" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      date TEXT NOT NULL,
      value FLOAT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW()
    )
  `)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ entries: [], height: null })
  try {
    await ensureSchema()
    const [entriesRes, userRes] = await Promise.all([
      pool.query(
        `SELECT * FROM "WeightEntry" WHERE "userId"=$1 ORDER BY date ASC, "createdAt" ASC`,
        [userId]
      ),
      pool.query(`SELECT height, weight FROM "User" WHERE id=$1`, [userId]),
    ])
    const height = userRes.rows[0]?.height ?? null
    return NextResponse.json({ entries: entriesRes.rows, height })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ entries: [], height: null })
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, value } = await req.json()
  if (!userId || !date || value == null) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  try {
    await ensureSchema()
    const id = `w-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WeightEntry" (id,"userId",date,value) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, userId, date, Number(value)]
    )
    // update User.weight with latest
    await pool.query(`UPDATE "User" SET weight=$1 WHERE id=$2`, [Number(value), userId])
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const userId = req.nextUrl.searchParams.get('userId')
  if (!id || !userId) return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  try {
    await pool.query(`DELETE FROM "WeightEntry" WHERE id=$1 AND "userId"=$2`, [id, userId])
    // update User.weight with the new latest entry (if any)
    const { rows } = await pool.query(
      `SELECT value FROM "WeightEntry" WHERE "userId"=$1 ORDER BY date DESC, "createdAt" DESC LIMIT 1`,
      [userId]
    )
    if (rows[0]) {
      await pool.query(`UPDATE "User" SET weight=$1 WHERE id=$2`, [rows[0].value, userId])
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
