// Service worker: PWA installability, web-push notifications, and offline
// caching. Caching scope (spec: docs/superpowers/specs/2026-07-19-offline-
// workout-design.md):
//   - static assets (hashed, immutable) → cache-first
//   - navigations → network, /offline fallback
//   - RSC payloads, /api/*, POST, cross-origin → untouched
// Authenticated HTML is never cached: Cache Storage is shared by accounts
// using the same browser profile.

const CACHE_VERSION = 'v2'
const STATIC_CACHE = `tar-static-${CACHE_VERSION}`
const PAGES_CACHE = `tar-pages-${CACHE_VERSION}`
// The rest timer's deadline outlives this worker: a browser is free to
// terminate a service worker whenever it likes, and a pending setTimeout dies
// with it. Cache Storage is used rather than IndexedDB because the worker
// already speaks it and the record is a single small value.
const TIMER_CACHE = `tar-timer-${CACHE_VERSION}`
const TIMER_KEY = '/__rest-timer'
const OFFLINE_URL = '/offline'

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
      catchUpRestTimer().catch(() => {}),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE && k !== TIMER_CACHE)
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
    event.respondWith(networkWithOfflineFallback(request))
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
//
// The timeout alone is not a guarantee. If the browser terminates the worker
// while a set is resting, the callback dies with it and no notification ever
// arrives. The deadline is therefore also written to Cache Storage, and every
// later wake-up — activation, a message from a page, the tab regaining focus
// — fires a deadline that has already passed. That makes a late notification
// possible where previously there was none; background delivery stays
// best-effort either way.
let restTimerId = null
let restTimerToken = 0

async function saveRestTimer(state) {
  const cache = await caches.open(TIMER_CACHE)
  if (!state) return cache.delete(TIMER_KEY)
  return cache.put(TIMER_KEY, new Response(JSON.stringify(state)))
}

async function readRestTimer() {
  const cache = await caches.open(TIMER_CACHE)
  const stored = await cache.match(TIMER_KEY)
  if (!stored) return null
  try {
    return await stored.json()
  } catch {
    return null
  }
}

async function showRestNotification(state) {
  await saveRestTimer(null)
  await self.registration.showNotification(state.title, {
    body: state.body,
    icon: '/icon',
    badge: '/icon',
    tag: 'rest-timer',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/dashboard' },
  })
}

/** Fires a deadline that came due while the worker was not running. */
async function catchUpRestTimer() {
  const state = await readRestTimer()
  if (!state || typeof state.endsAt !== 'number') return
  if (state.endsAt > Date.now()) return
  await showRestNotification(state).catch(() => {})
}

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'rest-timer-start') {
    if (restTimerId !== null) clearTimeout(restTimerId)
    const token = ++restTimerToken
    const endsAt = Number(data.endsAt) || 0
    const delay = Math.max(0, endsAt - Date.now())
    const state = {
      endsAt,
      title: String(data.title || 'Rest complete'),
      body: String(data.body || ''),
    }

    event.waitUntil(saveRestTimer(state).catch(() => {}))

    restTimerId = setTimeout(() => {
      if (token !== restTimerToken) return // cancelled
      restTimerId = null
      showRestNotification(state).catch(() => {})
    }, delay)
  }

  if (data.type === 'rest-timer-cancel') {
    if (restTimerId !== null) clearTimeout(restTimerId)
    restTimerId = null
    restTimerToken += 1
    event.waitUntil(saveRestTimer(null).catch(() => {}))
  }

  // Posted when a page regains focus: the worker may have been terminated
  // mid-rest, in which case the deadline has to be noticed on the way back.
  if (data.type === 'rest-timer-check') {
    event.waitUntil(catchUpRestTimer())
  }

  if (data.type === 'clear-private-data') {
    // Only the public /offline shell lives in this cache, but clearing it on
    // sign-out is kept as a guard in case anything private is ever cached
    // here. Re-priming is what was missing: without it the offline fallback
    // vanished at the first sign-out and stayed gone until the worker was
    // reinstalled, so an offline athlete got a browser error page instead.
    event.waitUntil(
      caches
        .delete(PAGES_CACHE)
        .then(() => caches.open(PAGES_CACHE))
        .then((cache) => cache.add(OFFLINE_URL))
        .catch(() => {}),
    )
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
