import { describe, it, expect } from 'vitest'
import { calculate1RM, selectFormula } from './one-rep-max'

describe('selectFormula', () => {
  it('uses brzycki for reps < 10', () => {
    expect(selectFormula(1)).toBe('brzycki')
    expect(selectFormula(9)).toBe('brzycki')
  })

  it('uses epley for reps >= 10', () => {
    expect(selectFormula(10)).toBe('epley')
    expect(selectFormula(20)).toBe('epley')
  })
})

describe('calculate1RM', () => {
  it('returns weight as-is for 1 rep', () => {
    expect(calculate1RM(100, 1)).toBeCloseTo(100, 1)
  })

  it('uses Brzycki for 5 reps: 100kg × 5 ≈ 112.5', () => {
    // 100 / (1.0278 - 0.0278 × 5) = 100 / 0.8888
    expect(calculate1RM(100, 5)).toBeCloseTo(112.5, 0)
  })

  it('uses Epley for 10 reps: 80kg × 10 ≈ 106.6', () => {
    // 80 × (1 + 0.0333 × 10) = 80 × 1.333
    expect(calculate1RM(80, 10)).toBeCloseTo(106.6, 0)
  })

  it('higher reps at same weight yields higher 1RM estimate', () => {
    expect(calculate1RM(60, 12)).toBeGreaterThan(calculate1RM(60, 8))
  })

  it('throws for zero weight', () => {
    expect(() => calculate1RM(0, 5)).toThrow('Weight must be positive')
  })

  it('throws for negative weight', () => {
    expect(() => calculate1RM(-10, 5)).toThrow('Weight must be positive')
  })

  it('throws for zero reps', () => {
    expect(() => calculate1RM(100, 0)).toThrow('Reps must be positive')
  })
})
