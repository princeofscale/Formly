import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToSubscription } from './web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'

export interface DirectMessagePushInput {
  recipientUserId: string
  senderId: string
  senderName: string
  preview: string
}

export async function notifyDirectMessage(
  supabase: SupabaseClient,
  input: DirectMessagePushInput,
): Promise<void> {
  try {
    const { data: subsData } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', input.recipientUserId)
    const subs = (subsData ?? []) as PushSubscriptionRow[]
    if (subs.length === 0) return

    const payload = {
      title: '💬 Новое сообщение',
      body: `${input.senderName}: ${input.preview}`,
      url: `/friends/chat/${input.senderId}`,
    }

    for (const sub of subs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.expired) {
        await deletePushSubscriptionByEndpoint(supabase, sub.user_id, sub.endpoint)
      }
    }
  } catch (err) {
    console.error('notifyDirectMessage failed:', err)
  }
}
