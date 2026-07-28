import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseSuggestions,
  serializeCatalog,
  suggestFromCatalog,
  type CatalogEntry,
} from './exercise-suggest.service'

const { cvcChatMock } = vi.hoisted(() => ({ cvcChatMock: vi.fn() }))

vi.mock('./cvc.client', () => ({ cvcChat: cvcChatMock }))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
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
  it('returns an empty result without reaching the gateway for an empty catalog', async () => {
    await expect(
      suggestFromCatalog({ locale: 'en', query: 'bench', catalog: [] }),
    ).resolves.toEqual([])
    expect(cvcChatMock).not.toHaveBeenCalled()
  })

  it('sends the query and catalog under the search timeout', async () => {
    cvcChatMock.mockResolvedValue('{"items":[{"index":1,"reason":"matches bench"}]}')

    await expect(suggestFromCatalog({ locale: 'en', query: 'bench', catalog })).resolves.toEqual([
      { index: 1, reason: 'matches bench' },
    ])

    const options = cvcChatMock.mock.calls[0][0]
    expect(options.user).toContain('query: bench')
    expect(options.user).toContain('1|Barbell Bench Press')
    // Search suggestions are typed at, not waited on: this budget is what keeps
    // a slow gateway from holding the box open behind the athlete.
    expect(options.timeoutMs).toBe(25_000)
  })

  it('returns no picks when the gateway answers with nothing usable', async () => {
    cvcChatMock.mockResolvedValue('')

    await expect(suggestFromCatalog({ locale: 'en', query: 'bench', catalog })).resolves.toEqual([])
  })
})
