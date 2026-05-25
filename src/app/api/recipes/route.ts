import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function upsertRecipeFood(db: typeof pool, recipeId: string, name: string, userId: string) {
  const { rows } = await db.query(`
    SELECT ri.quantity, ri.unit, f.calories, f.protein, f.carbs, f.fat
    FROM "RecipeIngredient" ri
    LEFT JOIN "Food" f ON f.id = ri."foodId"
    WHERE ri."recipeId" = $1
  `, [recipeId])
  // total weight: g/ml ingredients with a quantity (ml ≈ g for food density)
  const totalW = rows
    .filter((r: any) => r.unit !== 'pz' && r.quantity != null)
    .reduce((s: number, r: any) => s + Number(r.quantity), 0)
  if (totalW <= 0) return
  // macros: only DB foods (f.calories not null)
  const macro = rows.filter((r: any) => r.calories != null && r.unit !== 'pz' && r.quantity != null)
  const cal  = macro.reduce((s: number, r: any) => s + r.calories * r.quantity / 100, 0)
  const pro  = macro.reduce((s: number, r: any) => s + r.protein  * r.quantity / 100, 0)
  const carb = macro.reduce((s: number, r: any) => s + r.carbs    * r.quantity / 100, 0)
  const fat  = macro.reduce((s: number, r: any) => s + r.fat      * r.quantity / 100, 0)
  await db.query(`
    INSERT INTO "Food" (id, name, brand, "userId", calories, protein, carbs, fat, "saturatedFat", sugars, salt, "per100g")
    VALUES ($1,$2,'Ricetta',$3,$4,$5,$6,$7,0,0,0,true)
    ON CONFLICT (id) DO UPDATE SET
      name=EXCLUDED.name, calories=EXCLUDED.calories, protein=EXCLUDED.protein,
      carbs=EXCLUDED.carbs, fat=EXCLUDED.fat
  `, [
    `food-recipe-${recipeId}`, name, userId,
    Math.round(cal / totalW * 100),
    Math.round(pro  / totalW * 1000) / 10,
    Math.round(carb / totalW * 1000) / 10,
    Math.round(fat  / totalW * 1000) / 10,
  ])
}

async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS "Recipe" (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    "userId" TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
  )`)
  await pool.query(`ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS servings INT DEFAULT 1`)
  // foodId and quantity are nullable to support free-text ingredients
  await pool.query(`CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
    id TEXT PRIMARY KEY, "recipeId" TEXT NOT NULL,
    "foodId" TEXT, quantity FLOAT, name TEXT, unit TEXT DEFAULT 'g'
  )`)
  // Migrate existing tables (safe to re-run)
  try { await pool.query(`ALTER TABLE "RecipeIngredient" ALTER COLUMN "foodId" DROP NOT NULL`) } catch { /* already nullable */ }
  try { await pool.query(`ALTER TABLE "RecipeIngredient" ALTER COLUMN quantity  DROP NOT NULL`) } catch { /* already nullable */ }
  await pool.query(`ALTER TABLE "RecipeIngredient" ADD COLUMN IF NOT EXISTS name TEXT`)
  await pool.query(`ALTER TABLE "RecipeIngredient" ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'g'`)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    await ensureSchema()
    const { rows } = await pool.query(`
      SELECT r.id, r.name, r."createdAt", COALESCE(r.servings, 1) as servings,
        COALESCE(json_agg(json_build_object(
          'foodId',   ri."foodId",
          'foodName', COALESCE(f.name, ri.name, ''),
          'brand',    f.brand,
          'qty',      ri.quantity,
          'unit',     COALESCE(ri.unit, 'g'),
          'calories', COALESCE(f.calories, 0),
          'protein',  COALESCE(f.protein,  0),
          'carbs',    COALESCE(f.carbs,    0),
          'fat',      COALESCE(f.fat,      0)
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
        `INSERT INTO "RecipeIngredient" (id, "recipeId", "foodId", quantity, name, unit) VALUES ($1,$2,$3,$4,$5,$6)`,
        [iid, id, ing.foodId ?? null, ing.qty ?? null, ing.name ?? null, ing.unit ?? 'g']
      )
    }
    await upsertRecipeFood(pool, id, name, userId)
    return NextResponse.json({ id, name })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
