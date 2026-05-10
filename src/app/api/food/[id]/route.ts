import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await pool.query(`DELETE FROM "Food" WHERE id = $1`, [params.id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
