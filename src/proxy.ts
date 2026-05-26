// Next.js 16 "proxy" (formerly known as middleware). Runs ahead of every
// non-static request to verify the Supabase session and gate routes.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_EXACT = new Set<string>([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/confirm',
  '/privacy',
  '/terms',
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|js|css)$).*)',
  ],
}
