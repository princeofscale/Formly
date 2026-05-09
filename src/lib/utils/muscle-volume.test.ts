import { describe, it, expect } from 'vitest'
import { calculateSessionVolume } from './muscle-volume'
import type { Exercise, SetEntry } from '@/lib/types/models'

const benchPress: Exercise = {
  id: 'ex1', name: 'Barbell Bench Press', slug: 'barbell-bench-press',
  primary_muscle: 'chest', secondary_muscles: ['triceps', 'front_delts'],
  mechanic: 'compound', equipment: 'barbell', is_custom: false, created_by: null,
}

const squat: Exercise = {
  id: 'ex2', name: 'Barbell Squat', slug: 'barbell-squat',
  primary_muscle: 'quads', secondary_muscles: ['hamstrings', 'glutes'],
  mechanic: 'compound', equipment: 'barbell', is_custom: false, created_by: null,
}

function makeSets(exerciseId: string, count: number): SetEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${exerciseId}-${i}`, session_id: 's1', user_id: 'u1',
    exercise_id: exerciseId, set_number: i + 1,
    weight_kg: 80, reps: 8, rpe: null, calculated_1rm: null,
    rest_seconds: null, created_at: new Date().toISOString(),
  }))
}

describe('calculateSessionVolume', () => {
  it('returns empty array for no exercises', () => {
    expect(calculateSessionVolume([])).toEqual([])
  })

  it('credits 1.0 set per set to primary muscle', () => {
    const result = calculateSessionVolume([{ exercise: benchPress, sets: makeSets('ex1', 3) }])
    expect(result.find(m => m.muscle === 'chest')?.total_sets).toBe(3)
  })

  it('credits 0.5 sets per set to each secondary muscle', () => {
    const result = calculateSessionVolume([{ exercise: benchPress, sets: makeSets('ex1', 4) }])
    expect(result.find(m => m.muscle === 'triceps')?.total_sets).toBe(2)
    expect(result.find(m => m.muscle === 'front_delts')?.total_sets).toBe(2)
  })

  it('accumulates volume across multiple exercises', () => {
    const result = calculateSessionVolume([
      { exercise: benchPress, sets: makeSets('ex1', 3) },
      { exercise: squat, sets: makeSets('ex2', 4) },
    ])
    expect(result.find(m => m.muscle === 'chest')?.total_sets).toBe(3)
    expect(result.find(m => m.muscle === 'quads')?.total_sets).toBe(4)
    expect(result.find(m => m.muscle === 'hamstrings')?.total_sets).toBe(2)
    expect(result.find(m => m.muscle === 'glutes')?.total_sets).toBe(2)
  })
})
