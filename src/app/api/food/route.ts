import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  try {
    const { rows } = await pool.query(
      `SELECT * FROM "Food" WHERE LOWER(name) LIKE LOWER($1) AND ("userId" IS NULL OR "userId" = $2) ORDER BY name LIMIT 20`,
      [`%${q}%`, userId]
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { name, calories, protein, carbs, fat, userId } = await req.json()
  try {
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
    const { rows } = await pool.query(
      `INSERT INTO "Food" (id, name, calories, protein, carbs, fat, "per100g", "userId") VALUES ($1,$2,$3,$4,$5,$6,true,$7) RETURNING *`,
      [id, name, calories, protein, carbs, fat, userId || null]
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
