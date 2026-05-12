import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, brand, calories, protein, carbs, fat, saturatedFat, sugars, salt, categoryId } = await req.json()
  const { rows } = await pool.query(
    `UPDATE "Food" SET name=$1, brand=$2, calories=$3, protein=$4, carbs=$5, fat=$6,
     "saturatedFat"=$7, sugars=$8, salt=$9, "categoryId"=$10 WHERE id=$11 RETURNING *`,
    [name, brand || null, calories, protein, carbs, fat, saturatedFat || 0, sugars || 0, salt || 0, categoryId || null, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await pool.query(`DELETE FROM "FoodFavorite" WHERE "foodId"=$1`, [id])
  await pool.query(`DELETE FROM "Food" WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
