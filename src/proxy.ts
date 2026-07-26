// Next.js 16 "proxy" (formerly known as middleware). Runs ahead of every
// non-static request to verify the Supabase session and gate routes.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasSupabaseAuthCookie } from '@/lib/utils/auth-cookie'

const PUBLIC_EXACT = new Set<string>([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/confirm',
  '/privacy',
  '/terms',
  // The service worker caches this at install time, before anyone has signed
  // in. Gating it sent that fetch to /login, and the Cache API refuses to
  // store a redirected response — so the offline fallback was never cached at
  // all, and the failure was swallowed by the install handler's catch.
  '/offline',
  '/manifest.webmanifest',
  '/icon',
  '/apple-icon',
  '/favicon.ico',
  '/sw.js',
])

function isAuthRoute(path: string): boolean {
  // Redirect logged-in users away from these. /reset-password is
  // intentionally excluded: a recovery-session user IS logged in but
  // needs to land there to finish setting a new password.
  return path === '/login' || path === '/register' || path === '/forgot-password'
}

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true
  if (path.startsWith('/login/') || path.startsWith('/register/')) return true
  if (path.startsWith('/privacy/') || path.startsWith('/terms/')) return true
  return false
}

function isCronRoute(path: string): boolean {
  return path.startsWith('/api/cron/')
}

function isPublicApiRoute(path: string): boolean {
  // Client-side error reporter — errors can happen on /login or /register
  // before a session cookie exists, so we never gate it on auth.
  return path === '/api/errors'
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Cron routes authenticate via Bearer CRON_SECRET in the route handler.
  // The session check below would 401 them before they reach that handler.
  if (isCronRoute(path) || isPublicApiRoute(path)) return NextResponse.next({ request })

  // A visitor with no session cookie has nothing to verify, and `getUser()`
  // is a network call to Supabase Auth that blocks the first byte. On a public
  // page it bought nothing and dominated the measured TTFB on /login.
  //
  // This is not an authorization shortcut: the branch is only taken for paths
  // that isPublic() already lets through unauthenticated. Everything else,
  // including every /api/ route, still goes through the check below, and a
  // request that forges the cookie merely ends up in that same check.
  if (isPublic(path) && !hasSupabaseAuthCookie(request.cookies.getAll().map(({ name }) => name))) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Timed because this is the one blocking network call ahead of the first
  // byte, and guessing at its cost is how it went unnoticed for so long. The
  // header is diagnostic only and carries no user data.
  const authStartedAt = performance.now()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  const authDuration = Math.round(performance.now() - authStartedAt)

  if (authError && authError.name !== 'AuthSessionMissingError') {
    console.error('[proxy] Supabase auth error:', authError.message)
  }

  if (!user && path.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user && !isPublic(path)) {
    return NextResponse.redirect(new URL('/login', request.nextUrl.origin))
  }

  if (user && isAuthRoute(path)) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
  }

  if (user) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store')
  }

  supabaseResponse.headers.set('Server-Timing', `supabase-auth;dur=${authDuration}`)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|js|css)$).*)',
  ],
}
