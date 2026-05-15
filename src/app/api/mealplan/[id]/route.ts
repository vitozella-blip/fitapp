import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

type TargetIn = { calories: number; protein: number; carbs: number; fat: number; notes?: string[] }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, startDate, endDate, notes, targets, isActive } = await req.json()
  try {
    await pool.query(`ALTER TABLE "MealPlanTarget" ADD COLUMN IF NOT EXISTS "notes" TEXT`)

    if (isActive !== undefined) {
      const { rows } = await pool.query(`SELECT "userId" FROM "MealPlan" WHERE id=$1`, [id])
      if (rows[0]) {
        await pool.query(`UPDATE "MealPlan" SET "isActive"=false WHERE "userId"=$1`, [rows[0].userId])
        if (isActive) await pool.query(`UPDATE "MealPlan" SET "isActive"=true WHERE id=$1`, [id])
      }
      return NextResponse.json({ ok: true })
    }

    await pool.query(
      `UPDATE "MealPlan" SET name=$1, "startDate"=$2, "endDate"=$3, notes=$4 WHERE id=$5`,
      [name, startDate || null, endDate || null, notes || null, id]
    )

    if (targets) {
      for (const [meal, t] of Object.entries(targets as Record<string, TargetIn>)) {
        const notesJson = JSON.stringify(t.notes ?? [])
        const upd = await pool.query(
          `UPDATE "MealPlanTarget" SET calories=$1, protein=$2, carbs=$3, fat=$4, notes=$5
           WHERE "planId"=$6 AND meal=$7`,
          [t.calories || 0, t.protein || 0, t.carbs || 0, t.fat || 0, notesJson, id, meal]
        )
        if (upd.rowCount === 0) {
          await pool.query(
            `INSERT INTO "MealPlanTarget" (id, "planId", meal, calories, protein, carbs, fat, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [`tgt-${Date.now()}-${meal}`, id, meal, t.calories || 0, t.protein || 0, t.carbs || 0, t.fat || 0, notesJson]
          )
        }
      }
    }

    const { rows: plan } = await pool.query(`SELECT * FROM "MealPlan" WHERE id=$1`, [id])
    const { rows: tgts } = await pool.query(`SELECT * FROM "MealPlanTarget" WHERE "planId"=$1`, [id])
    return NextResponse.json({ ...plan[0], targets: tgts })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "MealPlanTarget" WHERE "planId"=$1`, [id])
    await pool.query(`DELETE FROM "MealPlan" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
