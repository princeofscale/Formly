import { describe, expect, it } from 'vitest'
import { defaultLocale, resolveLocale } from './config'

describe('resolveLocale', () => {
  it('accepts supported locales', () => {
    expect(resolveLocale('ru')).toBe('ru')
    expect(resolveLocale('en')).toBe('en')
  })

  it('falls back for missing or unsupported cookie values', () => {
    expect(resolveLocale(undefined)).toBe(defaultLocale)
    expect(resolveLocale('fr')).toBe(defaultLocale)
  })
})
