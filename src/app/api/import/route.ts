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
type WeekParam    = { sets: string; reps: string; rec: string }
type PlanExercise = {
  name: string
  noteScheda?: string; notePersonali?: string
  weekParams?: WeekParam[]
}
type PlanSection  = { name: string; focus: string; weeks?: string[]; exercises: PlanExercise[] }
type PlanData     = { planName: string; startDate?: string | null; endDate?: string | null; sections: PlanSection[] }

function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null
  const m = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return d
}

function parseRest(rec: string): number {
  if (!rec) return 90
  const ms = rec.match(/^(\d+)'(?:(\d+)''?)?$/)
  if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2] || '0')
  const s = rec.match(/^(\d+)''$/)
  if (s) return parseInt(s[1])
  const n = parseInt(rec)
  return isNaN(n) ? 90 : n
}

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

    // Ensure WorkoutWeek + WorkoutWeekParam tables exist
    await pool.query(`CREATE TABLE IF NOT EXISTS "WorkoutWeek" (
      id TEXT PRIMARY KEY, "templateId" TEXT NOT NULL, name TEXT NOT NULL,
      "order" INTEGER DEFAULT 0, "createdAt" TIMESTAMP DEFAULT NOW()
    )`)
    await pool.query(`CREATE TABLE IF NOT EXISTS "WorkoutWeekParam" (
      id TEXT PRIMARY KEY, "weekId" TEXT NOT NULL, "templateExId" TEXT NOT NULL,
      sets INTEGER DEFAULT 3, reps TEXT, "restSeconds" INTEGER DEFAULT 90,
      notes TEXT, "suggestedWeight" FLOAT, UNIQUE("weekId","templateExId")
    )`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "startDate" TEXT`)
    await pool.query(`ALTER TABLE "WorkoutPlan" ADD COLUMN IF NOT EXISTS "endDate" TEXT`)

    try {
      // 1. Crea WorkoutPlan
      const planRes = await pool.query(
        `INSERT INTO "WorkoutPlan" (id, name, "userId", "startDate", "endDate", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, now()) RETURNING id`,
        [data.planName, userId, normalizeDate(data.startDate), normalizeDate(data.endDate)]
      )
      const planId = planRes.rows[0].id

      let templateOrder = 0
      for (const section of data.sections) {
        // 2. Crea WorkoutTemplate (una per sezione/scheda)
        const tmplRes = await pool.query(
          `INSERT INTO "WorkoutTemplate" (id, "planId", name, "userId", "order", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING id`,
          [planId, `${section.name}${section.focus ? ` — ${section.focus}` : ''}`, userId, templateOrder++]
        )
        const templateId = tmplRes.rows[0].id
        const templateExIds: string[] = []

        for (let i = 0; i < section.exercises.length; i++) {
          const ex = section.exercises[i]
          if (!ex.name?.trim()) { templateExIds.push(''); continue }

          // 3. Cerca o crea Exercise
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
              [ex.name.trim(), section.focus || 'Vari', null, ex.noteScheda?.trim() || null, userId]
            )
            exId = newEx.rows[0].id
          }

          // 4. Crea WorkoutTemplateExercise con parametri week 1 come default
          const wp0     = ex.weekParams?.[0]
          const defSets = Number(wp0?.sets) || 3
          const defReps = wp0?.reps || null
          const defRest = parseRest(wp0?.rec || '')
          const noteScheda = ex.noteScheda?.trim() || null

          const { rows: texRows } = await pool.query(
            `INSERT INTO "WorkoutTemplateExercise"
               (id, "templateId", "exerciseId", sets, reps, "restSeconds", "noteScheda", "notePersonali", "order")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [templateId, exId, defSets, defReps, defRest, noteScheda, null, i]
          )
          templateExIds.push(texRows[0].id)
          imported++
        }

        // 5. Crea WorkoutWeek + WorkoutWeekParam
        if (section.weeks?.length) {
          for (let wi = 0; wi < section.weeks.length; wi++) {
            const { rows: wkRows } = await pool.query(
              `INSERT INTO "WorkoutWeek" (id,"templateId",name,"order","createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING id`,
              [`ww-${Date.now()}-${wi}`, templateId, section.weeks[wi], wi]
            )
            const weekId = wkRows[0].id

            for (let ei = 0; ei < section.exercises.length; ei++) {
              const wp = section.exercises[ei].weekParams?.[wi]
              if (!wp || !templateExIds[ei] || (!wp.sets && !wp.reps)) continue
              await pool.query(
                `INSERT INTO "WorkoutWeekParam" (id,"weekId","templateExId",sets,reps,"restSeconds",notes,"suggestedWeight")
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                 ON CONFLICT ("weekId","templateExId") DO UPDATE SET
                   sets=EXCLUDED.sets, reps=EXCLUDED.reps, "restSeconds"=EXCLUDED."restSeconds"`,
                [`wwp-${Date.now()}-${wi}-${ei}`, weekId, templateExIds[ei],
                 Number(wp.sets) || 3, wp.reps || null, parseRest(wp.rec), null, null]
              )
            }
          }
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
