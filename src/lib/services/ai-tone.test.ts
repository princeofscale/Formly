import { describe, it, expect } from 'vitest'
import { aiToneBlock } from './ai-tone'

describe('aiToneBlock', () => {
  it('asks for Russian output for the ru locale', () => {
    expect(aiToneBlock('ru')).toContain('Russian')
    expect(aiToneBlock('ru')).not.toContain('English')
  })

  it('falls back to English for any other locale', () => {
    expect(aiToneBlock('en')).toContain('English')
    expect(aiToneBlock('de')).toContain('English')
  })

  it('forbids slang and imperative commands in every locale', () => {
    for (const locale of ['ru', 'en']) {
      const block = aiToneBlock(locale)
      expect(block).toMatch(/no slang/i)
      expect(block).toMatch(/imperative/i)
    }
  })

  it('requires gender-neutral phrasing', () => {
    expect(aiToneBlock('ru')).toMatch(/gender-neutral/i)
    expect(aiToneBlock('ru')).toContain('результат вырос')
  })

  it('grounds claims in the kind of evidence supplied by the task', () => {
    const block = aiToneBlock('en')
    expect(block).toMatch(/factual claims/i)
    expect(block).toMatch(/categorical attributes/i)
    expect(block).not.toMatch(/every statement in a number/i)
  })
})
