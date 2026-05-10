import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  try {
    const { rows } = await pool.query(
      `SELECT * FROM "Exercise" WHERE LOWER(name) LIKE LOWER($1) AND ("userId" IS NULL OR "userId" = $2) ORDER BY name LIMIT 20`,
      [`%${q}%`, userId]
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const { name, muscleGroup, equipment, userId } = await req.json()
  try {
    const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    const { rows } = await pool.query(
      `INSERT INTO "Exercise" (id, name, "muscleGroup", equipment, "userId") VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, name, muscleGroup, equipment || null, userId || null]
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
