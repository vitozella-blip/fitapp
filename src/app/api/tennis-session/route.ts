import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureColumns() {
  await Promise.all([
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisType" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisHours" TEXT`).catch(() => {}),
  ])
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json(null)
  try {
    await ensureColumns()
    const { rows } = await pool.query(
      `SELECT "tennisType","tennisHours" FROM "WorkoutDiary" WHERE "userId"=$1 AND date=$2`,
      [userId, date]
    )
    const r = rows[0]
    if (!r?.tennisType) return NextResponse.json(null)
    return NextResponse.json({ type: r.tennisType, hours: r.tennisHours ?? '' })
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, type, hours } = await req.json()
  if (!userId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  try {
    await ensureColumns()
    const { rows } = await pool.query(
      `SELECT id FROM "WorkoutDiary" WHERE "userId"=$1 AND date=$2`, [userId, date]
    )
    if (rows.length > 0) {
      await pool.query(
        `UPDATE "WorkoutDiary" SET "tennisType"=$1,"tennisHours"=$2 WHERE id=$3`,
        [type ?? null, hours ?? null, rows[0].id]
      )
    } else if (type) {
      // Crea riga solo se c'è un tipo valido (non azzerare su righe inesistenti)
      await pool.query(
        `INSERT INTO "WorkoutDiary" (id,"userId",date,"tennisType","tennisHours","createdAt") VALUES ($1,$2,$3,$4,$5,NOW())`,
        [crypto.randomUUID(), userId, date, type, hours ?? null]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
