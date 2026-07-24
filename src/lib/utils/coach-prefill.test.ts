import { describe, it, expect } from 'vitest'
import { buildPrefillQuestion } from './coach-prefill'

describe('buildPrefillQuestion', () => {
  it('quotes the advice and asks for the reasoning', () => {
    expect(buildPrefillQuestion({ title: 'Жим буксует', body: 'Вес не растёт три недели' })).toBe(
      'Почему «Жим буксует»? Вес не растёт три недели',
    )
  })

  it('appends the evidence when it exists', () => {
    expect(
      buildPrefillQuestion({ title: 'Объём упал', body: 'Меньше подходов', evidence: '−18%' }),
    ).toBe('Почему «Объём упал»? Меньше подходов (−18%)')
  })

  it('works when only the body is known, as on debrief points', () => {
    expect(buildPrefillQuestion({ body: 'Средний RPE 8,4' })).toBe('Почему «Средний RPE 8,4»?')
  })

  it('collapses newlines so the question stays one line', () => {
    expect(buildPrefillQuestion({ body: 'первая\nвторая' })).toBe('Почему «первая вторая»?')
  })

  it('returns an empty string when there is nothing to ask about', () => {
    expect(buildPrefillQuestion({ body: '   ' })).toBe('')
    expect(buildPrefillQuestion({})).toBe('')
  })

  it('still quotes the title when the body is missing', () => {
    expect(buildPrefillQuestion({ title: 'Пора отдохнуть' })).toBe('Почему «Пора отдохнуть»?')
  })
})
