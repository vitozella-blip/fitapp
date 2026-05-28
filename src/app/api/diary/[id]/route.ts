import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "FoodDiaryEntry" WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { quantity } = await req.json()
    if (!quantity || quantity <= 0) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    await pool.query(`UPDATE "FoodDiaryEntry" SET quantity = $1 WHERE id = $2`, [quantity, id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}