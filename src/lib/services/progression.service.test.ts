import { describe, it, expect } from 'vitest'
import { getProgressionSuggestion, suggestNextSet } from './progression.service'
import type { SetEntry } from '@/lib/types/models'

function makeSet(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: '1',
    session_id: 's1',
    user_id: 'u1',
    exercise_id: 'e1',
    set_number: 1,
    weight_kg: 80,
    reps: 10,
    rpe: null,
    calculated_1rm: null,
    rest_seconds: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getProgressionSuggestion', () => {
  it('suggests weight increase when all sets hit top of rep range', () => {
    const sets = [makeSet({ reps: 12 }), makeSet({ reps: 12 }), makeSet({ reps: 12 })]
    const result = getProgressionSuggestion(sets, 'e1', 'Bench Press', 8, 12)
    expect(result).not.toBeNull()
    expect(result!.suggested_weight_kg).toBeCloseTo(82.5, 0)
  })

  it('returns null when not all sets hit top of rep range', () => {
    const sets = [makeSet({ reps: 12 }), makeSet({ reps: 10 }), makeSet({ reps: 8 })]
    const result = getProgressionSuggestion(sets, 'e1', 'Bench Press', 8, 12)
    expect(result).toBeNull()
  })

  it('returns null for empty sets', () => {
    expect(getProgressionSuggestion([], 'e1', 'Bench Press', 8, 12)).toBeNull()
  })

  it('suggests 5kg increase for heavy lifts (>= 100kg)', () => {
    const sets = [makeSet({ weight_kg: 100, reps: 5 }), makeSet({ weight_kg: 100, reps: 5 })]
    const result = getProgressionSuggestion(sets, 'e1', 'Squat', 3, 5)
    expect(result).not.toBeNull()
    expect(result!.suggested_weight_kg).toBeCloseTo(105, 0)
  })
})

describe('suggestNextSet — deltaKg', () => {
  it('reports a positive delta when the weight goes up', () => {
    const result = suggestNextSet([makeSet({ weight_kg: 80, reps: 10, rpe: 6 })])
    expect(result).not.toBeNull()
    expect(result!.action).toBe('increase')
    expect(result!.weightKg).toBeCloseTo(82.5, 2)
    expect(result!.deltaKg).toBeCloseTo(2.5, 2)
  })

  it('reports a zero delta when the weight holds', () => {
    const result = suggestNextSet([makeSet({ weight_kg: 80, reps: 10, rpe: 9 })])
    expect(result).not.toBeNull()
    expect(result!.action).toBe('hold')
    expect(result!.weightKg).toBeCloseTo(80, 2)
    expect(result!.deltaKg).toBe(0)
  })

  it('reports a negative delta when deloading', () => {
    const result = suggestNextSet([makeSet({ weight_kg: 80, reps: 10, rpe: 10 })])
    expect(result).not.toBeNull()
    expect(result!.action).toBe('deload')
    expect(result!.weightKg).toBeCloseTo(77.5, 2)
    expect(result!.deltaKg).toBeCloseTo(-2.5, 2)
  })

  it('keeps deltaKg consistent with weightKg minus the last weight', () => {
    const result = suggestNextSet([makeSet({ weight_kg: 120, reps: 10, rpe: 7 })])
    expect(result).not.toBeNull()
    expect(result!.deltaKg).toBeCloseTo(result!.weightKg - result!.lastWeight, 2)
    expect(result!.deltaKg).toBeCloseTo(5, 2)
  })
})
