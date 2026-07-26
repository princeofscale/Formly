import { Mistral } from '@mistralai/mistralai'
import { aiToneBlock } from './ai-tone'
import { mistralContentToText } from './mistral-content'
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

/**
 * Selection rules, kept separate from the per-request prompt so they can be
 * asserted in tests the way the shared tone block already is.
 */
export const ALTERNATIVE_RULES = `You are a fitness coach. The user wants to swap one exercise for another from a fixed library.
Pick up to 3 alternatives from the candidates list. Each must hit the same primary muscle as the target.
Prefer matching the same movement pattern (compound vs isolation) and equipment when possible.
When the target uses a barbell and the candidates contain a machine or cable variant of the same
pattern, include at least one of them. Athletes swap an exercise because a rack is occupied, a
technique is not there yet, or a joint does not tolerate free weight, and a guided variant answers
all three.
Avoid suggesting the target exercise itself.
Each reason must name what the alternative shares with the target — the primary muscle,
the movement pattern, or the equipment — so the athlete can see why it was offered.`

export async function pickAlternatives(ctx: PickContext): Promise<AlternativeSuggestion[]> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  if (ctx.candidates.length === 0) return []

  const client = new Mistral({ apiKey })

  const systemPrompt = `${ALTERNATIVE_RULES}

${aiToneBlock(ctx.locale)}

Return ONLY valid JSON: {"items":[{"exercise_id":"<uuid>","reason":"<short, max 12 words>"}]}`

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

  const raw = mistralContentToText(response.choices[0]?.message?.content) || '{}'
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
