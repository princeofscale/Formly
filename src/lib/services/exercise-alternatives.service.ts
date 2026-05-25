import { Mistral } from '@mistralai/mistralai'
import type { Exercise } from '@/lib/types/models'

export interface AlternativeSuggestion {
  exercise_id: string
  reason: string
}

interface PickContext {
  locale: 'ru' | 'en'
  target: Pick<Exercise, 'id' | 'name' | 'name_ru' | 'primary_muscle' | 'equipment' | 'mechanic'>
  candidates: Array<
    Pick<Exercise, 'id' | 'name' | 'name_ru' | 'primary_muscle' | 'equipment' | 'mechanic'>
  >
}

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

export async function pickAlternatives(ctx: PickContext): Promise<AlternativeSuggestion[]> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  if (ctx.candidates.length === 0) return []

  const client = new Mistral({ apiKey })

  const systemPrompt = `You are a fitness coach. The user wants to swap one exercise for another from a fixed library.
Pick up to 3 alternatives from the candidates list. Each must hit the same primary muscle as the target.
Prefer matching the same movement pattern (compound vs isolation) and equipment when possible.
Avoid suggesting the target exercise itself.

Return ONLY valid JSON: {"items":[{"exercise_id":"<uuid>","reason":"<short, max 12 words, in ${ctx.locale === 'ru' ? 'Russian' : 'English'}>"}]}`

  const userPrompt = JSON.stringify({
    target: ctx.target,
    candidates: ctx.candidates.map((c) => ({
      id: c.id,
      name: ctx.locale === 'ru' ? (c.name_ru ?? c.name) : c.name,
      muscle: c.primary_muscle,
      equipment: c.equipment,
      mechanic: c.mechanic,
    })),
  })

  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    temperature: 0.4,
    maxTokens: 400,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = contentToText(response.choices[0]?.message?.content) || '{}'
  let items: AlternativeSuggestion[]
  try {
    const parsed = JSON.parse(raw)
    items = Array.isArray(parsed.items) ? parsed.items : []
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  // Filter to valid candidate IDs only — model sometimes hallucinates UUIDs
  const candidateIds = new Set(ctx.candidates.map((c) => c.id))
  return items
    .filter((it) => it && typeof it.exercise_id === 'string' && candidateIds.has(it.exercise_id))
    .slice(0, 3)
}
