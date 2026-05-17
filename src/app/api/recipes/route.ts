import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS "Recipe" (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    "userId" TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
  )`)
  await pool.query(`CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
    id TEXT PRIMARY KEY, "recipeId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL, "quantityG" FLOAT NOT NULL
  )`)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    await ensureSchema()
    const { rows } = await pool.query(`
      SELECT r.id, r.name, r."createdAt",
        COALESCE(json_agg(json_build_object(
          'foodId', ri."foodId",
          'foodName', f.name,
          'brand', f.brand,
          'quantityG', ri."quantityG",
          'calories', f.calories,
          'protein', f.protein,
          'carbs', f.carbs,
          'fat', f.fat
        ) ORDER BY ri.id) FILTER (WHERE ri.id IS NOT NULL), '[]'::json) as ingredients
      FROM "Recipe" r
      LEFT JOIN "RecipeIngredient" ri ON ri."recipeId" = r.id
      LEFT JOIN "Food" f ON f.id = ri."foodId"
      WHERE r."userId" = $1
      GROUP BY r.id, r.name, r."createdAt"
      ORDER BY r."createdAt" DESC
    `, [userId])
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { userId, name, ingredients } = await req.json()
  if (!userId || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  try {
    await ensureSchema()
    const id = `recipe-${Date.now()}`
    await pool.query(
      `INSERT INTO "Recipe" (id, name, "userId", "createdAt") VALUES ($1,$2,$3,NOW())`,
      [id, name, userId]
    )
    for (const ing of (ingredients ?? [])) {
      const iid = `ri-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await pool.query(
        `INSERT INTO "RecipeIngredient" (id, "recipeId", "foodId", "quantityG") VALUES ($1,$2,$3,$4)`,
        [iid, id, ing.foodId, ing.quantityG]
      )
    }
    return NextResponse.json({ id, name })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
