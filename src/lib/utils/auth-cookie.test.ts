import { describe, expect, it } from 'vitest'
import { hasSupabaseAuthCookie } from './auth-cookie'

describe('hasSupabaseAuthCookie', () => {
  it('recognizes the standard session cookie', () => {
    expect(hasSupabaseAuthCookie(['sb-uxgjsdnpsybnwxkvfxna-auth-token'])).toBe(true)
  })

  it('recognizes a chunked session cookie', () => {
    expect(
      hasSupabaseAuthCookie([
        'sb-uxgjsdnpsybnwxkvfxna-auth-token.0',
        'sb-uxgjsdnpsybnwxkvfxna-auth-token.1',
      ]),
    ).toBe(true)
  })

  it('is false for a visitor carrying only unrelated cookies', () => {
    expect(hasSupabaseAuthCookie(['gymlog_goal', 'theme', 'NEXT_LOCALE'])).toBe(false)
  })

  it('is false with no cookies at all', () => {
    expect(hasSupabaseAuthCookie([])).toBe(false)
  })

  it('does not match a cookie that merely starts with sb-', () => {
    expect(hasSupabaseAuthCookie(['sb-something-else'])).toBe(false)
  })
})
