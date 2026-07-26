import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relative-time'

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-07-24T12:00:00.000Z')

  it('formats recent English activity', () => {
    expect(formatRelativeTime('2026-07-24T11:55:00.000Z', 'en', now)).toBe('5 min. ago')
  })

  it('formats recent Russian activity', () => {
    expect(formatRelativeTime('2026-07-24T10:00:00.000Z', 'ru', now)).toBe('2 ч назад')
  })

  it('handles relative-time boundaries', () => {
    expect(formatRelativeTime('2026-07-24T12:00:00.000Z', 'en', now)).toBe('now')
    expect(formatRelativeTime('2026-07-24T11:00:00.000Z', 'en', now)).toBe('1 hr. ago')
    expect(formatRelativeTime('2026-07-23T12:00:00.000Z', 'en', now)).toBe('yesterday')
  })
})
