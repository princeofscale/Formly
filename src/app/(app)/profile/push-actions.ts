'use server'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import {
  upsertPushSubscription,
  deletePushSubscriptionByEndpoint,
  getUserSubscriptions,
} from '@/lib/db/push-subscriptions'
import { sendPushToMany } from '@/lib/services/web-push.service'
import { isSupportedPushEndpoint } from '@/lib/utils/push-endpoint'
import { z } from 'zod'

const endpointSchema = z.url().max(2048).refine(isSupportedPushEndpoint)
const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  p256dh: z.string().min(40).max(200),
  auth: z.string().min(16).max(100),
  userAgent: z.string().max(500).optional(),
})

export async function subscribeToPushAction(input: {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<void> {
  const values = pushSubscriptionSchema.parse(input)
  const { user } = await verifySession()
  const supabase = await createClient()
  await upsertPushSubscription(
    supabase,
    user.id,
    values.endpoint,
    { p256dh: values.p256dh, auth: values.auth },
    values.userAgent,
  )
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<void> {
  const validEndpoint = endpointSchema.parse(endpoint)
  const { user } = await verifySession()
  const supabase = await createClient()
  await deletePushSubscriptionByEndpoint(supabase, user.id, validEndpoint)
}

export async function sendTestPushAction(): Promise<{ sent: number; failed: number }> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const { data: allowed, error: limitError } = await supabase.rpc('claim_test_push')
  if (limitError) throw new Error(limitError.message)
  if (!allowed) return { sent: 0, failed: 0 }

  const subs = await getUserSubscriptions(supabase, user.id)
  if (subs.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const results = await sendPushToMany(subs, {
    title: 'Formly',
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
