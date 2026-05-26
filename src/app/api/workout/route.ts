import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

async function ensureSetColumns() {
  await Promise.all([
    pool.query(`ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "isWarmup" BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "tag" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "globalIndex" INT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "weekId" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisType" TEXT`).catch(() => {}),
    pool.query(`ALTER TABLE "WorkoutDiary" ADD COLUMN IF NOT EXISTS "tennisHours" TEXT`).catch(() => {}),
  ])
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date')
  const all = req.nextUrl.searchParams.get('all')

  if (!userId) return NextResponse.json([])
  try {
    if (all) {
      const from = req.nextUrl.searchParams.get('from')
      const to   = req.nextUrl.searchParams.get('to')
      const { rows } = await pool.query(
        `SELECT w.id, w.date,
           COUNT(s.id)::int                                     AS "setCount",
           COUNT(DISTINCT s."exerciseId")::int                   AS "exerciseCount",
           COALESCE(w."templateName", wt.name)                   AS "templateName",
           COALESCE(w."schedaOrder", wt."order")                 AS "templateOrder",
           BOOL_OR(LOWER(e.name) = 'tennis')                    AS "isTennis",
           w."tennisType"                                        AS "tennisTag",
           w."tennisHours"                                       AS "tennisHours"
         FROM "WorkoutDiary" w
         LEFT JOIN "WorkoutSet"      s  ON s."workoutDiaryId" = w.id
         LEFT JOIN "Exercise"        e  ON e.id = s."exerciseId"
         LEFT JOIN "WorkoutWeek"     ww ON ww.id = w."weekId"
         LEFT JOIN "WorkoutTemplate" wt ON wt.id = ww."templateId"
         WHERE w."userId" = $1
           AND ($2::text IS NULL OR w.date >= $2)
           AND ($3::text IS NULL OR w.date <= $3)
         GROUP BY w.id, w.date, wt.name, wt."order", w."tennisType", w."tennisHours",
                  w."templateName", w."schedaOrder"
         ORDER BY w.date DESC
         LIMIT 120`,
        [userId, from || null, to || null]
      )
      return NextResponse.json(rows)
    }
    const { rows } = await pool.query(
      `SELECT w.*,
         json_agg(
           json_build_object(
             'id',s.id,'setNumber',s."setNumber",'globalIndex',s."globalIndex",
             'reps',s.reps,'weight',s.weight,'exerciseId',s."exerciseId",
             'isWarmup',COALESCE(s."isWarmup",false),'tag',s.tag,'exercise',e
           )
           ORDER BY
             COALESCE(wte."order", ex_ord.min_idx, 99999) ASC,
             CASE WHEN COALESCE(s."isWarmup",false) THEN 0 ELSE 1 END ASC,
             s."setNumber" ASC
         ) AS sets
       FROM "WorkoutDiary" w
       LEFT JOIN "WorkoutSet" s ON s."workoutDiaryId" = w.id
       LEFT JOIN "Exercise" e ON e.id = s."exerciseId"
       LEFT JOIN "WorkoutWeek" ww ON ww.id = w."weekId"
       LEFT JOIN "WorkoutTemplateExercise" wte
         ON wte."templateId" = ww."templateId" AND wte."exerciseId" = s."exerciseId"
       LEFT JOIN (
         SELECT "workoutDiaryId", "exerciseId",
                MIN(COALESCE("globalIndex", 99999)) AS min_idx
         FROM "WorkoutSet"
         GROUP BY "workoutDiaryId", "exerciseId"
       ) ex_ord ON ex_ord."workoutDiaryId" = w.id AND ex_ord."exerciseId" = s."exerciseId"
       WHERE w."userId" = $1 AND w.date = $2
       GROUP BY w.id`,
      [userId, date]
    )
    return NextResponse.json(rows[0] || null)
  } catch (e) {
    console.error(e)
    return NextResponse.json(null)
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, exerciseId, sets, reps, weight, weekId, isWarmup } = await req.json()
  try {
    await pool.query(
      `INSERT INTO "User" (id, name, "targetCalories", "targetProtein", "targetCarbs", "targetFat", goal, "createdAt") VALUES ($1,'Utente',2000,150,220,65,'maintain',NOW()) ON CONFLICT (id) DO NOTHING`,
      [userId]
    )
    await ensureSetColumns()
    let workoutId: string
    const { rows: existing } = await pool.query(
      `SELECT id FROM "WorkoutDiary" WHERE "userId" = $1 AND date = $2`, [userId, date]
    )
    if (existing.length > 0) {
      workoutId = existing[0].id
      if (weekId) {
        await pool.query(`UPDATE "WorkoutDiary" SET "weekId"=$1 WHERE id=$2`, [weekId, workoutId])
      }
    } else {
      workoutId = crypto.randomUUID()
      await pool.query(
        `INSERT INTO "WorkoutDiary" (id, "userId", date, "weekId", "createdAt") VALUES ($1,$2,$3,$4,NOW())`,
        [workoutId, userId, date, weekId ?? null]
      )
    }
    const [maxRowsRes, globalRowsRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(MAX("setNumber"), 0) AS max FROM "WorkoutSet" WHERE "workoutDiaryId" = $1 AND "exerciseId" = $2`,
        [workoutId, exerciseId]
      ),
      pool.query(
        `SELECT COALESCE(MAX("globalIndex"), 0) AS gmax FROM "WorkoutSet" WHERE "workoutDiaryId" = $1`,
        [workoutId]
      ),
    ])
    const baseSetNumber = Number(maxRowsRes.rows[0].max)
    const baseGlobalIndex = Number(globalRowsRes.rows[0].gmax)
    for (let i = 0; i < sets; i++) {
      await pool.query(
        `INSERT INTO "WorkoutSet" (id, "workoutDiaryId", "exerciseId", "setNumber", reps, weight, "isWarmup", "globalIndex") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [crypto.randomUUID(), workoutId, exerciseId, baseSetNumber + i + 1, reps, weight || null, isWarmup ?? false, baseGlobalIndex + i + 1]
      )
    }
    return NextResponse.json({ ok: true, workoutId })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
