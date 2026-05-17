'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

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

  revalidatePath('/progress')
  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
