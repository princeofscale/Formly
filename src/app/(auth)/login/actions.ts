'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type AuthErrorKey =
  | 'auth.errors.emailNotConfirmed'
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.default'

function mapAuthError(message: string): AuthErrorKey {
  if (message === 'Email not confirmed') return 'auth.errors.emailNotConfirmed'
  if (message === 'Invalid login credentials') return 'auth.errors.invalidCredentials'
  return 'auth.errors.default'
}

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { errorKey: 'auth.errors.invalidCredentials' } as const
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) return { errorKey: mapAuthError(error.message) }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
