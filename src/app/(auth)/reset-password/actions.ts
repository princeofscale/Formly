'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z
  .object({
    password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'] })

export async function setNewPasswordAction(_: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    if (first?.path[0] === 'confirm') return { errorKey: 'auth.reset.mismatch' as const }
    return { errorKey: 'auth.reset.tooShort' as const }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { errorKey: 'auth.reset.linkExpired' as const }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { errorKey: 'auth.errors.default' as const }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
