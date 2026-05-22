// Service worker for PWA installability and web-push notifications.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {})

// Web Push: incoming notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = { title: 'GymLog', body: '', url: '/dashboard' }
  try {
    payload = { ...payload, ...event.data.json() }
  } catch {
    payload.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon',
      badge: '/icon',
      data: { url: payload.url },
      vibrate: [200, 100, 200],
    })
  )
})

// Rest timer: client posts { type: 'rest-timer-start', endsAt, title, body }
// SW schedules a setTimeout — survives main thread throttling on backgrounded
// tabs better than a window-side setTimeout. Single timer at a time:
// starting a new one cancels the previous.
let restTimerId = null
let restTimerToken = 0

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'rest-timer-start') {
    if (restTimerId !== null) clearTimeout(restTimerId)
    const token = ++restTimerToken
    const endsAt = Number(data.endsAt) || 0
    const delay = Math.max(0, endsAt - Date.now())
    const title = String(data.title || 'Rest complete')
    const body = String(data.body || '')

    restTimerId = setTimeout(() => {
      if (token !== restTimerToken) return // cancelled
      restTimerId = null
      self.registration.showNotification(title, {
        body,
        icon: '/icon',
        badge: '/icon',
        tag: 'rest-timer',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: '/dashboard' },
      }).catch(() => {})
    }, delay)
  }

  if (data.type === 'rest-timer-cancel') {
    if (restTimerId !== null) clearTimeout(restTimerId)
    restTimerId = null
    restTimerToken += 1
  }
})

// Click handler: focus existing window or open new
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
