import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────────────

type FoodRow = {
  name?: unknown; brand?: unknown; calories?: unknown
  protein?: unknown; carbs?: unknown; fat?: unknown
  saturatedFat?: unknown; sugars?: unknown; salt?: unknown; per100g?: unknown
}
type ExerciseRow = {
  name?: unknown; muscleGroup?: unknown; equipment?: unknown; instructions?: unknown
}
type PlanExercise = { name: string; noteOp: string; noteEx: string; sets: string; reps: string; rec: string }
type PlanSection  = { name: string; focus: string; exercises: PlanExercise[] }
type PlanData     = { planName: string; sections: PlanSection[] }

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, userId } = body as { type: string; userId: string }

  if (!type || !userId) return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })

  let imported = 0
  const errorDetails: { row: number; error: string }[] = []

  // ── Alimenti ────────────────────────────────────────────────────────────────
  if (type === 'food') {
    const data = body.data as FoodRow[]
    if (!Array.isArray(data) || data.length === 0)
      return NextResponse.json({ error: 'Nessun dato' }, { status: 400 })

    // Ensure optional columns and unique constraint exist (idempotent)
    await pool.query(`
      ALTER TABLE "Food"
        ADD COLUMN IF NOT EXISTS "saturatedFat" FLOAT,
        ADD COLUMN IF NOT EXISTS "sugars" FLOAT,
        ADD COLUMN IF NOT EXISTS "salt" FLOAT
    `)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Food_name_brand_key"
      ON "Food" (LOWER(name), LOWER(COALESCE(brand, '')))
    `)

    const sorted = [...data].sort((a, b) => {
      const nameA = String(a.name ?? '').trim().toLowerCase()
      const nameB = String(b.name ?? '').trim().toLowerCase()
      if (nameA !== nameB) return nameA.localeCompare(nameB, 'it')
      const brandA = String(a.brand ?? '').trim().toLowerCase() || 'generico'
      const brandB = String(b.brand ?? '').trim().toLowerCase() || 'generico'
      return brandA.localeCompare(brandB, 'it')
    })

    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i]
      const name     = String(row.name ?? '').trim()
      const calories = Number(row.calories)
      if (!name || isNaN(calories)) {
        errorDetails.push({ row: i + 1, error: 'Nome e calorie obbligatori' }); continue
      }
      const protein      = Number(row.protein      ?? 0) || 0
      const carbs        = Number(row.carbs        ?? 0) || 0
      const fat          = Number(row.fat          ?? 0) || 0
      const saturatedFat = row.saturatedFat != null && String(row.saturatedFat).trim() !== '' ? Number(row.saturatedFat) : null
      const sugars       = row.sugars       != null && String(row.sugars).trim()       !== '' ? Number(row.sugars)       : null
      const salt         = row.salt         != null && String(row.salt).trim()         !== '' ? Number(row.salt)         : null
      const brand        = String(row.brand ?? '').trim() || 'Generico'
      const per100g      = row.per100g == null ? true
        : typeof row.per100g === 'boolean' ? row.per100g
        : !['false', '0', 'no'].includes(String(row.per100g).toLowerCase())
      try {
        await pool.query(
          `INSERT INTO "Food" (id, name, brand, calories, protein, carbs, fat, "saturatedFat", "sugars", "salt", "per100g", "userId")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (LOWER(name), LOWER(COALESCE(brand, '')))
           DO UPDATE SET
             calories=EXCLUDED.calories, protein=EXCLUDED.protein, carbs=EXCLUDED.carbs, fat=EXCLUDED.fat,
             "saturatedFat"=EXCLUDED."saturatedFat", "sugars"=EXCLUDED."sugars", "salt"=EXCLUDED."salt",
             "per100g"=EXCLUDED."per100g", "userId"=EXCLUDED."userId"`,
          [name, brand, calories, protein, carbs, fat, saturatedFat, sugars, salt, per100g, userId]
        )
        imported++
      } catch (e) {
        errorDetails.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) })
      }
    }

  // ── Esercizi ────────────────────────────────────────────────────────────────
  } else if (type === 'exercise') {
    const data = body.data as ExerciseRow[]
    if (!Array.isArray(data) || data.length === 0)
      return NextResponse.json({ error: 'Nessun dato' }, { status: 400 })

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const name = String(row.name ?? '').trim()
      if (!name) { errorDetails.push({ row: i + 1, error: 'Nome obbligatorio' }); continue }
      try {
        await pool.query(
          `INSERT INTO "Exercise" (id, name, "muscleGroup", equipment, instructions, "userId")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
          [name, String(row.muscleGroup ?? 'Altro').trim() || 'Altro',
           row.equipment    ? String(row.equipment).trim()    : null,
           row.instructions ? String(row.instructions).trim() : null,
           userId]
        )
        imported++
      } catch (e) {
        errorDetails.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) })
      }
    }

  // ── Piano Allenamento ───────────────────────────────────────────────────────
  } else if (type === 'plan') {
    const data = body.data as PlanData
    if (!data?.sections?.length)
      return NextResponse.json({ error: 'Nessuna sezione nel piano' }, { status: 400 })

    try {
      // 1. Crea WorkoutPlan
      const planRes = await pool.query(
        `INSERT INTO "WorkoutPlan" (id, name, "userId", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, now()) RETURNING id`,
        [data.planName, userId]
      )
      const planId = planRes.rows[0].id

      for (const section of data.sections) {
        // 2. Crea WorkoutPlanDay
        const dayRes = await pool.query(
          `INSERT INTO "WorkoutPlanDay" (id, "dayName", "planId")
           VALUES (gen_random_uuid(), $1, $2) RETURNING id`,
          [`${section.name}${section.focus ? ` — ${section.focus}` : ''}`, planId]
        )
        const dayId = dayRes.rows[0].id

        for (let i = 0; i < section.exercises.length; i++) {
          const ex = section.exercises[i]
          if (!ex.name?.trim()) continue

          // 3. Cerca o crea l'esercizio nel DB
          const existing = await pool.query(
            `SELECT id FROM "Exercise" WHERE LOWER(name) = LOWER($1) LIMIT 1`,
            [ex.name.trim()]
          )
          let exId: string
          if (existing.rows.length > 0) {
            exId = existing.rows[0].id
          } else {
            const newEx = await pool.query(
              `INSERT INTO "Exercise" (id, name, "muscleGroup", equipment, instructions, "userId")
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING id`,
              [ex.name.trim(), section.focus || 'Vari', null,
               ex.noteEx?.trim() || null, userId]
            )
            exId = newEx.rows[0].id
          }

          // 4. Crea WorkoutPlanExercise
          const notes = [ex.noteOp, ex.noteEx].filter(Boolean).join(' | ') || null
          await pool.query(
            `INSERT INTO "WorkoutPlanExercise" (id, sets, reps, weight, notes, "order", "dayId", "exerciseId")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
            [Number(ex.sets) || 3, ex.reps || null, null, notes, i, dayId, exId]
          )
          imported++
        }
      }
    } catch (e) {
      errorDetails.push({ row: 0, error: e instanceof Error ? e.message : String(e) })
    }

  } else {
    return NextResponse.json({ error: 'Tipo non supportato' }, { status: 400 })
  }

  return NextResponse.json({ imported, errors: errorDetails.length, errorDetails })
}
