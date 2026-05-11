import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name } = await req.json()
  const { rows } = await pool.query(
    `UPDATE "FoodCategory" SET name=$1 WHERE id=$2 RETURNING *`, [name, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await pool.query(`UPDATE "Food" SET "categoryId"=NULL WHERE "categoryId"=$1`, [id])
  await pool.query(`DELETE FROM "FoodCategory" WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
