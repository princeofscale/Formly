// Minimal service worker for PWA installability.
// Caching strategy and push notifications are out of scope for Phase 1.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Pass-through fetch — let the browser handle everything.
// Adding a network-first cache strategy is a future enhancement.
self.addEventListener('fetch', () => {})
