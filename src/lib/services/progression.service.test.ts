import { describe, it, expect } from 'vitest'
import { getProgressionSuggestion } from './progression.service'
import type { SetEntry } from '@/lib/types/models'

function makeSet(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: '1', session_id: 's1', user_id: 'u1', exercise_id: 'e1',
    set_number: 1, weight_kg: 80, reps: 10, rpe: null,
    calculated_1rm: null, rest_seconds: null,
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
