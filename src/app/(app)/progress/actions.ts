'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { upsertMeasurement } from '@/lib/db/body-measurements'

export async function saveBodyWeightAction(weightKg: number): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  if (!Number.isFinite(weightKg) || weightKg <= 0) return

  const today = new Date().toISOString().slice(0, 10)
  await upsertMeasurement(supabase, user.id, {
    date: today,
    weight_kg: weightKg,
  })
  revalidatePath('/progress')
  revalidatePath('/body')
}
