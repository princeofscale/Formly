import { describe, it, expect } from 'vitest'
import { detectPRFromHistory } from './pr.service'

describe('detectPRFromHistory', () => {
  it('returns is_pr=true when current > historical best', () => {
    const result = detectPRFromHistory(150, 140)
    expect(result.is_pr).toBe(true)
    expect(result.previous_best).toBe(140)
    expect(result.current_best).toBe(150)
    expect(result.improvement_pct).toBeCloseTo(7.14, 1)
  })

  it('returns is_pr=false when current <= historical best', () => {
    const result = detectPRFromHistory(130, 140)
    expect(result.is_pr).toBe(false)
  })

  it('does not celebrate the first-ever result — it only sets the baseline', () => {
    const result = detectPRFromHistory(100, null)
    expect(result.is_pr).toBe(false)
    expect(result.previous_best).toBeNull()
    expect(result.current_best).toBe(100)
  })

  it('returns is_pr=false when equal to historical best', () => {
    const result = detectPRFromHistory(140, 140)
    expect(result.is_pr).toBe(false)
  })
})
