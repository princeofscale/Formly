// Client-side error sink. Browser-side reporters POST here; we just
// console.error so Vercel's runtime log captures it. No DB write —
// Vercel logs are searchable and free, and storing every JS error from
// every device would be its own analytics burden.
//
// Intentionally NOT auth-gated: errors can happen during register/login
// flows (before a session cookie exists), and we want those just as much
// as logged-in errors.

import { NextResponse } from 'next/server'
import { redactSensitiveText, sanitizeReportedUrl } from '@/lib/security/client-error'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 8_192
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const ALWAYS_LOG_FIRST = 5
const buckets = new Map<string, { startedAt: number; count: number; seen: Map<string, number> }>()

interface ErrorBody {
  message?: unknown
  stack?: unknown
  url?: unknown
  context?: unknown
}

function asString(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

function fingerprint(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function shouldLog(ip: string, signature: string, now = Date.now()) {
  let bucket = buckets.get(ip)
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    bucket = { startedAt: now, count: 0, seen: new Map() }
    buckets.set(ip, bucket)
  }

  const lastSeen = bucket.seen.get(signature)
  if (lastSeen && now - lastSeen < WINDOW_MS) return 'duplicate'
  if (bucket.count >= MAX_PER_WINDOW) return 'limited'

  bucket.count += 1
  bucket.seen.set(signature, now)
  if (bucket.count > ALWAYS_LOG_FIRST && fingerprint(signature) % 4 !== 0) return 'sampled'
  return 'log'
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 })
  }

  let body: ErrorBody
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 })
    }
    body = JSON.parse(raw) as ErrorBody
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const payload = {
    message: redactSensitiveText(asString(body.message, 500)) || '(no message)',
    stack: redactSensitiveText(asString(body.stack, 2000)),
    url: sanitizeReportedUrl(body.url),
    context: asString(body.context, 100),
  }

  const ip = asString(
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown',
    64,
  )
  const decision = shouldLog(ip, `${payload.context}:${payload.message}:${payload.stack}`)
  if (decision === 'limited') {
    return NextResponse.json({ ok: false }, { status: 429 })
  }
  if (decision !== 'log') {
    return NextResponse.json({ ok: true }, { status: 202 })
  }

  // Vercel captures stderr from API routes; `console.error` shows up in
  // the project's Runtime Logs (vercel.com → project → Logs).
  console.error('[client-error]', JSON.stringify(payload))

  return NextResponse.json({ ok: true })
}
