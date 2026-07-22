import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToSubscription } from './web-push.service'
import { getFriendIds } from '@/lib/db/friends'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'

export interface PRPushInput {
  userId: string
  exerciseName: string
  weightKg: number
  reps: number
  improvementPct: number | null
}

export function buildPRPushBody(input: PRPushInput): string {
  const weight = formatNumber(input.weightKg)
  if (input.improvementPct === null) {
    return `${input.exerciseName} — новый рекорд: ${weight}кг × ${input.reps}`
  }
  return `${input.exerciseName} — ${weight}кг × ${input.reps} (+${input.improvementPct.toFixed(1)}%)`
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export async function notifyFriendsOfPR(
  supabase: SupabaseClient,
  input: PRPushInput,
): Promise<void> {
  try {
    const friendIds = await getFriendIds(supabase, input.userId)
    if (friendIds.length === 0) return

    const { data: subsData } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', friendIds)
    const subs = (subsData ?? []) as PushSubscriptionRow[]
    if (subs.length === 0) return

    const payload = {
      title: '🏆 Новый рекорд у друга!',
      body: buildPRPushBody(input),
      url: '/friends',
    }

    for (const sub of subs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.expired) {
        await deletePushSubscriptionByEndpoint(supabase, sub.user_id, sub.endpoint)
      }
    }
  } catch (err) {
    console.error('notifyFriendsOfPR failed:', err)
  }
}
