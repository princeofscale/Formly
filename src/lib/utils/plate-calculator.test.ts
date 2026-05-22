import { describe, it, expect } from 'vitest'
import { calculatePlates } from './plate-calculator'

describe('calculatePlates', () => {
  it('calculates plates for 100kg with 20kg bar', () => {
    // 100 - 20 = 80kg total, 40kg per side
    // 40 = 1×25 + 1×15
    const result = calculatePlates(100, 20)
    expect(result.plates).toEqual([
      { weight: 25, count: 1 },
      { weight: 15, count: 1 },
    ])
    expect(result.belowBar).toBe(false)
    expect(result.leftover).toBe(0)
    expect(result.loadedPerSide).toBe(40)
  })

  it('handles weight equal to bar weight', () => {
    const result = calculatePlates(20, 20)
    expect(result.plates).toEqual([])
    expect(result.belowBar).toBe(false)
    expect(result.loadedPerSide).toBe(0)
  })

  it('flags belowBar when target is lighter than the bar', () => {
    const result = calculatePlates(15, 20)
    expect(result.belowBar).toBe(true)
    expect(result.plates).toEqual([])
  })

  it('calculates plates for 60kg with 20kg bar', () => {
    // 60 - 20 = 40, per side = 20 → one 20kg plate
    const result = calculatePlates(60, 20)
    expect(result.plates).toEqual([{ weight: 20, count: 1 }])
    expect(result.leftover).toBe(0)
  })

  it('calculates plates for 142.5kg with 20kg bar', () => {
    // 142.5 - 20 = 122.5, per side = 61.25
    // 61.25 = 2×25 + 1×10 + 1×1.25
    const result = calculatePlates(142.5, 20)
    expect(result.plates).toEqual([
      { weight: 25, count: 2 },
      { weight: 10, count: 1 },
      { weight: 1.25, count: 1 },
    ])
    expect(result.leftover).toBe(0)
  })

  it('reports leftover when target is not divisible by available plates', () => {
    // 20 + 2*(0.3) = 20.6 → 0.3/side, nothing in plate set (smallest is 0.5)
    const result = calculatePlates(20.6, 20)
    expect(result.plates).toEqual([])
    expect(result.leftover).toBeGreaterThan(0)
  })
})
