import { describe, expect, it } from 'vitest'
import { isPublic, isPublicApiRoute } from './proxy'

describe('isPublicApiRoute', () => {
  it('lets link crawlers reach a shared workout card', () => {
    // The regression this guards: the card shipped behind the blanket
    // "/api/ requires a session" rule, so Telegram and Discord got 401 —
    // the exact failure the shared snapshot was built to remove. Access is
    // bounded by the token, not by the session.
    expect(isPublicApiRoute('/api/og/share/0123456789abcdef0123456789abcdef')).toBe(true)
  })

  it('keeps the owner-only card preview behind a session', () => {
    expect(isPublicApiRoute('/api/og/session/11111111-1111-1111-1111-111111111111')).toBe(false)
  })

  it('lets the error reporter through before a session exists', () => {
    expect(isPublicApiRoute('/api/errors')).toBe(true)
  })

  it('leaves every other API route gated', () => {
    for (const path of [
      '/api/sets/queue',
      '/api/workouts/finish-queue',
      '/api/export/csv',
      '/api/og/share',
      '/api/og',
    ]) {
      expect(isPublicApiRoute(path)).toBe(false)
    }
  })
})

describe('isPublic', () => {
  it('serves the sign-in and legal pages to anyone', () => {
    for (const path of ['/login', '/register', '/privacy', '/terms', '/sw.js']) {
      expect(isPublic(path)).toBe(true)
    }
  })

  it('keeps the training pages private', () => {
    for (const path of ['/dashboard', '/history', '/coach', '/profile', '/workout/new']) {
      expect(isPublic(path)).toBe(false)
    }
  })
})
