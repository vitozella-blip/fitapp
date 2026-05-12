import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  const categoryId = req.nextUrl.searchParams.get('categoryId')
  const favOnly = req.nextUrl.searchParams.get('fav') === '1'

  let query = `SELECT f.* FROM "Food" f`
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

  if (categoryId) { query += ` AND f."categoryId"=$${idx++}`; params.push(categoryId) }

  query += ` ORDER BY f.name LIMIT 50`
  const { rows } = await pool.query(query, params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { name, brand, calories, protein, carbs, fat, saturatedFat, sugars, salt, userId, categoryId } = await req.json()
  const id = (name + (brand ? `-${brand}` : '') + '-' + Date.now()).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { rows } = await pool.query(
    `INSERT INTO "Food" (id, name, brand, calories, protein, carbs, fat, "saturatedFat", sugars, salt, "per100g", "userId", "categoryId")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12) RETURNING *`,
    [id, name, brand || null, calories, protein, carbs, fat, saturatedFat || 0, sugars || 0, salt || 0, userId || null, categoryId || null]
  )
  return NextResponse.json(rows[0])
}
