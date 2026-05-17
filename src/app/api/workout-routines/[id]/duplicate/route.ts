import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: srcId } = await params
  try {
    const { rows: src } = await pool.query(`SELECT * FROM "WorkoutWeek" WHERE id=$1`, [srcId])
    if (!src.length) return NextResponse.json({ error: 'Routine non trovata' }, { status: 404 })
    const srcWeek = src[0]

    const { rows: mx } = await pool.query(
      `SELECT COALESCE(MAX("order"), 0) + 1 as next FROM "WorkoutWeek" WHERE "templateId"=$1`,
      [srcWeek.templateId]
    )
    const newId = `ww-${Date.now()}`
    const { rows: newWeek } = await pool.query(
      `INSERT INTO "WorkoutWeek" (id,"templateId",name,"order","createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [newId, srcWeek.templateId, `${srcWeek.name} (copia)`, mx[0].next]
    )

    const { rows: srcParams } = await pool.query(
      `SELECT * FROM "WorkoutWeekParam" WHERE "weekId"=$1`, [srcId]
    )
    for (const p of srcParams) {
      const pid = `wwp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await pool.query(
        `INSERT INTO "WorkoutWeekParam" (id,"weekId","templateExId",sets,reps,"restSeconds",notes,"suggestedWeight")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pid, newId, p.templateExId, p.sets, p.reps, p.restSeconds, p.notes, p.suggestedWeight]
      )
    }
    return NextResponse.json(newWeek[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
