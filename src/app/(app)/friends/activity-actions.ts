'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import {
  toggleEventReaction,
  addEventComment,
  deleteEventComment,
  getEventComments,
  blockUser,
  unblockUser,
  setShareActivity,
} from '@/lib/db/activity'
import type { FeedComment } from '@/lib/db/activity'
import { ensureFriendCode } from '@/lib/db/friends'
import {
  notifyEventReaction,
  notifyEventComment,
} from '@/lib/services/activity-notifications.service'

export async function reactAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const eventId = formData.get('eventId')?.toString()
  const emoji = formData.get('emoji')?.toString()
  if (!eventId || !emoji) return
  const { reacted, authorId } = await toggleEventReaction(supabase, eventId, emoji)
  if (reacted && authorId && authorId !== user.id) {
    const myCode = await ensureFriendCode(supabase)
    void notifyEventReaction(supabase, { recipientUserId: authorId, reactorCode: myCode, emoji })
  }
  revalidatePath('/friends')
}

export async function commentAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const eventId = formData.get('eventId')?.toString()
  const body = formData.get('body')?.toString()?.slice(0, 280) ?? ''
  if (!eventId || body.trim().length === 0) return
  const res = await addEventComment(supabase, eventId, body)
  if (res && res.authorId !== user.id) {
    const myCode = await ensureFriendCode(supabase)
    void notifyEventComment(supabase, { recipientUserId: res.authorId, commenterCode: myCode })
  }
  revalidatePath('/friends')
}

export async function loadCommentsAction(eventId: string): Promise<FeedComment[]> {
  await verifySession()
  const supabase = await createClient()
  return getEventComments(supabase, eventId)
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  const commentId = formData.get('commentId')?.toString()
  if (!commentId) return
  await deleteEventComment(supabase, commentId)
  revalidatePath('/friends')
}

export async function blockUserAction(formData: FormData): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  const targetId = formData.get('targetId')?.toString()
  if (!targetId) return
  await blockUser(supabase, targetId)
  revalidatePath('/friends')
  revalidatePath('/dashboard')
}

export async function unblockUserAction(formData: FormData): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  const targetId = formData.get('targetId')?.toString()
  if (!targetId) return
  await unblockUser(supabase, targetId)
  revalidatePath('/friends')
}

export async function setShareActivityAction(formData: FormData): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  await setShareActivity(supabase, formData.get('on') === 'true')
  revalidatePath('/profile')
  revalidatePath('/friends')
}
