import { describe, it, expect } from 'vitest'
import { normalizeQuery, matchesChip, filterExercises } from './exercise-filter'
import type { Exercise } from '@/lib/types/models'

let seq = 0
function ex(overrides: Partial<Exercise>): Exercise {
  seq += 1
  return {
    id: `id-${seq}`,
    name: 'Exercise',
    slug: `exercise-${seq}`,
    primary_muscle: 'chest',
    secondary_muscles: [],
    mechanic: 'compound',
    equipment: 'barbell',
    is_custom: false,
    created_by: null,
    name_ru: null,
    aliases: [],
    ...overrides,
  }
}

const bench = ex({ name: 'Barbell Bench Press', name_ru: 'Жим лёжа', primary_muscle: 'chest' })
const military = ex({
  name: 'Standing Military Press',
  name_ru: 'Армейский жим',
  primary_muscle: 'front_delts',
})
const hack = ex({
  name: 'Hack Squat',
  name_ru: 'Гакк-приседания в тренажёре',
  primary_muscle: 'quads',
  aliases: ['гакк', 'гак присед'],
})
const catalog = [military, bench, hack]

describe('normalizeQuery', () => {
  it('lowercases, trims and folds ё to е', () => {
    expect(normalizeQuery('  ЖИМ ЛЁЖА ')).toBe('жим лежа')
  })
})

describe('matchesChip', () => {
  it('all matches everything', () => {
    expect(matchesChip(bench, 'all')).toBe(true)
    expect(matchesChip(hack, 'all')).toBe(true)
  })

  it('maps coarse chips onto primary muscles', () => {
    expect(matchesChip(bench, 'chest')).toBe(true)
    expect(matchesChip(military, 'shoulders')).toBe(true)
    expect(matchesChip(hack, 'legs')).toBe(true)
    expect(matchesChip(bench, 'back')).toBe(false)
  })
})

describe('filterExercises', () => {
  it('matches name_ru case-insensitively with ё folding', () => {
    expect(filterExercises(catalog, 'ЖИМ ЛЕЖА', 'all')).toEqual([bench])
  })

  it('matches aliases', () => {
    expect(filterExercises(catalog, 'гакк', 'all')).toEqual([hack])
  })

  it('ranks prefix matches above substring matches', () => {
    expect(filterExercises(catalog, 'жим', 'all')).toEqual([bench, military])
  })

  it('respects the muscle chip', () => {
    expect(filterExercises(catalog, 'жим', 'shoulders')).toEqual([military])
  })

  it('applies the limit', () => {
    expect(filterExercises(catalog, 'жим', 'all', 1)).toEqual([bench])
  })

  it('returns [] for queries shorter than 2 chars', () => {
    expect(filterExercises(catalog, 'ж', 'all')).toEqual([])
    expect(filterExercises(catalog, '  ', 'all')).toEqual([])
  })
})
