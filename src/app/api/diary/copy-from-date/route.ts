import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { userId, fromDate, meal, toDate } = await req.json()
    if (!userId || !fromDate || !meal || !toDate) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const { rows: entries } = await pool.query(
      `SELECT "foodId", quantity FROM "FoodDiaryEntry"
       WHERE "userId" = $1 AND date = $2 AND meal = $3`,
      [userId, fromDate, meal]
    )

    if (entries.length === 0) return NextResponse.json({ copied: 0 })

    await Promise.all(
      entries.map((e: { foodId: string; quantity: number }) =>
        pool.query(
          `INSERT INTO "FoodDiaryEntry" (id, "userId", date, meal, "foodId", quantity, "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
          [crypto.randomUUID(), userId, toDate, meal, e.foodId, e.quantity]
        )
      )
    )

    return NextResponse.json({ copied: entries.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
