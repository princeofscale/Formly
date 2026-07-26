'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import {
  sendDirectMessage,
  getThread,
  markThreadRead,
  deleteDirectMessage,
  type ThreadMessage,
} from '@/lib/db/messages'
import { ensureFriendCode } from '@/lib/db/friends'
import { notifyDirectMessage } from '@/lib/services/message-notifications.service'

export async function sendMessageAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const friendId = formData.get('friendId')?.toString()
  const body = (formData.get('body')?.toString() ?? '').slice(0, 1000).trim()
  if (!friendId || body.length === 0) return
  const id = await sendDirectMessage(supabase, friendId, body)
  if (id) {
    const myCode = await ensureFriendCode(supabase)
    await notifyDirectMessage(supabase, {
      recipientUserId: friendId,
      senderId: user.id,
      senderName: myCode ?? 'Друг',
      preview: body.slice(0, 80),
    })
  }
  revalidatePath(`/friends/chat/${friendId}`)
}

export async function loadThreadAction(friendId: string): Promise<ThreadMessage[]> {
  await verifySession()
  const supabase = await createClient()
  return getThread(supabase, friendId)
}

export async function markReadAction(friendId: string): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  await markThreadRead(supabase, friendId)
  revalidatePath('/friends')
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  const messageId = formData.get('messageId')?.toString()
  if (!messageId) return
  await deleteDirectMessage(supabase, messageId)
}
