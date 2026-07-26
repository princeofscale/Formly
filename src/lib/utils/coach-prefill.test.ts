import { describe, it, expect } from 'vitest'
import { buildPrefillQuestion } from './coach-prefill'

// Caller supplies the localized wrapper; these stand in for next-intl.
const askRu = (quoted: string) => `Почему «${quoted}»?`
const askEn = (quoted: string) => `Why "${quoted}"?`

describe('buildPrefillQuestion', () => {
  it('quotes the advice and asks for the reasoning', () => {
    expect(
      buildPrefillQuestion({ title: 'Жим буксует', body: 'Вес не растёт три недели' }, askRu),
    ).toBe('Почему «Жим буксует»? Вес не растёт три недели')
  })

  it('uses the caller locale rather than a hardcoded language', () => {
    expect(buildPrefillQuestion({ body: 'Bench stalled' }, askEn)).toBe('Why "Bench stalled"?')
  })

  it('appends the evidence when it exists', () => {
    expect(
      buildPrefillQuestion(
        { title: 'Объём упал', body: 'Меньше подходов', evidence: '−18%' },
        askRu,
      ),
    ).toBe('Почему «Объём упал»? Меньше подходов (−18%)')
  })

  it('works when only the body is known, as on debrief points', () => {
    expect(buildPrefillQuestion({ body: 'Средний RPE 8,4' }, askRu)).toBe(
      'Почему «Средний RPE 8,4»?',
    )
  })

  it('collapses newlines so the question stays one line', () => {
    expect(buildPrefillQuestion({ body: 'первая\nвторая' }, askRu)).toBe('Почему «первая вторая»?')
  })

  it('returns an empty string when there is nothing to ask about', () => {
    expect(buildPrefillQuestion({ body: '   ' }, askRu)).toBe('')
    expect(buildPrefillQuestion({}, askRu)).toBe('')
  })

  it('still quotes the title when the body is missing', () => {
    expect(buildPrefillQuestion({ title: 'Пора отдохнуть' }, askRu)).toBe(
      'Почему «Пора отдохнуть»?',
    )
  })
})
