import { describe, it, expect } from 'vitest'
import {
  mapMuscle,
  mapEquipment,
  mapMechanic,
  slugify,
  sqlQuote,
  sqlTextArray,
  isImportable,
  toImportedRow,
  type SourceExercise,
} from './exercise-import'

function src(overrides: Partial<SourceExercise> = {}): SourceExercise {
  return {
    name: 'Barbell Bench Press',
    mechanic: 'compound',
    equipment: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'strength',
    instructions: ['Lie on the bench.', 'Press up.'],
    images: ['Barbell_Bench_Press/0.jpg', 'Barbell_Bench_Press/1.jpg'],
    ...overrides,
  }
}

describe('mapMuscle', () => {
  it('maps known source muscles to our enum', () => {
    expect(mapMuscle('abdominals')).toBe('core')
    expect(mapMuscle('quadriceps')).toBe('quads')
    expect(mapMuscle('lower back')).toBe('back')
    expect(mapMuscle('shoulders')).toBe('side_delts')
  })

  it('returns null for unknown muscles', () => {
    expect(mapMuscle('tongue')).toBeNull()
  })
})

describe('mapEquipment', () => {
  it('maps known equipment', () => {
    expect(mapEquipment('body only')).toBe('bodyweight')
    expect(mapEquipment('e-z curl bar')).toBe('ez_bar')
    expect(mapEquipment('kettlebells')).toBe('kettlebell')
  })

  it('falls back to other for unknown/null', () => {
    expect(mapEquipment('medicine ball')).toBe('other')
    expect(mapEquipment(null)).toBe('other')
  })
})

describe('mapMechanic', () => {
  it('keeps isolation, defaults everything else to compound', () => {
    expect(mapMechanic('isolation')).toBe('isolation')
    expect(mapMechanic('compound')).toBe('compound')
    expect(mapMechanic(null)).toBe('compound')
  })
})

describe('slugify', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slugify('Barbell Bench Press')).toBe('barbell-bench-press')
    expect(slugify('3/4 Sit-Up')).toBe('3-4-sit-up')
    expect(slugify("Farmer's Walk")).toBe('farmer-s-walk')
  })
})

describe('sqlQuote / sqlTextArray', () => {
  it('escapes single quotes', () => {
    expect(sqlQuote("Farmer's Walk")).toBe("'Farmer''s Walk'")
  })

  it('renders empty and non-empty text arrays', () => {
    expect(sqlTextArray([])).toBe("'{}'::text[]")
    expect(sqlTextArray(["a'b", 'c'])).toBe("array['a''b','c']::text[]")
  })
})

describe('isImportable', () => {
  it('accepts strength exercises with mappable primary muscle', () => {
    expect(isImportable(src())).toBe(true)
  })

  it('rejects skipped categories and unmappable primaries', () => {
    expect(isImportable(src({ category: 'stretching' }))).toBe(false)
    expect(isImportable(src({ category: 'cardio' }))).toBe(false)
    expect(isImportable(src({ primaryMuscles: ['tongue'] }))).toBe(false)
  })
})

describe('toImportedRow', () => {
  it('maps a full row with RU data', () => {
    const row = toImportedRow(src(), {
      name_ru: 'Жим штанги лёжа',
      aliases: ['Бенч ', 'жим лежа'],
    })
    expect(row.slug).toBe('barbell-bench-press')
    expect(row.primary_muscle).toBe('chest')
    expect(row.secondary_muscles).toEqual(['triceps', 'side_delts'])
    expect(row.name_ru).toBe('Жим штанги лёжа')
    expect(row.aliases).toEqual(['бенч', 'жим лежа'])
    expect(row.instructions_en).toBe('Lie on the bench.\nPress up.')
    expect(row.image_urls[0]).toBe(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg',
    )
  })

  it('honors primary_muscle override and drops secondary equal to primary', () => {
    const row = toImportedRow(src({ secondaryMuscles: ['chest', 'triceps'] }), {
      name_ru: 'Жим',
      primary_muscle: 'chest',
    })
    expect(row.primary_muscle).toBe('chest')
    expect(row.secondary_muscles).toEqual(['triceps'])
  })

  it('deduplicates secondary muscles that map to the same value', () => {
    const row = toImportedRow(src({ secondaryMuscles: ['lower back', 'middle back'] }), {
      name_ru: 'Жим',
    })
    expect(row.secondary_muscles).toEqual(['back'])
  })
})
