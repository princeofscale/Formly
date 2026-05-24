import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export const dynamic = 'force-dynamic'

interface RawRow {
  created_at: string
  weight_kg: number
  reps: number
  rpe: number | null
  calculated_1rm: number | null
  set_number: number
  session_id: string
  exercises: { name: string; name_ru: string | null } | null
}

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET() {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('set_entries')
    .select(
      'created_at, weight_kg, reps, rpe, calculated_1rm, set_number, session_id, exercises(name, name_ru)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as RawRow[]

  const header = [
    'date',
    'session_id',
    'exercise_en',
    'exercise_ru',
    'set_number',
    'weight_kg',
    'reps',
    'rpe',
    'calculated_1rm',
  ].join(',')

  const lines = rows.map((r) => {
    const date = r.created_at.slice(0, 10)
    const enName = r.exercises?.name ?? ''
    const ruName = r.exercises?.name_ru ?? ''
    return [
      date,
      r.session_id,
      csvEscape(enName),
      csvEscape(ruName),
      r.set_number,
      r.weight_kg,
      r.reps,
      r.rpe ?? '',
      r.calculated_1rm?.toFixed(2) ?? '',
    ].join(',')
  })

  const csv = '﻿' + [header, ...lines].join('\n') + '\n'
  const filename = `trainingar-export-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
