import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToSubscription } from './web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'

export interface ReactionPushInput {
  recipientUserId: string
  reactorCode: string | null
  exerciseName: string | null
}

export async function notifyReactionRecipient(
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
    const what = input.exerciseName ? ` на ${input.exerciseName}` : ''
    const payload = {
      title: '🔥 Тебя поздравили',
      body: `${who} оценил твой рекорд${what}!`,
      url: '/friends',
    }

    for (const sub of subs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.expired) {
        await deletePushSubscriptionByEndpoint(supabase, sub.user_id, sub.endpoint)
      }
    }
  } catch (err) {
    console.error('notifyReactionRecipient failed:', err)
  }
}
