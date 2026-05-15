import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "startDate" TEXT`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "endDate" TEXT`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT false`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "weeks" TEXT`)

    const { rows: orig } = await pool.query(`SELECT * FROM "WorkoutPlan" WHERE id=$1`, [id])
    if (!orig[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const o = orig[0]
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutPlan" WHERE "userId"=$1`, [o.userId]
    )
    const newId = `wp-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutPlan" (id, name, "userId", "order", "startDate", "endDate", "weeks", "isActive", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,NOW()) RETURNING *`,
      [newId, `${o.name} (copia)`, o.userId, maxRow[0].next, o.startDate, o.endDate, o.weeks]
    )

    // Duplicate templates + exercises
    const { rows: tmpls } = await pool.query(
      `SELECT * FROM "WorkoutTemplate" WHERE "planId"=$1 ORDER BY "order" ASC`, [id]
    )
    for (const t of tmpls) {
      const newTid = `wt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      await pool.query(
        `INSERT INTO "WorkoutTemplate" (id,"planId",name,"userId","order","createdAt") VALUES ($1,$2,$3,$4,$5,NOW())`,
        [newTid, newId, t.name, o.userId, t.order]
      )
      const { rows: exs } = await pool.query(
        `SELECT * FROM "WorkoutTemplateExercise" WHERE "templateId"=$1 ORDER BY "order" ASC`, [t.id]
      )
      for (const ex of exs) {
        await pool.query(
          `INSERT INTO "WorkoutTemplateExercise"
            (id,"templateId","exerciseId","order",sets,reps,"restSeconds","noteScheda","notePersonali","createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
          [`wte-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, newTid, ex.exerciseId, ex.order,
           ex.sets, ex.reps, ex.restSeconds, ex.noteScheda, ex.notePersonali]
        )
      }
    }
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
