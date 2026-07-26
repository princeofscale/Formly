'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

const bodyMetricsSchema = z.object({
  weightKg: z.number().min(20).max(500),
  heightCm: z.number().min(80).max(260),
})

export async function saveBodyMetricsAction(weightKg: number, heightCm: number): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  const values = bodyMetricsSchema.parse({ weightKg, heightCm })

  const { error } = await supabase.rpc('save_body_metrics', {
    p_weight_kg: values.weightKg,
    p_height_cm: values.heightCm,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/progress')
  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
