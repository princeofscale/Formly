// Service worker: PWA installability, web-push notifications, and offline
// caching. Caching scope (spec: docs/superpowers/specs/2026-07-19-offline-
// workout-design.md):
//   - static assets (hashed, immutable) → cache-first
//   - /workout/<uuid> document navigations → network-first, cache fallback
//   - other navigations → network, /offline fallback
//   - RSC payloads, /api/*, POST, cross-origin → untouched

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `tar-static-${CACHE_VERSION}`
const PAGES_CACHE = `tar-pages-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'
const WORKOUT_RE = /^\/workout\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const NETWORK_TIMEOUT_MS = 3500

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
              .map((k) => caches.delete(k)),
          ),
        ),
      self.clients.claim(),
    ]),
  )
})

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/manifest')
  )
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirstWorkout(request) {
  const cache = await caches.open(PAGES_CACHE)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)
  try {
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    clearTimeout(timer)
    // ignoreSearch: the workout URL may carry ?template=… — same page.
    const cached = await cache.match(request, { ignoreSearch: true })
    if (cached) return cached
    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

async function networkWithOfflineFallback(request) {
  try {
    return await fetch(request)
  } catch (err) {
    const cache = await caches.open(PAGES_CACHE)
    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // RSC payloads poison the client router if served stale — never cache.
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return
  if (url.pathname.startsWith('/api/')) return

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    if (WORKOUT_RE.test(url.pathname)) {
      event.respondWith(networkFirstWorkout(request))
    } else {
      event.respondWith(networkWithOfflineFallback(request))
    }
  }
})

// Web Push: incoming notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = { title: 'Formly', body: '', url: '/dashboard' }
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
    }),
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
      self.registration
        .showNotification(title, {
          body,
          icon: '/icon',
          badge: '/icon',
          tag: 'rest-timer',
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url: '/dashboard' },
        })
        .catch(() => {})
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
    }),
  )
})
