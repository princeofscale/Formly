import { describe, it, expect } from 'vitest'
import { calculatePlates } from './plate-calculator'

describe('calculatePlates', () => {
  it('calculates plates for 100kg with 20kg bar', () => {
    // 100 - 20 = 80kg total, 40kg per side
    // 40 = 1×25 + 1×10 + 1×5
    const result = calculatePlates(100, 20)
    expect(result).toEqual([
      { weight: 25, count: 1 },
      { weight: 10, count: 1 },
      { weight: 5, count: 1 },
    ])
  })

  it('handles weight equal to bar weight', () => {
    expect(calculatePlates(20, 20)).toEqual([])
  })

  it('calculates plates for 60kg with 20kg bar', () => {
    // 60 - 20 = 40, per side = 20
    // 20 = 1×20
    const result = calculatePlates(60, 20)
    expect(result).toEqual([{ weight: 20, count: 1 }])
  })

  it('calculates plates for 142.5kg with 20kg bar', () => {
    // 142.5 - 20 = 122.5, per side = 61.25
    // 61.25 = 2×25 + 1×10 + 1×1.25
    const result = calculatePlates(142.5, 20)
    expect(result).toEqual([
      { weight: 25, count: 2 },
      { weight: 10, count: 1 },
      { weight: 1.25, count: 1 },
    ])
  })
})
