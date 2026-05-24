'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import {
  acceptFriendRequest,
  addFriend,
  declineFriendRequest,
  ensureFriendCode,
  findUserByFriendCode,
  removeFriend,
} from '@/lib/db/friends'
import { getPrSetOwnerAndExercise, toggleReaction } from '@/lib/db/prs'
import { notifyFriendRequest } from '@/lib/services/friend-request-notifications.service'
import { notifyReactionRecipient } from '@/lib/services/pr-reaction-notifications.service'

export interface AddFriendResult {
  ok: boolean
  /** ok=true → request was created (pending), waiting for the other side. */
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

  // ensureFriendCode is idempotent and returns the caller's own code,
  // so the push body can show "Код XXXXX хочет тебя добавить".
  const myCode = await ensureFriendCode(supabase)
  void notifyFriendRequest(supabase, {
    recipientUserId: other.id,
    requesterCode: myCode,
  })

  revalidatePath('/friends')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function acceptFriendRequestAction(formData: FormData): Promise<void> {
  const { user: _user } = await verifySession()
  void _user
  const supabase = await createClient()
  const friendshipId = formData.get('friendshipId')?.toString()
  if (!friendshipId) return
  await acceptFriendRequest(supabase, friendshipId)
  revalidatePath('/friends')
  revalidatePath('/dashboard')
}

export async function declineFriendRequestAction(formData: FormData): Promise<void> {
  const { user: _user } = await verifySession()
  void _user
  const supabase = await createClient()
  const friendshipId = formData.get('friendshipId')?.toString()
  if (!friendshipId) return
  await declineFriendRequest(supabase, friendshipId)
  revalidatePath('/friends')
}

export async function toggleReactionAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const prSetId = formData.get('prSetId')?.toString()
  if (!prSetId) return

  const result = await toggleReaction(supabase, user.id, prSetId)

  // Only push on the positive transition (clicked, didn't already react).
  // Avoids spamming on accidental double-taps / un-reacts.
  if (result.reacted) {
    const meta = await getPrSetOwnerAndExercise(supabase, prSetId)
    if (meta && meta.ownerId !== user.id) {
      const myCode = await ensureFriendCode(supabase)
      void notifyReactionRecipient(supabase, {
        recipientUserId: meta.ownerId,
        reactorCode: myCode,
        exerciseName: meta.exerciseNameRu ?? meta.exerciseName,
      })
    }
  }

  revalidatePath('/friends')
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
