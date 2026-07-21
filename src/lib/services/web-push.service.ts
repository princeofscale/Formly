import webpush from 'web-push'
import type { PushSubscriptionRow } from '@/lib/db/push-subscriptions'

let configured = false

function configure() {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const contact = process.env.VAPID_CONTACT_EMAIL ?? 'https://github.com/princeofscale/Formly'

  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID keys are missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY',
    )
  }

  webpush.setVapidDetails(contact, publicKey, privateKey)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export interface SendResult {
  endpoint: string
  ok: boolean
  expired: boolean
  error?: string
}

export async function sendPushToSubscription(
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<SendResult> {
  configure()

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    )
    return { endpoint: sub.endpoint, ok: true, expired: false }
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    const expired = statusCode === 404 || statusCode === 410
    return {
      endpoint: sub.endpoint,
      ok: false,
      expired,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function sendPushToMany(
  subs: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<SendResult[]> {
  return Promise.all(subs.map((s) => sendPushToSubscription(s, payload)))
}
