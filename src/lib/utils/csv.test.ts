import { describe, expect, it } from 'vitest'
import { csvEscape } from './csv'

describe('csvEscape', () => {
  it('neutralizes spreadsheet formulas and quotes CSV metacharacters', () => {
    expect(csvEscape('=HYPERLINK("https://example.com")')).toBe(
      `"'=HYPERLINK(""https://example.com"")"`,
    )
    expect(csvEscape('Bench, press')).toBe('"Bench, press"')
  })
})
