import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const year   = req.nextUrl.searchParams.get('year')
  const month  = req.nextUrl.searchParams.get('month')

  if (!userId || !year || !month) return NextResponse.json({ templates: [] })

  const m    = String(month).padStart(2, '0')
  const from = `${year}-${m}-01`
  const next = Number(month) === 12
    ? `${Number(year) + 1}-01-01`
    : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`

  try {
    const { rows: plans } = await pool.query(
      `SELECT id FROM "WorkoutPlan" WHERE "userId"=$1 ORDER BY "isActive" DESC, "createdAt" DESC LIMIT 1`,
      [userId]
    )
    if (!plans.length) return NextResponse.json({ templates: [] })

    const { rows } = await pool.query(
      `SELECT
         t.id, t.name, t."order",
         COALESCE(
           json_agg(DISTINCT wd.date::text)
             FILTER (WHERE wd.date IS NOT NULL AND wd.date >= $2 AND wd.date < $3),
           '[]'
         ) AS dates
       FROM "WorkoutTemplate" t
       LEFT JOIN "WorkoutWeek" ww ON ww."templateId" = t.id
       LEFT JOIN "WorkoutDiary" wd ON wd."weekId" = ww.id AND wd."userId" = $1
       WHERE t."planId" = $4
       GROUP BY t.id, t.name, t."order"
       ORDER BY t."order"`,
      [userId, from, next, plans[0].id]
    )

    return NextResponse.json({ templates: rows })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ templates: [] })
  }
}
