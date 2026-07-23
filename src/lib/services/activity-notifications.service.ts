import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToSubscription } from './web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'

export interface ReactionPushInput {
  recipientUserId: string
  reactorCode: string | null
  emoji: string
}

export async function notifyEventReaction(
  supabase: SupabaseClient,
  input: ReactionPushInput,
): Promise<void> {
  try {
    const { data: subsData } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', input.recipientUserId)
    const subs = (subsData ?? []) as PushSubscriptionRow[]
    if (subs.length === 0) return

    const who = input.reactorCode ?? 'Друг'
    const payload = {
      title: '🔥 Тебя поддержали',
      body: `${who} отреагировал ${input.emoji}`,
      url: '/friends',
    }

    for (const sub of subs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.expired) {
        await deletePushSubscriptionByEndpoint(supabase, sub.user_id, sub.endpoint)
      }
    }
  } catch (err) {
    console.error('notifyEventReaction failed:', err)
  }
}

export interface CommentPushInput {
  recipientUserId: string
  commenterCode: string | null
}

export async function notifyEventComment(
  supabase: SupabaseClient,
  input: CommentPushInput,
): Promise<void> {
  try {
    const { data: subsData } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', input.recipientUserId)
    const subs = (subsData ?? []) as PushSubscriptionRow[]
    if (subs.length === 0) return

    const who = input.commenterCode ?? 'Друг'
    const payload = {
      title: '💬 Новый комментарий',
      body: `${who} прокомментировал твою активность`,
      url: '/friends',
    }

    for (const sub of subs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.expired) {
        await deletePushSubscriptionByEndpoint(supabase, sub.user_id, sub.endpoint)
      }
    }
  } catch (err) {
    console.error('notifyEventComment failed:', err)
  }
}
