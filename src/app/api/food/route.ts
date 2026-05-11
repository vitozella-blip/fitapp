import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  const categoryId = req.nextUrl.searchParams.get('categoryId')
  const favOnly = req.nextUrl.searchParams.get('fav') === '1'

  let query = `SELECT f.* FROM "Food" f`
  const params: (string | boolean)[] = []
  let idx = 1

  if (favOnly) {
    query += ` INNER JOIN "FoodFavorite" ff ON ff."foodId"=f.id AND ff."userId"=$${idx++}`
    params.push(userId)
  }

  query += ` WHERE (LOWER(f.name) LIKE LOWER($${idx++}))`
  params.push(`%${q}%`)

  query += ` AND (f."userId" IS NULL OR f."userId"=$${idx++})`
  params.push(userId)

  if (categoryId) {
    query += ` AND f."categoryId"=$${idx++}`
    params.push(categoryId)
  }

  query += ` ORDER BY f.name LIMIT 50`

  const { rows } = await pool.query(query, params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { name, calories, protein, carbs, fat, userId, categoryId } = await req.json()
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
  const { rows } = await pool.query(
    `INSERT INTO "Food" (id, name, calories, protein, carbs, fat, "per100g", "userId", "categoryId") VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8) RETURNING *`,
    [id, name, calories, protein, carbs, fat, userId || null, categoryId || null]
  )
  return NextResponse.json(rows[0])
}
