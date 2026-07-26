import { describe, it, expect } from 'vitest'
import { parseCoachReply } from './coach-chat.service'

describe('parseCoachReply', () => {
  it('keeps the answer and its evidence', () => {
    expect(parseCoachReply({ body: 'Жим стоит третью неделю', evidence: '82,5 кг × 3' })).toEqual({
      body: 'Жим стоит третью неделю',
      evidence: '82,5 кг × 3',
    })
  })

  it('accepts an answer with no evidence, as general theory has none', () => {
    expect(parseCoachReply({ body: 'Общая рекомендация' })).toEqual({ body: 'Общая рекомендация' })
  })

  it('drops a non-string evidence instead of rendering it', () => {
    expect(parseCoachReply({ body: 'Ответ', evidence: 42 })).toEqual({ body: 'Ответ' })
  })

  it('trims surrounding whitespace', () => {
    expect(parseCoachReply({ body: '  Ответ  ', evidence: '  10 кг  ' })).toEqual({
      body: 'Ответ',
      evidence: '10 кг',
    })
  })

  it('treats a blank evidence as absent', () => {
    expect(parseCoachReply({ body: 'Ответ', evidence: '   ' })).toEqual({ body: 'Ответ' })
  })

  it('returns null when there is no usable answer', () => {
    expect(parseCoachReply({ evidence: 'только основание' })).toBeNull()
    expect(parseCoachReply({ body: '   ' })).toBeNull()
    expect(parseCoachReply({ body: 42 })).toBeNull()
    expect(parseCoachReply(null)).toBeNull()
    expect(parseCoachReply('строка вместо объекта')).toBeNull()
  })
})
