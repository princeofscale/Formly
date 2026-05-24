import type { SupabaseClient } from '@supabase/supabase-js'

export const MEASUREMENT_METRICS = [
  'weight_kg',
  'body_fat_pct',
  'waist_cm',
  'chest_cm',
  'hips_cm',
  'biceps_cm',
  'thigh_cm',
  'calf_cm',
  'neck_cm',
] as const

export type MeasurementMetric = (typeof MEASUREMENT_METRICS)[number]

export interface BodyMeasurement {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  waist_cm: number | null
  chest_cm: number | null
  hips_cm: number | null
  biceps_cm: number | null
  thigh_cm: number | null
  calf_cm: number | null
  neck_cm: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type MeasurementInput = Partial<Pick<BodyMeasurement, MeasurementMetric | 'notes'>>

export async function upsertMeasurement(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  values: MeasurementInput,
): Promise<BodyMeasurement> {
  const row: Record<string, unknown> = { user_id: userId, date }
  for (const k of MEASUREMENT_METRICS) {
    if (values[k] != null) row[k] = values[k]
    else row[k] = null
  }
  row.notes = values.notes && values.notes.trim() ? values.notes.trim() : null

  const { data, error } = await supabase
    .from('body_measurements')
    .upsert(row, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as BodyMeasurement
}

export async function getMeasurementForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<BodyMeasurement | null> {
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  return data as BodyMeasurement | null
}

export async function getRecentMeasurements(
  supabase: SupabaseClient,
  userId: string,
  limit = 30,
): Promise<BodyMeasurement[]> {
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
  return (data as BodyMeasurement[]) ?? []
}

export async function deleteMeasurementForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw new Error(error.message)
}
