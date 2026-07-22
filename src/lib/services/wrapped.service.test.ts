import { describe, it, expect } from 'vitest'
import { isWrappedSeason, wrappedYear } from './wrapped.service'

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 12))

describe('isWrappedSeason', () => {
  it('opens on December 15', () => {
    expect(isWrappedSeason(utc(2026, 11, 14))).toBe(false)
    expect(isWrappedSeason(utc(2026, 11, 15))).toBe(true)
    expect(isWrappedSeason(utc(2026, 11, 31))).toBe(true)
  })

  it('closes after January 15', () => {
    expect(isWrappedSeason(utc(2027, 0, 1))).toBe(true)
    expect(isWrappedSeason(utc(2027, 0, 15))).toBe(true)
    expect(isWrappedSeason(utc(2027, 0, 16))).toBe(false)
  })

  it('is hidden the rest of the year', () => {
    expect(isWrappedSeason(utc(2026, 6, 22))).toBe(false)
    expect(isWrappedSeason(utc(2026, 10, 30))).toBe(false)
  })
})

describe('wrappedYear', () => {
  it('covers the current year in December', () => {
    expect(wrappedYear(utc(2026, 11, 20))).toBe(2026)
  })

  it('covers the year that just ended in January', () => {
    expect(wrappedYear(utc(2027, 0, 10))).toBe(2026)
  })
})
