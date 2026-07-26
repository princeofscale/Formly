/**
 * Whether a request carries a Supabase session cookie.
 *
 * Presence is never treated as proof of authentication. A forged or expired
 * cookie only costs the request the `getUser()` call it would have made
 * anyway, which then fails as it should. The signal is used for one decision
 * only: whether asking Supabase Auth is worth a network round trip. For an
 * anonymous visitor to a public page it is not, and that round trip sits on
 * the critical path ahead of the first byte.
 *
 * Supabase SSR names its cookies `sb-<project-ref>-auth-token`, splitting
 * large sessions into `.0`, `.1` chunks, so the match is on the shape rather
 * than an exact name.
 */
export function hasSupabaseAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => name.startsWith('sb-') && name.includes('-auth-token'))
}
