'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { upsertMeasurement, deleteMeasurement } from '@/lib/db/body-measurements'

const positiveOptional = z.preprocess(
  v => v === '' || v === null || v === undefined ? undefined : Number(v),
  z.number().positive().optional()
)

const bodyFatOptional = z.preprocess(
  v => v === '' || v === null || v === undefined ? undefined : Number(v),
  z.number().min(0).max(100).optional()
)

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: positiveOptional,
  chest_cm: positiveOptional,
  waist_cm: positiveOptional,
  hips_cm: positiveOptional,
  biceps_cm: positiveOptional,
  body_fat_pct: bodyFatOptional,
})

export async function addMeasurementAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const parsed = schema.parse({
    date: formData.get('date'),
    weight_kg: formData.get('weight_kg'),
    chest_cm: formData.get('chest_cm'),
    waist_cm: formData.get('waist_cm'),
    hips_cm: formData.get('hips_cm'),
    biceps_cm: formData.get('biceps_cm'),
    body_fat_pct: formData.get('body_fat_pct'),
  })

  await upsertMeasurement(supabase, user.id, parsed)
  revalidatePath('/body')
}

export async function deleteMeasurementAction(id: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await deleteMeasurement(supabase, user.id, id)
  revalidatePath('/body')
}
