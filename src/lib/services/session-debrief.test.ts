import { describe, it, expect } from 'vitest'
import { normalizeDebriefItems } from './session-debrief.service'

describe('normalizeDebriefItems', () => {
  it('keeps legacy plain strings cached before evidence existed', () => {
    expect(normalizeDebriefItems(['Объём вырос на 12%'])).toEqual([{ text: 'Объём вырос на 12%' }])
  })

  it('keeps the evidence line of a structured point', () => {
    expect(normalizeDebriefItems([{ text: 'Жим лёжа — рекорд', evidence: '82,5 кг × 8' }])).toEqual(
      [{ text: 'Жим лёжа — рекорд', evidence: '82,5 кг × 8' }],
    )
  })

  it('accepts a structured point with no evidence', () => {
    expect(normalizeDebriefItems([{ text: 'Средний RPE 7,8' }])).toEqual([
      { text: 'Средний RPE 7,8' },
    ])
  })

  it('handles both shapes in one cached payload', () => {
    expect(
      normalizeDebriefItems(['старый пункт', { text: 'новый', evidence: '3 подхода' }]),
    ).toEqual([{ text: 'старый пункт' }, { text: 'новый', evidence: '3 подхода' }])
  })

  it('drops entries that carry no usable text', () => {
    expect(normalizeDebriefItems(['', '   ', null, 42, {}, { evidence: 'no text' }])).toEqual([])
  })

  it('ignores a non-string evidence field instead of rendering it', () => {
    expect(normalizeDebriefItems([{ text: 'Пункт', evidence: 99 }])).toEqual([{ text: 'Пункт' }])
  })
})
