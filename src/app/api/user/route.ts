import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId, name } = await req.json()
  try {
    const { rows } = await pool.query(
      `INSERT INTO "User" (id, name, "targetCalories", "targetProtein", "targetCarbs", "targetFat", goal, "createdAt")
       VALUES ($1,$2,2000,150,220,65,'maintain',NOW())
       ON CONFLICT (id) DO UPDATE SET name=$2 RETURNING *`,
      [userId, name ?? 'Utente']
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json(null)
  try {
    const { rows } = await pool.query(`SELECT * FROM "User" WHERE id=$1`, [userId])
    return NextResponse.json(rows[0] ?? null)
  } catch (e) {
    return NextResponse.json(null)
  }
}
