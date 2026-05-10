import { describe, it, expect } from 'vitest'
import { detectPRFromHistory } from './pr.service'

describe('detectPRFromHistory', () => {
  it('returns is_pr=true when current > historical best', () => {
    const result = detectPRFromHistory(150, 140)
    expect(result.is_pr).toBe(true)
    expect(result.previous_1rm).toBe(140)
    expect(result.current_1rm).toBe(150)
    expect(result.improvement_pct).toBeCloseTo(7.14, 1)
  })

  it('returns is_pr=false when current <= historical best', () => {
    const result = detectPRFromHistory(130, 140)
    expect(result.is_pr).toBe(false)
  })

  it('returns is_pr=true when no history exists', () => {
    const result = detectPRFromHistory(100, null)
    expect(result.is_pr).toBe(true)
    expect(result.previous_1rm).toBeNull()
  })

  it('returns is_pr=false when equal to historical best', () => {
    const result = detectPRFromHistory(140, 140)
    expect(result.is_pr).toBe(false)
  })
})
