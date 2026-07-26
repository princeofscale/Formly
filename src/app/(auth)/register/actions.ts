'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type AuthErrorKey = 'auth.errors.emailNotConfirmed' | 'auth.errors.default'

function mapAuthError(message: string): AuthErrorKey {
  return message === 'Email not confirmed' ? 'auth.errors.emailNotConfirmed' : 'auth.errors.default'
}

export async function registerAction(_: unknown, formData: FormData) {
  if (formData.get('agree') !== 'on') {
    return { errorKey: 'auth.errors.legalRequired' } as const
  }

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { errorKey: 'auth.errors.invalidCredentials' } as const
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp(parsed.data)

  if (error) return { errorKey: mapAuthError(error.message) }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}
