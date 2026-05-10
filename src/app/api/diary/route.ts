import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  if (!userId || !date) return NextResponse.json([])
  try {
    const { rows } = await pool.query(
      `SELECT e.*, row_to_json(f) as food FROM "FoodDiaryEntry" e JOIN "Food" f ON e."foodId" = f.id WHERE e."userId" = $1 AND e.date = $2 ORDER BY e."createdAt"`,
      [userId, date]
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, meal, foodId, quantity } = await req.json()
  try {
    await pool.query(
      `INSERT INTO "User" (id, name, "targetCalories", "targetProtein", "targetCarbs", "targetFat", goal, "createdAt") VALUES ($1,'Utente',2000,150,220,65,'maintain',NOW()) ON CONFLICT (id) DO NOTHING`,
      [userId]
    )
    const id = crypto.randomUUID()
    const { rows } = await pool.query(
      `INSERT INTO "FoodDiaryEntry" (id, "userId", date, meal, "foodId", quantity, "createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [id, userId, date, meal, foodId, quantity]
    )
    const { rows: foods } = await pool.query(`SELECT * FROM "Food" WHERE id = $1`, [foodId])
    return NextResponse.json({ ...rows[0], food: foods[0] })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}