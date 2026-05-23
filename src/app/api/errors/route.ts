// Client-side error sink. Browser-side reporters POST here; we just
// console.error so Vercel's runtime log captures it. No DB write —
// Vercel logs are searchable and free, and storing every JS error from
// every device would be its own analytics burden.
//
// Intentionally NOT auth-gated: errors can happen during register/login
// flows (before a session cookie exists), and we want those just as much
// as logged-in errors.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ErrorBody {
  message?: unknown
  stack?: unknown
  url?: unknown
  userAgent?: unknown
  context?: unknown
}

function asString(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

export async function POST(request: Request) {
  let body: ErrorBody
  try {
    body = (await request.json()) as ErrorBody
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const payload = {
    message: asString(body.message, 500) || '(no message)',
    stack: asString(body.stack, 2000),
    url: asString(body.url, 300),
    ua: asString(body.userAgent, 200),
    context: asString(body.context, 100),
  }

  // Vercel captures stderr from API routes; `console.error` shows up in
  // the project's Runtime Logs (vercel.com → project → Logs).
  console.error('[client-error]', JSON.stringify(payload))

  return NextResponse.json({ ok: true })
}
