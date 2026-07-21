import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, userId, templateExerciseId } = await req.json()
  try {
    // Se esiste già un Exercise con lo stesso nome (case-insensitive), rilinka il template exercise
    const { rows: existing } = await pool.query(
      `SELECT id FROM "Exercise"
       WHERE LOWER(name) = LOWER($1) AND id != $2
         AND ("userId" IS NULL OR "userId" = $3)
       LIMIT 1`,
      [name, id, userId || null]
    )

    if (existing.length > 0 && templateExerciseId) {
      const targetId = existing[0].id
      await pool.query(
        `UPDATE "WorkoutTemplateExercise" SET "exerciseId"=$1 WHERE id=$2`,
        [targetId, templateExerciseId]
      )
      return NextResponse.json({ ok: true, merged: true, targetId })
    }

    await pool.query(`UPDATE "Exercise" SET name=$1 WHERE id=$2`, [name, id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
