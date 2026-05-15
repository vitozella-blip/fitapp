import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`ALTER TABLE "MealPlanTarget" ADD COLUMN IF NOT EXISTS "notes" TEXT`)
    const { rows: orig } = await pool.query(`SELECT * FROM "MealPlan" WHERE id=$1`, [id])
    if (!orig[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const o = orig[0]
    const newId = `plan-${Date.now()}`
    await pool.query(
      `INSERT INTO "MealPlan" (id, "userId", name, "startDate", "endDate", notes, "isActive")
       VALUES ($1,$2,$3,$4,$5,$6,false)`,
      [newId, o.userId, `${o.name} (copia)`, o.startDate, o.endDate, o.notes]
    )
    const { rows: tgts } = await pool.query(`SELECT * FROM "MealPlanTarget" WHERE "planId"=$1`, [id])
    for (const t of tgts) {
      await pool.query(
        `INSERT INTO "MealPlanTarget" (id, "planId", meal, calories, protein, carbs, fat, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [`tgt-${Date.now()}-${Math.random().toString(36).slice(2,6)}-${t.meal}`, newId, t.meal,
         t.calories, t.protein, t.carbs, t.fat, t.notes]
      )
    }
    const { rows: plan } = await pool.query(`SELECT * FROM "MealPlan" WHERE id=$1`, [newId])
    const { rows: nt }   = await pool.query(`SELECT * FROM "MealPlanTarget" WHERE "planId"=$1`, [newId])
    return NextResponse.json({ ...plan[0], targets: nt })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
