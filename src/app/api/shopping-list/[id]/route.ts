import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1
  if ('checked'  in body) { fields.push(`checked=$${idx++}`);  values.push(body.checked) }
  if ('quantity' in body) { fields.push(`quantity=$${idx++}`); values.push(body.quantity || null) }
  if (fields.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  values.push(id)
  try {
    const { rows } = await pool.query(
      `UPDATE "ShoppingListItem" SET ${fields.join(', ')} WHERE id=$${idx} RETURNING *`,
      values
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await pool.query(`DELETE FROM "ShoppingListItem" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
