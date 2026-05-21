import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureColumns() {
  await Promise.all([
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "templateId" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "templateName" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "schedaOrder" INT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "schedaColor" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "weekName" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "weekOrder" INT`).catch(() => {}),
  ])
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json(null)
  try {
    await ensureColumns()
    const { rows } = await pool.query(
      `SELECT "templateId","templateName","schedaOrder","schedaColor","weekId","weekName","weekOrder"
       FROM "WorkoutDiary" WHERE "userId"=$1 AND date=$2`,
      [userId, date]
    )
    const r = rows[0]
    if (!r?.templateId) return NextResponse.json(null)
    return NextResponse.json({
      templateId: r.templateId,
      name: r.templateName,
      order: r.schedaOrder,
      color: r.schedaColor,
      weekId: r.weekId,
      weekName: r.weekName,
      weekOrder: r.weekOrder,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, templateId, name, order, color, weekId, weekName, weekOrder } = await req.json()
  if (!userId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  try {
    await ensureColumns()
    const { rows } = await pool.query(
      `SELECT id FROM "WorkoutDiary" WHERE "userId"=$1 AND date=$2`, [userId, date]
    )
    if (rows.length > 0) {
      await pool.query(
        `UPDATE "WorkoutDiary" SET "templateId"=$1,"templateName"=$2,"schedaOrder"=$3,"schedaColor"=$4,"weekId"=$5,"weekName"=$6,"weekOrder"=$7 WHERE id=$8`,
        [templateId, name, order, color, weekId ?? null, weekName ?? null, weekOrder ?? null, rows[0].id]
      )
    } else {
      await pool.query(
        `INSERT INTO "WorkoutDiary" (id,"userId",date,"templateId","templateName","schedaOrder","schedaColor","weekId","weekName","weekOrder","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [crypto.randomUUID(), userId, date, templateId, name, order, color, weekId ?? null, weekName ?? null, weekOrder ?? null]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  try {
    await pool.query(
      `UPDATE "WorkoutDiary" SET "templateId"=NULL,"templateName"=NULL,"schedaOrder"=NULL,"schedaColor"=NULL,"weekId"=NULL,"weekName"=NULL,"weekOrder"=NULL
       WHERE "userId"=$1 AND date=$2`,
      [userId, date]
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
