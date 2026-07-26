import { describe, expect, it } from 'vitest'
import { isCardData, formatCardDate } from './workout-share.service'

describe('isCardData', () => {
  const valid = {
    dateLabel: 'Sat, 26 Jul 2026',
    totalVolumeKg: 8200,
    totalSets: 18,
    totalReps: 142,
    durationMinutes: 63,
    prCount: 1,
    deltaTonnagePct: 4.2,
    topExercises: [{ id: 'a', name: 'Жим лёжа', volume: 3200 }],
  }

  it('accepts a snapshot the card can render', () => {
    expect(isCardData(valid)).toBe(true)
  })

  it('accepts a snapshot with no comparison and no duration', () => {
    expect(isCardData({ ...valid, deltaTonnagePct: null, durationMinutes: null })).toBe(true)
  })

  it('rejects anything the public route cannot render', () => {
    // The value arrives from a jsonb column, so it is untrusted input rather
    // than something the type system has already guaranteed.
    expect(isCardData(null)).toBe(false)
    expect(isCardData('a string')).toBe(false)
    expect(isCardData({})).toBe(false)
    expect(isCardData({ ...valid, totalVolumeKg: '8200' })).toBe(false)
    expect(isCardData({ ...valid, topExercises: 'none' })).toBe(false)
  })
})

describe('formatCardDate', () => {
  it('renders a stable label regardless of the reader locale', () => {
    // The snapshot is written once and served to anyone; the label must not
    // depend on whoever happens to be loading the card.
    expect(formatCardDate('2026-07-26T09:30:00.000Z')).toMatch(/2026/)
    expect(formatCardDate('2026-07-26T09:30:00.000Z')).toBe(
      formatCardDate('2026-07-26T09:30:00.000Z'),
    )
  })
})
