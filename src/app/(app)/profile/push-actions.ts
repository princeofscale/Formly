'use server'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import {
  upsertPushSubscription,
  deletePushSubscriptionByEndpoint,
  getUserSubscriptions,
} from '@/lib/db/push-subscriptions'
import { sendPushToMany } from '@/lib/services/web-push.service'

export async function subscribeToPushAction(input: {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await upsertPushSubscription(
    supabase,
    user.id,
    input.endpoint,
    { p256dh: input.p256dh, auth: input.auth },
    input.userAgent,
  )
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await deletePushSubscriptionByEndpoint(supabase, user.id, endpoint)
}

export async function sendTestPushAction(): Promise<{ sent: number; failed: number }> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const subs = await getUserSubscriptions(supabase, user.id)
  if (subs.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const results = await sendPushToMany(subs, {
    title: 'TrainingAR',
    body: 'Уведомления работают. Время тренироваться!',
    url: '/dashboard',
  })

  // Clean up expired endpoints
  const expired = results.filter((r) => r.expired)
  for (const r of expired) {
    await deletePushSubscriptionByEndpoint(supabase, user.id, r.endpoint)
  }

  return {
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  }
}
