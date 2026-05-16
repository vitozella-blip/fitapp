import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
  }
  const normalized = email.trim().toLowerCase()
  try {
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT`)
    try {
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email")`)
    } catch { /* index already exists */ }

    const { rows: existing } = await pool.query(
      `SELECT * FROM "User" WHERE email = $1`, [normalized]
    )
    if (existing[0]) return NextResponse.json(existing[0])

    const id = crypto.randomUUID()
    const name = normalized.split('@')[0]
    const { rows } = await pool.query(
      `INSERT INTO "User" (id, name, email, "targetCalories", "targetProtein", "targetCarbs", "targetFat", goal, "createdAt")
       VALUES ($1,$2,$3,2000,150,220,65,'maintain',NOW()) RETURNING *`,
      [id, name, normalized]
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
