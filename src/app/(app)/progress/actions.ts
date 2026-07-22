'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { upsertBodyMetrics } from '@/lib/db/body-measurements'

export async function saveBodyMetricsAction(weightKg: number, heightCm: number): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  if (!Number.isFinite(weightKg) || weightKg <= 0) return
  if (!Number.isFinite(heightCm) || heightCm <= 0) return

  const { error } = await supabase
    .from('profiles')
    .update({
      weight_kg: weightKg,
      height_cm: heightCm,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  // Also log today's values so /progress can chart weight/height history.
  const today = new Date().toISOString().slice(0, 10)
  await upsertBodyMetrics(supabase, user.id, today, weightKg, heightCm)

  revalidatePath('/progress')
  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
