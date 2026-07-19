import { describe, it, expect } from 'vitest'
import { serializeCatalog, parseSuggestions, type CatalogEntry } from './exercise-suggest.service'

const catalog: CatalogEntry[] = [
  {
    name: 'Barbell Bench Press',
    name_ru: 'Жим штанги лёжа',
    primary_muscle: 'chest',
    equipment: 'barbell',
  },
  { name: 'Weird|Name', name_ru: null, primary_muscle: 'back', equipment: 'machine' },
]

describe('serializeCatalog', () => {
  it('numbers lines from 1 and joins fields with pipes', () => {
    const lines = serializeCatalog(catalog).split('\n')
    expect(lines[0]).toBe('1|Barbell Bench Press|Жим штанги лёжа|chest|barbell')
  })

  it('strips pipes from names and renders null name_ru as empty', () => {
    const lines = serializeCatalog(catalog).split('\n')
    expect(lines[1]).toBe('2|Weird Name||back|machine')
  })
})

describe('parseSuggestions', () => {
  it('keeps valid picks, capped at 3', () => {
    const raw = JSON.stringify({
      items: [
        { index: 1, reason: 'a' },
        { index: 2, reason: 'b' },
        { index: 3, reason: 'c' },
        { index: 4, reason: 'd' },
      ],
    })
    expect(parseSuggestions(raw, 10)).toHaveLength(3)
  })

  it('drops out-of-range, duplicate and non-integer indices', () => {
    const raw = JSON.stringify({
      items: [
        { index: 0, reason: 'a' },
        { index: 11, reason: 'b' },
        { index: 2.5, reason: 'c' },
        { index: 3, reason: 'ok' },
        { index: 3, reason: 'dup' },
      ],
    })
    expect(parseSuggestions(raw, 10)).toEqual([{ index: 3, reason: 'ok' }])
  })

  it('returns [] for garbage JSON or missing items', () => {
    expect(parseSuggestions('not json', 10)).toEqual([])
    expect(parseSuggestions('{"foo":1}', 10)).toEqual([])
  })

  it('coerces non-string reasons to empty string', () => {
    const raw = JSON.stringify({ items: [{ index: 1, reason: 42 }] })
    expect(parseSuggestions(raw, 10)).toEqual([{ index: 1, reason: '' }])
  })
})
