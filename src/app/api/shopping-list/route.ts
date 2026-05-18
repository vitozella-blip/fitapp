import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

let schemaReady = false
async function ensureSchema() {
  if (schemaReady) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ShoppingListItem" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "foodId" TEXT,
      name TEXT NOT NULL,
      quantity TEXT,
      checked BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  schemaReady = true
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  await ensureSchema()
  const { rows } = await pool.query(
    `SELECT * FROM "ShoppingListItem" WHERE "userId"=$1 ORDER BY checked ASC, "createdAt" DESC`,
    [userId]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const { userId, name, foodId, quantity } = await req.json()
  const id = `sl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const { rows } = await pool.query(
    `INSERT INTO "ShoppingListItem" (id, "userId", "foodId", name, quantity, checked)
     VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
    [id, userId, foodId || null, name, quantity || null]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') ?? ''
  await ensureSchema()
  await pool.query(
    `DELETE FROM "ShoppingListItem" WHERE "userId"=$1 AND checked=true`,
    [userId]
  )
  return NextResponse.json({ ok: true })
}
