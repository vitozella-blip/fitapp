import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await pool.query(`DELETE FROM "RecipeIngredient" WHERE "recipeId"=$1`, [id])
    await pool.query(`DELETE FROM "Recipe" WHERE id=$1`, [id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
