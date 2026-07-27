import { describe, it, expect } from 'vitest'
import { calculateWarmupSets, dropWarmupSets, type LoggedSetShape } from './warmup.service'

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

describe('dropWarmupSets', () => {
  let minute = 0
  const set = (weight: number, extra: Partial<LoggedSetShape> = {}): LoggedSetShape => ({
    session_id: 's1',
    exercise_id: 'bench',
    weight_kg: weight,
    created_at: `2026-07-27T10:${String(minute++).padStart(2, '0')}:00+00:00`,
    ...extra,
  })

  it('drops a hand-logged ramp and keeps the working sets', () => {
    minute = 0
    const sets = [set(50), set(70), set(85), set(100), set(100), set(100)]
    expect(dropWarmupSets(sets).map((s) => s.weight_kg)).toEqual([70, 85, 100, 100, 100])
  })

  it('drops flagged warm-ups whatever the weight', () => {
    minute = 0
    const sets = [set(100, { is_warmup: true }), set(100)]
    expect(dropWarmupSets(sets)).toHaveLength(1)
  })

  it('keeps back-off sets logged after the top set', () => {
    minute = 0
    const sets = [set(100), set(100), set(50)]
    expect(dropWarmupSets(sets).map((s) => s.weight_kg)).toEqual([100, 100, 50])
  })

  it('keeps every set when nothing carries a weight', () => {
    minute = 0
    const sets = [set(0), set(0), set(0)]
    expect(dropWarmupSets(sets)).toHaveLength(3)
  })

  it('judges each exercise and session on its own top weight', () => {
    minute = 0
    const sets = [
      set(30, { exercise_id: 'curl' }),
      set(50, { exercise_id: 'curl' }),
      set(50),
      set(100),
      set(50, { session_id: 's2' }),
    ]
    // 30kg is a ramp for curls (top 50); 50kg is a ramp for bench (top 100);
    // the lone 50kg bench set in another session is its own top weight.
    expect(dropWarmupSets(sets).map((s) => `${s.exercise_id}:${s.weight_kg}`)).toEqual([
      'curl:50',
      'bench:100',
      'bench:50',
    ])
  })
})
