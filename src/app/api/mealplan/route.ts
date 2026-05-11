import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    const { rows: plans } = await pool.query(
      `SELECT * FROM "MealPlan" WHERE "userId"=$1 ORDER BY "createdAt" DESC`, [userId]
    )
    const result = await Promise.all(plans.map(async (p: Record<string, unknown>) => {
      const { rows: targets } = await pool.query(
        `SELECT * FROM "MealPlanTarget" WHERE "planId"=$1 ORDER BY meal`, [p.id]
      )
      return { ...p, targets }
    }))
    return NextResponse.json(result)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { userId, name, startDate, endDate, notes, targets } = await req.json()
  try {
    const id = `plan-${Date.now()}`
    await pool.query(
      `INSERT INTO "MealPlan" (id, "userId", name, "startDate", "endDate", notes) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, userId, name, startDate || null, endDate || null, notes || null]
    )
    for (const meal of MEALS) {
      const t = targets?.[meal] ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
      await pool.query(
        `INSERT INTO "MealPlanTarget" (id, "planId", meal, calories, protein, carbs, fat) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [`tgt-${Date.now()}-${meal}`, id, meal, t.calories, t.protein, t.carbs, t.fat]
      )
    }
    const { rows: plan } = await pool.query(`SELECT * FROM "MealPlan" WHERE id=$1`, [id])
    const { rows: tgts } = await pool.query(`SELECT * FROM "MealPlanTarget" WHERE "planId"=$1`, [id])
    return NextResponse.json({ ...plan[0], targets: tgts })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
