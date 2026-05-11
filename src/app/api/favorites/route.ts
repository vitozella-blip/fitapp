import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  const { rows } = await pool.query(
    `SELECT "foodId" FROM "FoodFavorite" WHERE "userId"=$1`, [userId]
  )
  return NextResponse.json(rows.map((r: { foodId: string }) => r.foodId))
}

export async function POST(req: NextRequest) {
  const { userId, foodId } = await req.json()
  const { rows: existing } = await pool.query(
    `SELECT id FROM "FoodFavorite" WHERE "userId"=$1 AND "foodId"=$2`, [userId, foodId]
  )
  if (existing.length > 0) {
    await pool.query(`DELETE FROM "FoodFavorite" WHERE "userId"=$1 AND "foodId"=$2`, [userId, foodId])
    return NextResponse.json({ favorite: false })
  }
  await pool.query(
    `INSERT INTO "FoodFavorite" (id, "userId", "foodId") VALUES ($1,$2,$3)`,
    [`fav-${Date.now()}`, userId, foodId]
  )
  return NextResponse.json({ favorite: true })
}
