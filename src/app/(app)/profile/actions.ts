// src/app/(app)/profile/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

const profileSchema = z.object({
  weight_kg: z.coerce.number().positive().optional(),
  height_cm: z.coerce.number().positive().optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  training_since: z.string().optional(),
  training_location: z.enum(['gym', 'home', 'both']).optional(),
  training_schedule: z.array(z.coerce.number().int().min(1).max(7)).default([]),
  locale: z.enum(['ru', 'en']).optional(),
})

export async function updateProfileAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const raw = {
    weight_kg: formData.get('weight_kg') || undefined,
    height_cm: formData.get('height_cm') || undefined,
    age: formData.get('age') || undefined,
    training_since: formData.get('training_since') || undefined,
    training_location: formData.get('training_location') || undefined,
    training_schedule: formData.getAll('training_schedule'),
    locale: formData.get('locale') || undefined,
  }

  const parsed = profileSchema.parse(raw)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale, ...profileFields } = parsed

  const { error } = await supabase
    .from('profiles')
    .update(profileFields)
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  if (locale) {
    const cookieStore = await cookies()
    cookieStore.set('locale', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
