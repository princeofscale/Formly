'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const SUPABASE_ERROR_MAP: Record<string, string> = {
  'User already registered': 'auth.errors.default',
  'Email not confirmed': 'auth.errors.emailNotConfirmed',
}

function mapAuthError(message: string): string {
  return SUPABASE_ERROR_MAP[message] ?? 'auth.errors.default'
}

export async function registerAction(_: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { errorKey: 'auth.errors.invalidCredentials' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp(parsed.data)

  if (error) return { errorKey: mapAuthError(error.message) }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
