import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function upsertRecipeFood(db: typeof pool, recipeId: string, name: string, userId: string) {
  const { rows } = await db.query(`
    SELECT ri.quantity, f.calories, f.protein, f.carbs, f.fat
    FROM "RecipeIngredient" ri JOIN "Food" f ON f.id = ri."foodId"
    WHERE ri."recipeId" = $1
  `, [recipeId])
  const totalW = rows.reduce((s: number, r: any) => s + Number(r.quantity), 0)
  if (totalW <= 0) return
  const cal  = rows.reduce((s: number, r: any) => s + r.calories * r.quantity / 100, 0)
  const pro  = rows.reduce((s: number, r: any) => s + r.protein  * r.quantity / 100, 0)
  const carb = rows.reduce((s: number, r: any) => s + r.carbs    * r.quantity / 100, 0)
  const fat  = rows.reduce((s: number, r: any) => s + r.fat      * r.quantity / 100, 0)
  await db.query(`
    INSERT INTO "Food" (id, name, brand, "userId", calories, protein, carbs, fat, "saturatedFat", sugars, salt, "per100g")
    VALUES ($1,$2,'Ricetta',$3,$4,$5,$6,$7,0,0,0,true)
    ON CONFLICT (id) DO UPDATE SET
      name=EXCLUDED.name, calories=EXCLUDED.calories, protein=EXCLUDED.protein,
      carbs=EXCLUDED.carbs, fat=EXCLUDED.fat
  `, [
    `food-recipe-${recipeId}`, name, userId,
    Math.round(cal / totalW * 100),
    Math.round(pro / totalW * 1000) / 10,
    Math.round(carb / totalW * 1000) / 10,
    Math.round(fat / totalW * 1000) / 10,
  ])
}

async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS "Recipe" (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    "userId" TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
  )`)
  await pool.query(`ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS servings INT DEFAULT 1`)
  await pool.query(`CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
    id TEXT PRIMARY KEY, "recipeId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL, quantity FLOAT NOT NULL
  )`)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    await ensureSchema()
    const { rows } = await pool.query(`
      SELECT r.id, r.name, r."createdAt", COALESCE(r.servings, 1) as servings,
        COALESCE(json_agg(json_build_object(
          'foodId', ri."foodId",
          'foodName', f.name,
          'brand', f.brand,
          'quantityG', ri.quantity,
          'calories', f.calories,
          'protein', f.protein,
          'carbs', f.carbs,
          'fat', f.fat
        ) ORDER BY ri.id) FILTER (WHERE ri.id IS NOT NULL), '[]'::json) as ingredients
      FROM "Recipe" r
      LEFT JOIN "RecipeIngredient" ri ON ri."recipeId" = r.id
      LEFT JOIN "Food" f ON f.id = ri."foodId"
      WHERE r."userId" = $1
      GROUP BY r.id, r.name, r."createdAt", r.servings
      ORDER BY r."createdAt" DESC
    `, [userId])
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { userId, name, servings, ingredients } = await req.json()
  if (!userId || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  try {
    await ensureSchema()
    const id = `recipe-${Date.now()}`
    const s = Math.max(1, Number(servings) || 1)
    await pool.query(
      `INSERT INTO "Recipe" (id, name, "userId", servings, "createdAt") VALUES ($1,$2,$3,$4,NOW())`,
      [id, name, userId, s]
    )
    for (const ing of (ingredients ?? [])) {
      const iid = `ri-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await pool.query(
        `INSERT INTO "RecipeIngredient" (id, "recipeId", "foodId", quantity) VALUES ($1,$2,$3,$4)`,
        [iid, id, ing.foodId, ing.quantityG]
      )
    }
    await upsertRecipeFood(pool, id, name, userId)
    return NextResponse.json({ id, name })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
