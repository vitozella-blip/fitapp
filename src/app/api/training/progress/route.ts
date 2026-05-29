import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId     = req.nextUrl.searchParams.get('userId')
  const exerciseId = req.nextUrl.searchParams.get('exerciseId')
  const templateId = req.nextUrl.searchParams.get('templateId')
  const weeks      = req.nextUrl.searchParams.get('weeks')
  const templates  = req.nextUrl.searchParams.get('templates')

  if (!userId) return NextResponse.json(null)

  try {
    // ── All exercises: in any plan OR ever logged ─────────────────────────
    if (templates === 'exercises') {
      const { rows } = await pool.query(
        `WITH user_exercises AS (
           SELECT DISTINCT e.id, e.name
           FROM "WorkoutTemplateExercise" te
           JOIN "WorkoutTemplate" t  ON t.id  = te."templateId"
           JOIN "WorkoutPlan"     pl ON pl.id = t."planId" AND pl."userId" = $1
           JOIN "Exercise"        e  ON e.id  = te."exerciseId"
           WHERE LOWER(e.name) != 'tennis'
           UNION
           SELECT DISTINCT e.id, e.name
           FROM "WorkoutSet"   s
           JOIN "WorkoutDiary" w ON w.id = s."workoutDiaryId" AND w."userId" = $1
           JOIN "Exercise"     e ON e.id = s."exerciseId"
           WHERE LOWER(e.name) != 'tennis'
         ),
         stats AS (
           SELECT LOWER(e.name) AS name_key,
                  COUNT(DISTINCT w.date)::int                          AS sessions,
                  MAX(s.weight)                                        AS "maxWeight",
                  MAX(s.duration)                                      AS "maxDuration",
                  BOOL_OR(s.duration IS NOT NULL AND s.weight IS NULL) AS "isDuration"
           FROM "WorkoutSet" s
           JOIN "WorkoutDiary" w ON w.id = s."workoutDiaryId" AND w."userId" = $1
           JOIN "Exercise"     e ON e.id = s."exerciseId"
           WHERE LOWER(e.name) != 'tennis'
           GROUP BY LOWER(e.name)
         ),
         plan_names AS (
           SELECT LOWER(e.name) AS name_key,
                  ARRAY_REMOVE(ARRAY_AGG(DISTINCT pl.name ORDER BY pl.name), NULL) AS "planNames"
           FROM "WorkoutTemplateExercise" te
           JOIN "WorkoutTemplate" t  ON t.id  = te."templateId"
           JOIN "WorkoutPlan"     pl ON pl.id = t."planId" AND pl."userId" = $1
           JOIN "Exercise"        e  ON e.id  = te."exerciseId"
           WHERE LOWER(e.name) != 'tennis'
           GROUP BY LOWER(e.name)
         )
         SELECT ARRAY_AGG(DISTINCT ue.id)       AS ids,
                MIN(ue.id)                       AS id,
                MIN(ue.name)                     AS name,
                COALESCE(st.sessions, 0)::int    AS sessions,
                st."maxWeight",
                st."maxDuration",
                COALESCE(st."isDuration", false) AS "isDuration",
                COALESCE(pn."planNames", '{}')   AS "planNames"
         FROM user_exercises ue
         LEFT JOIN stats      st ON st.name_key = LOWER(ue.name)
         LEFT JOIN plan_names pn ON pn.name_key = LOWER(ue.name)
         GROUP BY LOWER(ue.name), st.sessions, st."maxWeight", st."maxDuration", st."isDuration", pn."planNames"
         ORDER BY MIN(ue.name) ASC`,
        [userId]
      )
      return NextResponse.json(rows)
    }

    // ── List of workout templates (schede) ───────────────────────────────
    if (templates === '1') {
      const { rows } = await pool.query(
        `SELECT t.id, t.name, t."order", p.name AS "planName", p.id AS "planId"
         FROM "WorkoutTemplate" t
         JOIN "WorkoutPlan" p ON p.id = t."planId"
         WHERE p."userId" = $1
         ORDER BY p."createdAt" DESC, t."order" ASC`,
        [userId]
      )
      return NextResponse.json(rows)
    }

    // ── Exercises for a specific template (scoped to userId) ─────────────
    if (templateId) {
      const { rows } = await pool.query(
        `SELECT e.id, e.name, e."muscleGroup",
                te."order",
                COALESCE(stats.sessions, 0)::int       AS sessions,
                stats."maxWeight",
                stats."maxDuration",
                COALESCE(stats."isDuration", false)    AS "isDuration"
         FROM "WorkoutTemplateExercise" te
         JOIN "Exercise" e ON e.id = te."exerciseId"
         LEFT JOIN (
           SELECT s."exerciseId",
                  COUNT(DISTINCT w.date)::int           AS sessions,
                  MAX(s.weight)                         AS "maxWeight",
                  MAX(s.duration)                       AS "maxDuration",
                  BOOL_OR(s.duration IS NOT NULL AND s.weight IS NULL) AS "isDuration"
           FROM "WorkoutSet" s
           JOIN "WorkoutDiary" w ON w.id = s."workoutDiaryId" AND w."userId" = $1
           GROUP BY s."exerciseId"
         ) stats ON stats."exerciseId" = e.id
         WHERE te."templateId" = $2
         ORDER BY te."order" ASC`,
        [userId, templateId]
      )
      return NextResponse.json(rows)
    }

    // ── Time-series for one or more exercises (comma-separated ids) ──────
    if (exerciseId) {
      const exerciseIds = exerciseId.split(',').filter(Boolean)
      const weekIds = req.nextUrl.searchParams.get('weekIds')
      const params: unknown[] = [userId, exerciseIds]
      let dateFilter = ''
      if (weekIds) {
        const ids = weekIds.split(',').filter(Boolean)
        dateFilter = `AND w."weekId" = ANY($3::text[])`
        params.push(ids)
      } else if (weeks) {
        dateFilter = `AND w.date >= (CURRENT_DATE - ($3 || ' weeks')::interval)::text`
        params.push(weeks)
      }
      const { rows } = await pool.query(
        `SELECT
           w.date,
           MAX(s.weight)                          AS "maxWeight",
           SUM(s.reps * COALESCE(s.weight, 0))   AS "volume",
           SUM(s.duration)                        AS "totalDuration",
           COUNT(s.id)::int                       AS "setCount",
           json_agg(
             json_build_object(
               'setNumber', s."setNumber",
               'reps',      s.reps,
               'weight',    s.weight,
               'duration',  s.duration
             ) ORDER BY s."setNumber"
           ) AS sets
         FROM "WorkoutDiary" w
         JOIN "WorkoutSet" s ON s."workoutDiaryId" = w.id
         WHERE w."userId" = $1
           AND s."exerciseId" = ANY($2::text[])
           ${dateFilter}
         GROUP BY w.date
         ORDER BY w.date ASC`,
        params
      )
      return NextResponse.json(rows)
    }

    return NextResponse.json([])
  } catch (e) {
    console.error('GET /api/training/progress error:', e)
    return NextResponse.json([])
  }
}
