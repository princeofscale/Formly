// «Возможно, вы имели в виду…»: the model picks up to 3 entries from a
// numbered catalog. Index-based responses make hallucinated exercises
// impossible by construction — invalid indices are simply dropped.
import { aiToneBlock } from './ai-tone'
import { cvcChat, CVC_FAST_MODEL } from './cvc.client'
import type { Exercise } from '@/lib/types/models'

export interface SuggestPick {
  index: number // 1-based line number in the serialized catalog
  reason: string
}

export type CatalogEntry = Pick<Exercise, 'name' | 'name_ru' | 'primary_muscle' | 'equipment'>

// Paired with CVC_FAST_MODEL below: measured at 3.5-4.5s against the full
// 736-entry catalog, so this is headroom rather than a budget. Raise it if this
// surface ever moves back to a reasoning model, which needed 16-27s.
const REQUEST_TIMEOUT_MS = 15_000

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

  const systemPrompt = `You are the search assistant of a gym workout tracker.
The user's search query matched nothing. It may be Russian gym slang, a machine
description, a misspelling, or mixed RU/EN.
The full exercise catalog follows, one entry per line: index|name|name_ru|muscle|equipment.
Pick up to 3 entries the user most likely meant. If nothing plausibly matches,
return an empty list. Each reason states what in the query matched the entry, max 10 words.

${aiToneBlock(ctx.locale)}

Return ONLY valid JSON: {"items":[{"index":<number>,"reason":"<why this matches>"}]}`

  const raw =
    (await cvcChat({
      surface: 'exercise_suggest',
      // Picking rows out of a numbered list is matching, not reasoning: on the
      // same queries the fast model returned the same exercises 5x sooner.
      model: CVC_FAST_MODEL,
      system: systemPrompt,
      user: `query: ${ctx.query}\n\ncatalog:\n${serializeCatalog(ctx.catalog)}`,
      temperature: 0.2,
      maxTokens: 300,
      timeoutMs: REQUEST_TIMEOUT_MS,
    })) || '{}'
  return parseSuggestions(raw, ctx.catalog.length)
}
