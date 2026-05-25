// Browser-side helper for subscribing to Web Push.
// Mirrors the flow inside NotificationsToggle so different entry points
// (profile page, onboarding) can share it.

function urlBase64ToBuffer(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface PushSubscribePayload {
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string
}

export type UnsupportedReason =
  | 'no-window'
  | 'insecure-context'
  | 'no-notification'
  | 'no-serviceworker'
  | 'no-pushmanager'
  | 'sw-not-registered'

export type PushSubscribeResult =
  | { status: 'granted'; payload: PushSubscribePayload }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: UnsupportedReason }
  | { status: 'no-key' }
  | { status: 'error'; error: unknown }

function detectUnsupported(): UnsupportedReason | null {
  if (typeof window === 'undefined') return 'no-window'
  // Push requires a secure context. HTTPS (or localhost) is fine; an
  // in-app browser that bypasses the address bar can sometimes report
  // false here, which is the most useful signal in those cases.
  if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) {
    return 'insecure-context'
  }
  if (!('Notification' in window)) return 'no-notification'
  if (!('serviceWorker' in navigator)) return 'no-serviceworker'
  if (!('PushManager' in window)) return 'no-pushmanager'
  return null
}

export async function requestPushSubscription(
  vapidPublicKey: string,
): Promise<PushSubscribeResult> {
  const reason = detectUnsupported()
  if (reason) return { status: 'unsupported', reason }
  if (!vapidPublicKey) return { status: 'no-key' }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { status: 'denied' }

    // serviceWorker.ready hangs forever if no SW ever registered. Race it
    // with a timeout so we can surface 'sw-not-registered' instead of a
    // permanently-pending promise.
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ])
    if (!reg) return { status: 'unsupported', reason: 'sw-not-registered' }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(vapidPublicKey).buffer as ArrayBuffer,
    })

    const p256dh = sub.getKey('p256dh')
    const auth = sub.getKey('auth')
    if (!p256dh || !auth) return { status: 'error', error: new Error('missing keys') }

    return {
      status: 'granted',
      payload: {
        endpoint: sub.endpoint,
        p256dh: bufferToBase64Url(p256dh),
        auth: bufferToBase64Url(auth),
        userAgent: navigator.userAgent,
      },
    }
  } catch (error) {
    return { status: 'error', error }
  }
}
