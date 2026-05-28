import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.name, f.brand, f.calories, f.protein, f.carbs, f.fat
       FROM (
         SELECT DISTINCT ON (e."foodId")
           e."foodId", e."createdAt"
         FROM "FoodDiaryEntry" e
         WHERE e."userId" = $1
         ORDER BY e."foodId", e."createdAt" DESC
       ) sub
       JOIN "Food" f ON f.id = sub."foodId"
       ORDER BY sub."createdAt" DESC
       LIMIT 10`,
      [userId]
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}
