import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureColumns() {
  await Promise.all([
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisType" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisHours" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisOpponent" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisResult" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisScore" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisTournament" TEXT`).catch(() => {}),
  ])
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json(null)
  try {
    await ensureColumns()
    const { rows } = await pool.query(
      `SELECT "tennisType","tennisHours","tennisOpponent","tennisResult","tennisScore","tennisTournament" FROM "WorkoutDiary" WHERE "userId"=$1 AND date=$2`,
      [userId, date]
    )
    const r = rows[0]
    if (!r?.tennisType) return NextResponse.json(null)
    return NextResponse.json({
      type: r.tennisType,
      hours: r.tennisHours ?? '',
      tournament: r.tennisTournament ?? '',
      opponent: r.tennisOpponent ?? '',
      result: r.tennisResult ?? null,
      score: r.tennisScore ?? '',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, type, hours, tournament, opponent, result, score } = await req.json()
  if (!userId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  try {
    await ensureColumns()
    const { rows } = await pool.query(
      `SELECT id FROM "WorkoutDiary" WHERE "userId"=$1 AND date=$2`, [userId, date]
    )
    if (rows.length > 0) {
      await pool.query(
        `UPDATE "WorkoutDiary" SET "tennisType"=$1,"tennisHours"=$2,"tennisOpponent"=$3,"tennisResult"=$4,"tennisScore"=$5,"tennisTournament"=$6 WHERE id=$7`,
        [type ?? null, hours ?? null, opponent ?? null, result ?? null, score ?? null, tournament ?? null, rows[0].id]
      )
    } else if (type) {
      await pool.query(
        `INSERT INTO "WorkoutDiary" (id,"userId",date,"tennisType","tennisHours","tennisOpponent","tennisResult","tennisScore","tennisTournament","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [crypto.randomUUID(), userId, date, type, hours ?? null, opponent ?? null, result ?? null, score ?? null, tournament ?? null]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
