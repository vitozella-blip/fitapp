import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId, name } = await req.json()
  try {
    await pool.query(
      `INSERT INTO "User" (id, name, "targetCalories", "targetProtein", "targetCarbs", "targetFat", goal, "createdAt") VALUES ($1,$2,2000,150,220,65,'maintain',NOW()) ON CONFLICT (id) DO NOTHING`,
      [userId, name ?? 'Utente']
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
