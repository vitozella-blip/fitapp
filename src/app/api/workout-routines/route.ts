import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS "WorkoutWeek" (
    id TEXT PRIMARY KEY, "templateId" TEXT NOT NULL, name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0, "createdAt" TIMESTAMP DEFAULT NOW()
  )`)
  await pool.query(`CREATE TABLE IF NOT EXISTS "WorkoutWeekParam" (
    id TEXT PRIMARY KEY, "weekId" TEXT NOT NULL, "templateExId" TEXT NOT NULL,
    sets INTEGER DEFAULT 3, reps TEXT, "restSeconds" INTEGER DEFAULT 90,
    notes TEXT, "suggestedWeight" FLOAT, UNIQUE("weekId", "templateExId")
  )`)
}

export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get('templateId')
  if (!templateId) return NextResponse.json([])
  try {
    await ensureSchema()
    const { rows } = await pool.query(`
      SELECT
        ww.id, ww.name, ww."order",
        COALESCE(
          json_agg(
            json_build_object(
              'templateExId', wwp."templateExId",
              'exerciseName', e.name,
              'sets', COALESCE(wwp.sets, 3),
              'reps', COALESCE(wwp.reps, ''),
              'restSeconds', COALESCE(wwp."restSeconds", 90),
              'noteScheda', COALESCE(wte."noteScheda", ''),
              'notePersonali', COALESCE(wte."notePersonali", '')
            ) ORDER BY wte."order"
          ) FILTER (WHERE wwp."templateExId" IS NOT NULL),
          '[]'::json
        ) as exercises
      FROM "WorkoutWeek" ww
      LEFT JOIN "WorkoutWeekParam" wwp ON wwp."weekId" = ww.id
      LEFT JOIN "WorkoutTemplateExercise" wte ON wte.id = wwp."templateExId"
      LEFT JOIN "Exercise" e ON e.id = wte."exerciseId"
      WHERE ww."templateId" = $1
      GROUP BY ww.id, ww.name, ww."order"
      ORDER BY ww."order"
    `, [templateId])
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

async function findOrCreateExercise(name: string, userId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM "Exercise" WHERE LOWER(name) = LOWER($1) LIMIT 1`, [name.trim()]
  )
  if (rows.length > 0) return rows[0].id
  const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await pool.query(
    `INSERT INTO "Exercise" (id, name, "muscleGroup", "userId") VALUES ($1, $2, $3, $4)`,
    [id, name.trim(), '', userId]
  )
  return id
}

async function findOrCreateTemplateExercise(
  templateId: string, exerciseId: string, noteScheda: string, notePersonali: string
): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM "WorkoutTemplateExercise" WHERE "templateId"=$1 AND "exerciseId"=$2 LIMIT 1`,
    [templateId, exerciseId]
  )
  if (rows.length > 0) {
    await pool.query(
      `UPDATE "WorkoutTemplateExercise" SET "noteScheda"=$1, "notePersonali"=$2 WHERE id=$3`,
      [noteScheda || null, notePersonali || null, rows[0].id]
    )
    return rows[0].id
  }
  const { rows: mx } = await pool.query(
    `SELECT COALESCE(MAX("order"), 0) + 1 as next FROM "WorkoutTemplateExercise" WHERE "templateId"=$1`,
    [templateId]
  )
  const id = `wte-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await pool.query(
    `INSERT INTO "WorkoutTemplateExercise"
     (id, "templateId", "exerciseId", "order", sets, reps, "restSeconds", "noteScheda", "notePersonali", "createdAt")
     VALUES ($1, $2, $3, $4, 3, '10', 90, $5, $6, NOW())`,
    [id, templateId, exerciseId, mx[0].next, noteScheda || null, notePersonali || null]
  )
  return id
}

export async function POST(req: NextRequest) {
  const { templateId, userId, name, exercises } = await req.json()
  if (!templateId || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  try {
    await ensureSchema()
    const { rows: mx } = await pool.query(
      `SELECT COALESCE(MAX("order"), 0) + 1 as next FROM "WorkoutWeek" WHERE "templateId"=$1`, [templateId]
    )
    const weekId = `ww-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutWeek" (id, "templateId", name, "order", "createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [weekId, templateId, name, mx[0].next]
    )
    for (const ex of (exercises ?? [])) {
      if (!ex.name?.trim()) continue
      const exerciseId = await findOrCreateExercise(ex.name, userId)
      const templateExId = await findOrCreateTemplateExercise(
        templateId, exerciseId, ex.noteScheda || '', ex.notePersonali || ''
      )
      const pid = `wwp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await pool.query(
        `INSERT INTO "WorkoutWeekParam" (id,"weekId","templateExId",sets,reps,"restSeconds",notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT ("weekId","templateExId") DO UPDATE SET
           sets=EXCLUDED.sets, reps=EXCLUDED.reps, "restSeconds"=EXCLUDED."restSeconds", notes=EXCLUDED.notes`,
        [pid, weekId, templateExId, ex.sets ?? 3, ex.reps || '', ex.restSeconds ?? 90, ex.noteScheda || null]
      )
    }
    return NextResponse.json(rows[0])
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
