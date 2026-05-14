import type { SupabaseClient } from '@supabase/supabase-js'
import type { BodyMeasurement } from '@/lib/types/models'

export interface MeasurementInput {
  date: string
  weight_kg?: number
  chest_cm?: number
  waist_cm?: number
  hips_cm?: number
  biceps_cm?: number
  body_fat_pct?: number
}

export async function getMeasurements(
  supabase: SupabaseClient,
  userId: string
): Promise<BodyMeasurement[]> {
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  return (data as BodyMeasurement[]) ?? []
}

export async function upsertMeasurement(
  supabase: SupabaseClient,
  userId: string,
  input: MeasurementInput
): Promise<void> {
  const row = {
    user_id: userId,
    date: input.date,
    weight_kg: input.weight_kg ?? null,
    chest_cm: input.chest_cm ?? null,
    waist_cm: input.waist_cm ?? null,
    hips_cm: input.hips_cm ?? null,
    biceps_cm: input.biceps_cm ?? null,
    body_fat_pct: input.body_fat_pct ?? null,
  }
  const { error } = await supabase
    .from('body_measurements')
    .upsert(row, { onConflict: 'user_id,date' })
  if (error) throw new Error(error.message)
}

export async function deleteMeasurement(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}
