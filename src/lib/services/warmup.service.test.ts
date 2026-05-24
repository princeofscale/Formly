import { describe, it, expect } from 'vitest'
import { calculateWarmupSets } from './warmup.service'

describe('calculateWarmupSets', () => {
  it('returns 3 sets for a 100kg working weight using 5kg steps', () => {
    const sets = calculateWarmupSets(100)
    expect(sets).toEqual([
      { weightKg: 50, reps: 8 },
      { weightKg: 70, reps: 5 },
      { weightKg: 85, reps: 3 },
    ])
  })

  it('uses 2.5kg steps when working weight is below 100kg', () => {
    // 82.5kg: 50%=41.25→42.5, 70%=57.75→57.5, 85%=70.125→70
    const sets = calculateWarmupSets(82.5)
    expect(sets.map((s) => s.weightKg)).toEqual([42.5, 57.5, 70])
  })

  it('uses 5kg steps when working weight is at or above 100kg', () => {
    // 140kg: 50%=70, 70%=98→100, 85%=119→120
    const sets = calculateWarmupSets(140)
    expect(sets.map((s) => s.weightKg)).toEqual([70, 100, 120])
  })

  it('returns no warmups for working weights below 30kg', () => {
    expect(calculateWarmupSets(20)).toEqual([])
    expect(calculateWarmupSets(29.9)).toEqual([])
    expect(calculateWarmupSets(0)).toEqual([])
  })

  it('handles non-finite input gracefully', () => {
    expect(calculateWarmupSets(NaN)).toEqual([])
    expect(calculateWarmupSets(Infinity)).toEqual([])
  })

  it('keeps rep counts descending across the ramp', () => {
    const sets = calculateWarmupSets(100)
    expect(sets.map((s) => s.reps)).toEqual([8, 5, 3])
  })
})
