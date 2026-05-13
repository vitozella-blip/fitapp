import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get('planId')
  if (!planId) return NextResponse.json([])
  try {
    const { rows } = await pool.query(
      `SELECT t.*,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', te.id, 'order', te."order", 'sets', te.sets, 'reps', te.reps,
              'restSeconds', te."restSeconds", 'noteScheda', te."noteScheda",
              'notePersonali', te."notePersonali",
              'exercise', json_build_object('id', e.id, 'name', e.name, 'muscleGroup', e."muscleGroup")
            ) ORDER BY te."order"
          ) FROM "WorkoutTemplateExercise" te
          JOIN "Exercise" e ON e.id = te."exerciseId"
          WHERE te."templateId" = t.id
        ), '[]') as exercises
       FROM "WorkoutTemplate" t WHERE t."planId"=$1 ORDER BY t."order" ASC`,
      [planId]
    )
    return NextResponse.json(rows)
  } catch (e) { console.error(e); return NextResponse.json([]) }
}

export async function POST(req: NextRequest) {
  const { planId, userId, name } = await req.json()
  try {
    const { rows: m } = await pool.query(
      `SELECT COALESCE(MAX("order"),0)+1 as next FROM "WorkoutTemplate" WHERE "planId"=$1`, [planId]
    )
    const id = `wt-${Date.now()}`
    const { rows } = await pool.query(
      `INSERT INTO "WorkoutTemplate" (id,"planId",name,"userId","order","createdAt") VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
      [id, planId, name, userId, m[0].next]
    )
    return NextResponse.json({ ...rows[0], exercises: [] })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore' }, { status: 500 }) }
}
