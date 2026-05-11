import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json([])
  const { rows } = await pool.query(
    `SELECT * FROM "FoodCategory" WHERE "userId" = $1 ORDER BY name`, [userId]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { userId, name } = await req.json()
  const id = `cat-${Date.now()}`
  const { rows } = await pool.query(
    `INSERT INTO "FoodCategory" (id, name, "userId") VALUES ($1,$2,$3) RETURNING *`,
    [id, name, userId]
  )
  return NextResponse.json(rows[0])
}
