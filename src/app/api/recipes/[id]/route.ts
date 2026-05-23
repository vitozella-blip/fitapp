import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function upsertRecipeFood(recipeId: string) {
  const { rows: meta } = await pool.query(`SELECT name, "userId" FROM "Recipe" WHERE id=$1`, [recipeId])
  if (!meta[0]) return
  const { name, userId } = meta[0]
  const { rows } = await pool.query(`
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
  await pool.query(`
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { servings, ingredients } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    if (servings != null) {
      await pool.query(`UPDATE "Recipe" SET servings=$1 WHERE id=$2`, [Math.max(1, Number(servings) || 1), id])
    }
    await pool.query(`DELETE FROM "RecipeIngredient" WHERE "recipeId"=$1`, [id])
    for (const ing of (ingredients ?? [])) {
      const iid = `ri-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await pool.query(
        `INSERT INTO "RecipeIngredient" (id, "recipeId", "foodId", quantity) VALUES ($1,$2,$3,$4)`,
        [iid, id, ing.foodId, ing.quantityG]
      )
    }
    await upsertRecipeFood(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await pool.query(`DELETE FROM "RecipeIngredient" WHERE "recipeId"=$1`, [id])
    await pool.query(`DELETE FROM "Recipe" WHERE id=$1`, [id])
    await pool.query(`DELETE FROM "Food" WHERE id=$1`, [`food-recipe-${id}`])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
