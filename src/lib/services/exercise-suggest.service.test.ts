import { afterEach, describe, expect, it, vi } from 'vitest'
import { Mistral } from '@mistralai/mistralai'
import {
  parseSuggestions,
  serializeCatalog,
  suggestFromCatalog,
  type CatalogEntry,
} from './exercise-suggest.service'

const { completeMock } = vi.hoisted(() => ({ completeMock: vi.fn() }))

vi.mock('@mistralai/mistralai', () => ({
  Mistral: vi.fn(function () {
    return { chat: { complete: completeMock } }
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

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

describe('suggestFromCatalog', () => {
  it('returns an empty result without configuring or calling Mistral for an empty catalog', async () => {
    vi.stubEnv('MISTRAL_API_KEY', '')

    await expect(
      suggestFromCatalog({ locale: 'en', query: 'bench', catalog: [] }),
    ).resolves.toEqual([])
    expect(Mistral).not.toHaveBeenCalled()
    expect(completeMock).not.toHaveBeenCalled()
  })

  it('throws when MISTRAL_API_KEY is missing', async () => {
    vi.stubEnv('MISTRAL_API_KEY', '')

    await expect(suggestFromCatalog({ locale: 'en', query: 'bench', catalog })).rejects.toThrow(
      'MISTRAL_API_KEY is not configured',
    )
    expect(Mistral).not.toHaveBeenCalled()
  })

  it('passes a request signal and clears its timeout after completion', async () => {
    vi.useFakeTimers()
    vi.stubEnv('MISTRAL_API_KEY', 'test-key')
    completeMock.mockResolvedValue({ choices: [{ message: { content: '{"items":[]}' } }] })

    await expect(suggestFromCatalog({ locale: 'en', query: 'bench', catalog })).resolves.toEqual([])
    expect(completeMock).toHaveBeenCalledWith(expect.any(Object), {
      fetchOptions: { signal: expect.any(AbortSignal) },
    })
    expect(vi.getTimerCount()).toBe(0)
  })
})
