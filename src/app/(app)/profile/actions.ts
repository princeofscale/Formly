// src/app/(app)/profile/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { locales } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { isValidTimeZone } from '@/lib/utils/time-zone'

const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(40).optional(),
  weight_kg: z.coerce.number().min(20).max(500).optional(),
  height_cm: z.coerce.number().min(80).max(260).optional(),
  age: z.coerce.number().int().min(13).max(119).optional(),
  training_since: z.iso.date().optional(),
  training_location: z.enum(['gym', 'home', 'both']).optional(),
  training_schedule: z.array(z.coerce.number().int().min(1).max(7)).default([]),
  locale: z.enum(locales).optional(),
  time_zone: z.string().refine(isValidTimeZone).optional(),
})

export async function updateProfileAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const raw = {
    display_name: formData.get('display_name') || undefined,
    weight_kg: formData.get('weight_kg') || undefined,
    height_cm: formData.get('height_cm') || undefined,
    age: formData.get('age') || undefined,
    training_since: formData.get('training_since') || undefined,
    training_location: formData.get('training_location') || undefined,
    training_schedule: formData.getAll('training_schedule'),
    locale: formData.get('locale') || undefined,
    time_zone: formData.get('time_zone') || undefined,
  }

  const parsed = profileSchema.parse(raw)

  const { locale, ...profileFields } = parsed
  const { error } = await supabase
    .from('profiles')
    .update({ ...profileFields, ...(locale ? { locale } : {}) })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  if (locale) {
    const cookieStore = await cookies()
    cookieStore.set('locale', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
