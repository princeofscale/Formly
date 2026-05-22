'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addFriend, findUserByFriendCode, removeFriend } from '@/lib/db/friends'

export interface AddFriendResult {
  ok: boolean
  errorKey?: 'invalid' | 'notFound' | 'self' | 'already' | 'unknown'
}

export async function addFriendAction(formData: FormData): Promise<AddFriendResult> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const raw = formData.get('code')?.toString() ?? ''
  const code = raw.trim().toUpperCase()
  if (code.length !== 6) return { ok: false, errorKey: 'invalid' }

  const other = await findUserByFriendCode(supabase, code)
  if (!other) return { ok: false, errorKey: 'notFound' }
  if (other.id === user.id) return { ok: false, errorKey: 'self' }

  const result = await addFriend(supabase, user.id, other.id)
  if (!result.ok) {
    return {
      ok: false,
      errorKey:
        result.error === 'already' ? 'already' :
        result.error === 'self'    ? 'self' :
                                     'unknown',
    }
  }

  revalidatePath('/friends')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function removeFriendAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const otherId = formData.get('friendId')?.toString()
  if (!otherId) return
  await removeFriend(supabase, user.id, otherId)
  revalidatePath('/friends')
  revalidatePath('/dashboard')
}
