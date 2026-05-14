import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const year   = req.nextUrl.searchParams.get('year')
  const month  = req.nextUrl.searchParams.get('month') // 1-12

  if (!userId || !year || !month) return NextResponse.json([])

  const m = String(month).padStart(2, '0')
  const from = `${year}-${m}-01`
  // last day of month: use next month first day
  const nextMonth = Number(month) === 12 ? `${Number(year) + 1}-01-01` : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`

  try {
    const r = await pool.query(
      `SELECT DISTINCT date::text FROM "WorkoutDiary"
       WHERE "userId"=$1 AND date >= $2 AND date < $3
       ORDER BY date`,
      [userId, from, nextMonth]
    )
    return NextResponse.json(r.rows.map((row: { date: string }) => row.date))
  } catch (e) {
    console.error(e)
    return NextResponse.json([])
  }
}
