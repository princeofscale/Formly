import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToSubscription } from './web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'

export interface FriendRequestPushInput {
  recipientUserId: string
  requesterCode: string | null
}

export async function notifyFriendRequest(
  supabase: SupabaseClient,
  input: FriendRequestPushInput,
): Promise<void> {
  try {
    const { data: subsData } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', input.recipientUserId)
    const subs = (subsData ?? []) as PushSubscriptionRow[]
    if (subs.length === 0) return

    const payload = {
      title: '🤝 Заявка в друзья',
      body: input.requesterCode
        ? `Код ${input.requesterCode} хочет тебя добавить. Прими или отклони в /friends.`
        : 'Кто-то хочет тебя добавить. Открой /friends чтобы принять.',
      url: '/friends',
    }

    for (const sub of subs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.expired) {
        await deletePushSubscriptionByEndpoint(supabase, sub.user_id, sub.endpoint)
      }
    }
  } catch (err) {
    console.error('notifyFriendRequest failed:', err)
  }
}
