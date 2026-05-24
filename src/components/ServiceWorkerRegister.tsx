'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Watch for a new SW installing. If one becomes 'installed' while a
        // controller is already present, this is an *update* (not first install)
        // and we surface it to UpdateBanner via a window event.
        reg.addEventListener('updatefound', () => {
          const incoming = reg.installing
          if (!incoming) return
          incoming.addEventListener('statechange', () => {
            if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('trainingar:sw-update'))
            }
          })
        })
      })
      .catch((err) => {
        console.error('[SW] registration failed:', err)
      })
  }, [])

  return null
}
