'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import {
  upsertMeasurement,
  deleteMeasurementForDate,
  MEASUREMENT_METRICS,
  type MeasurementInput,
} from '@/lib/db/body-measurements'

function parseNumber(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null
  const s = raw.toString().trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function saveMeasurementAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const date = formData.get('date')?.toString()
  if (!date) return

  const values: MeasurementInput = {}
  for (const metric of MEASUREMENT_METRICS) {
    values[metric] = parseNumber(formData.get(metric))
  }
  const notes = formData.get('notes')?.toString() ?? null
  values.notes = notes

  await upsertMeasurement(supabase, user.id, date, values)
  revalidatePath('/progress/measurements')
  revalidatePath('/progress')
}

export async function deleteMeasurementAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const date = formData.get('date')?.toString()
  if (!date) return
  await deleteMeasurementForDate(supabase, user.id, date)
  revalidatePath('/progress/measurements')
}
