import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId, name, targetCalories, targetProtein, targetCarbs, targetFat } = await req.json()
  const hasTargets =
    targetCalories != null || targetProtein != null || targetCarbs != null || targetFat != null
  try {
    const { rows } = await pool.query(
      `INSERT INTO "User" (id, name, "targetCalories", "targetProtein", "targetCarbs", "targetFat", goal, "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,'maintain',NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = $2,
         "targetCalories" = CASE WHEN $7 THEN $3 ELSE "User"."targetCalories" END,
         "targetProtein"  = CASE WHEN $7 THEN $4 ELSE "User"."targetProtein"  END,
         "targetCarbs"    = CASE WHEN $7 THEN $5 ELSE "User"."targetCarbs"    END,
         "targetFat"      = CASE WHEN $7 THEN $6 ELSE "User"."targetFat"      END
       RETURNING *`,
      [
        userId, name ?? 'Utente',
        Math.round(Number(targetCalories) || 2000),
        Math.round(Number(targetProtein)  || 150),
        Math.round(Number(targetCarbs)    || 220),
        Math.round(Number(targetFat)      || 65),
        hasTargets,
      ]
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json(null)
  try {
    const { rows } = await pool.query(`SELECT * FROM "User" WHERE id=$1`, [userId])
    return NextResponse.json(rows[0] ?? null)
  } catch (e) {
    return NextResponse.json(null)
  }
}
