import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

let schemaReady = false
async function ensureSchema() {
  if (schemaReady) return
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "FoodCategory" (
        "foodId" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        PRIMARY KEY ("foodId", "categoryId")
      )
    `)
    await pool.query(`
      INSERT INTO "FoodCategory" ("foodId", "categoryId")
      SELECT id, "categoryId" FROM "Food"
      WHERE "categoryId" IS NOT NULL
      ON CONFLICT DO NOTHING
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "FoodFavorite" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "foodId" TEXT NOT NULL,
        UNIQUE ("userId", "foodId")
      )
    `)
    schemaReady = true
  } catch (e) { console.error('ensureSchema error:', e) }
}

export async function GET(req: NextRequest) {
  const q          = req.nextUrl.searchParams.get('q') ?? ''
  const userId     = req.nextUrl.searchParams.get('userId') ?? ''
  const categoryId = req.nextUrl.searchParams.get('categoryId')
  const favOnly    = req.nextUrl.searchParams.get('fav') === '1'

  await ensureSchema()

  let query = `SELECT f.*,
    COALESCE((
      SELECT array_agg(fc."categoryId")
      FROM "FoodCategory" fc WHERE fc."foodId" = f.id
    ), ARRAY[]::text[]) AS "categoryIds"
    FROM "Food" f`
  const params: unknown[] = []
  let idx = 1

  if (favOnly) {
    query += ` INNER JOIN "FoodFavorite" ff ON ff."foodId"=f.id AND ff."userId"=$${idx++}`
    params.push(userId)
  }

  query += ` WHERE (LOWER(f.name) LIKE LOWER($${idx++}) OR LOWER(COALESCE(f.brand,'')) LIKE LOWER($${idx++}))`
  params.push(`%${q}%`, `%${q}%`)

  query += ` AND (f."userId" IS NULL OR f."userId"=$${idx++})`
  params.push(userId)

  if (categoryId) {
    const ids = categoryId.split(',').filter(Boolean)
    if (ids.length > 0) {
      query += ` AND EXISTS (
        SELECT 1 FROM "FoodCategory" fc2
        WHERE fc2."foodId" = f.id AND fc2."categoryId" = ANY($${idx++}::text[])
      )`
      params.push(ids)
    }
  }

  const limit  = parseInt(req.nextUrl.searchParams.get('limit')  ?? '100')
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')
  query += ` ORDER BY f.name LIMIT $${idx++} OFFSET $${idx++}`
  params.push(limit, offset)

  try {
    const { rows } = await pool.query(query, params)
    return NextResponse.json(rows)
  } catch (e) {
    console.error('GET /api/food error:', e)
    // FoodCategory table may not exist yet — fall back to simple query without categoryIds
    const fallback = `SELECT f.*, ARRAY[]::text[] AS "categoryIds" FROM "Food" f
      WHERE (LOWER(f.name) LIKE LOWER($1) OR LOWER(COALESCE(f.brand,'')) LIKE LOWER($1))
        AND (f."userId" IS NULL OR f."userId"=$2)
      ORDER BY f.name LIMIT $3 OFFSET $4`
    const { rows } = await pool.query(fallback, [`%${q}%`, userId, limit, offset])
    return NextResponse.json(rows)
  }
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const { name, brand, calories, protein, carbs, fat, saturatedFat, sugars, salt, userId, categoryIds } = await req.json()
  const id = (name + (brand ? `-${brand}` : '') + '-' + Date.now()).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { rows } = await pool.query(
    `INSERT INTO "Food" (id, name, brand, calories, protein, carbs, fat, "saturatedFat", sugars, salt, "per100g", "userId")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11) RETURNING *`,
    [id, name, brand || null, calories, protein, carbs, fat, saturatedFat || 0, sugars || 0, salt || 0, userId || null]
  )
  const ids: string[] = Array.isArray(categoryIds) ? categoryIds : []
  for (const catId of ids) {
    await pool.query(`INSERT INTO "FoodCategory" ("foodId","categoryId") VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, catId])
  }
  return NextResponse.json({ ...rows[0], categoryIds: ids })
}
