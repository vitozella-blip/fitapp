import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

type FoodRow = {
  name: string
  brand?: string
  calories: string | number
  protein?: string | number
  carbs?: string | number
  fat?: string | number
  per100g?: string | boolean
}

type ExerciseRow = {
  name: string
  muscleGroup?: string
  equipment?: string
  instructions?: string
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, userId, data } = body as {
    type: 'food' | 'exercise'
    userId: string
    data: FoodRow[] | ExerciseRow[]
  }

  if (!type || !userId || !Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  let imported = 0
  const errorDetails: { row: number; error: string }[] = []

  if (type === 'food') {
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as FoodRow
      const name = String(row.name ?? '').trim()
      const calories = Number(row.calories)
      if (!name || isNaN(calories)) {
        errorDetails.push({ row: i + 1, error: 'Nome e calorie obbligatori' })
        continue
      }
      const protein = Number(row.protein ?? 0) || 0
      const carbs   = Number(row.carbs   ?? 0) || 0
      const fat     = Number(row.fat     ?? 0) || 0
      const brand   = row.brand ? String(row.brand).trim() || null : null
      const per100g = row.per100g == null ? true
        : typeof row.per100g === 'boolean' ? row.per100g
        : !['false', '0', 'no'].includes(String(row.per100g).toLowerCase())
      try {
        await pool.query(
          `INSERT INTO "Food" (id, name, brand, calories, protein, carbs, fat, "per100g", "userId")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
          [name, brand, calories, protein, carbs, fat, per100g, userId]
        )
        imported++
      } catch (e) {
        errorDetails.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) })
      }
    }
  } else if (type === 'exercise') {
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as ExerciseRow
      const name = String(row.name ?? '').trim()
      if (!name) {
        errorDetails.push({ row: i + 1, error: 'Nome obbligatorio' })
        continue
      }
      const muscleGroup  = row.muscleGroup  ? String(row.muscleGroup).trim()  : 'Altro'
      const equipment    = row.equipment    ? String(row.equipment).trim()    : null
      const instructions = row.instructions ? String(row.instructions).trim() : null
      try {
        await pool.query(
          `INSERT INTO "Exercise" (id, name, "muscleGroup", equipment, instructions, "userId")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
          [name, muscleGroup, equipment, instructions, userId]
        )
        imported++
      } catch (e) {
        errorDetails.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) })
      }
    }
  } else {
    return NextResponse.json({ error: 'Tipo non supportato' }, { status: 400 })
  }

  return NextResponse.json({ imported, errors: errorDetails.length, errorDetails })
}
