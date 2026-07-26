import { describe, expect, it } from 'vitest'
import en from '../../messages/en'
import ru from '../../messages/ru'

function messageKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]

  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('translations', () => {
  it('keeps English and Russian message keys in sync', () => {
    expect(messageKeys(ru).sort()).toEqual(messageKeys(en).sort())
  })
})
