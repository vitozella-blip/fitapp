import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "Food" WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}