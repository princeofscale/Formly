import { describe, it, expect } from 'vitest'
import { sanitizeFilterTerm } from './exercises'

describe('sanitizeFilterTerm', () => {
  it('strips PostgREST filter syntax characters', () => {
    expect(sanitizeFilterTerm('bench,is_custom.eq.true')).toBe('bench is_custom.eq.true')
    expect(sanitizeFilterTerm('squat)or(1=1')).toBe('squat or 1=1')
    expect(sanitizeFilterTerm('press*')).toBe('press')
  })

  it('strips ilike wildcards and escapes', () => {
    expect(sanitizeFilterTerm('%abc%')).toBe('abc')
    expect(sanitizeFilterTerm('x\\y')).toBe('x y')
  })

  it('preserves normal cyrillic and latin', () => {
    expect(sanitizeFilterTerm('жим лёжа')).toBe('жим лёжа')
    expect(sanitizeFilterTerm('bench press')).toBe('bench press')
  })

  it('caps length at 64 chars', () => {
    const long = 'a'.repeat(100)
    expect(sanitizeFilterTerm(long).length).toBe(64)
  })

  it('returns empty for empty/whitespace input', () => {
    expect(sanitizeFilterTerm('')).toBe('')
    expect(sanitizeFilterTerm('   ')).toBe('')
    expect(sanitizeFilterTerm(',()')).toBe('')
  })
})
