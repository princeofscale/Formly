'use client'

// Mirrors what Sentry's browser SDK does at the bare minimum: catch
// uncaught errors + unhandled promise rejections and POST them to a
// server endpoint so they surface in Vercel runtime logs.
//
// Per-session report cap prevents a render-loop bug from spamming
// the endpoint and chewing through free-tier function invocations.

import { useEffect } from 'react'

const MAX_REPORTS_PER_SESSION = 10
const COUNTER_KEY = 'trainingar:err-count'

function readCount(): number {
  try {
    const raw = sessionStorage.getItem(COUNTER_KEY)
    if (!raw) return 0
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function incrementCount(): number {
  const next = readCount() + 1
  try {
    sessionStorage.setItem(COUNTER_KEY, String(next))
  } catch {
    // sessionStorage unavailable (Safari private mode, etc.) — just
    // skip rate-limiting; the worst case is some extra log lines.
  }
  return next
}

function send(payload: { message: string; stack?: string; context: string }): void {
  if (incrementCount() > MAX_REPORTS_PER_SESSION) return
  try {
    void fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        url: location.href,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Network completely unavailable — give up silently
  }
}

export function ClientErrorReporter() {
  useEffect(() => {
    function onError(e: ErrorEvent) {
      send({
        message: e.message || 'Unknown error',
        stack: e.error instanceof Error ? e.error.stack : undefined,
        context: 'window.error',
      })
    }

    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason
      send({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        context: 'unhandledrejection',
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
