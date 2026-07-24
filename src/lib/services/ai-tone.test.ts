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
  })
})
