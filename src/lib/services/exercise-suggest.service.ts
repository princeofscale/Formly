// «Возможно, вы имели в виду…»: the model picks up to 3 entries from a
// numbered catalog. Index-based responses make hallucinated exercises
// impossible by construction — invalid indices are simply dropped.
import { Mistral } from '@mistralai/mistralai'
import type { Exercise } from '@/lib/types/models'

export interface SuggestPick {
  index: number // 1-based line number in the serialized catalog
  reason: string
}

export type CatalogEntry = Pick<Exercise, 'name' | 'name_ru' | 'primary_muscle' | 'equipment'>

const REQUEST_TIMEOUT_MS = 10_000

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text
          return typeof text === 'string' ? text : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}

export function serializeCatalog(catalog: CatalogEntry[]): string {
  const clean = (s: string) => s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()
  return catalog
    .map(
      (e, i) =>
        `${i + 1}|${clean(e.name)}|${clean(e.name_ru ?? '')}|${e.primary_muscle}|${e.equipment}`,
    )
    .join('\n')
}

export function parseSuggestions(raw: string, catalogLength: number): SuggestPick[] {
  let items: unknown
  try {
    items = (JSON.parse(raw) as { items?: unknown }).items
  } catch {
    return []
  }
  if (!Array.isArray(items)) return []
  const seen = new Set<number>()
  const out: SuggestPick[] = []
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    const index = (it as { index?: unknown }).index
    const reason = (it as { reason?: unknown }).reason
    if (typeof index !== 'number' || !Number.isInteger(index)) continue
    if (index < 1 || index > catalogLength || seen.has(index)) continue
    seen.add(index)
    out.push({ index, reason: typeof reason === 'string' ? reason.slice(0, 120) : '' })
    if (out.length === 3) break
  }
  return out
}

export async function suggestFromCatalog(ctx: {
  locale: 'ru' | 'en'
  query: string
  catalog: CatalogEntry[]
}): Promise<SuggestPick[]> {
  if (ctx.catalog.length === 0) return []

  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const client = new Mistral({ apiKey })

  const systemPrompt = `You are the search assistant of a gym workout tracker.
The user's search query matched nothing. It may be Russian gym slang, a machine
description, a misspelling, or mixed RU/EN.
The full exercise catalog follows, one entry per line: index|name|name_ru|muscle|equipment.
Pick up to 3 entries the user most likely meant. If nothing plausibly matches,
return an empty list. Reasons: ${ctx.locale === 'ru' ? 'Russian' : 'English'}, max 10 words.
Return ONLY valid JSON: {"items":[{"index":<number>,"reason":"<why this matches>"}]}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await client.chat.complete(
      {
        model: 'mistral-large-latest',
        temperature: 0.2,
        maxTokens: 300,
        responseFormat: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `query: ${ctx.query}\n\ncatalog:\n${serializeCatalog(ctx.catalog)}`,
          },
        ],
      },
      { fetchOptions: { signal: controller.signal } },
    )

    const raw = contentToText(response.choices[0]?.message?.content) || '{}'
    return parseSuggestions(raw, ctx.catalog.length)
  } finally {
    clearTimeout(timeout)
  }
}
