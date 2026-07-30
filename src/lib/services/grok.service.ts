import { aiToneBlock } from './ai-tone'
import { cvcChat } from './cvc.client'
import type {
  MuscleVolume,
  VolumeLandmark,
  ProgressionSuggestion,
  AIInsights,
  AIInsightItem,
} from '@/lib/types/models'

export interface GrokContext {
  locale: 'ru' | 'en'
  profile: {
    age: number | null
    training_since: string | null
    goal: string | null
  }
  weekly_volumes: MuscleVolume[]
  volume_landmarks: VolumeLandmark[]
  recent_sessions: { date: string; volume_kg: number }[]
  top_prs: { exercise: string; best_weight_kg: number }[]
  progression_opportunities: ProgressionSuggestion[]
}

const INSIGHT_TYPES = new Set<AIInsightItem['type']>([
  'today',
  'progression',
  'prediction',
  'warning',
])

export function parseInsightsResponse(raw: string): AIInsightItem[] {
  const parsed: unknown = JSON.parse(raw)
  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'items' in parsed
      ? (parsed as { items: unknown }).items
      : null

  if (!Array.isArray(candidates)) throw new Error('AI response has no items array')

  const items = candidates.filter((item): item is AIInsightItem => {
    if (!item || typeof item !== 'object') return false
    const value = item as Partial<AIInsightItem>
    return (
      typeof value.type === 'string' &&
      INSIGHT_TYPES.has(value.type as AIInsightItem['type']) &&
      typeof value.title === 'string' &&
      typeof value.body === 'string' &&
      (value.detail === undefined || typeof value.detail === 'string') &&
      (value.action === undefined || typeof value.action === 'string')
    )
  })

  if (items.length === 0) throw new Error('AI response has no valid insights')
  return items.slice(0, 5)
}

export async function generateInsights(ctx: GrokContext): Promise<AIInsights> {
  const systemPrompt = `You are a personal fitness coach AI for a workout tracking app.
Analyze the user's training data and return a JSON object with an "items" array.

Each object must have:
- type: "today" | "progression" | "prediction" | "warning"
- title: short headline (max 6 words)
- body: 1-2 concise sentences explaining what the data means and why it matters
- detail: a short evidence string with the exact metric used, when data is available
- action: one concrete action for the user's next workout (max 12 words)

Return 4-5 useful items: exactly one "today", one or two "progression", one "prediction", optionally one "warning" only when the data supports it.

Every set count in the data is a working set — warm-ups are already excluded.
Volume landmark status means: "mv" = below maintenance, "optimal" = productive range,
"mrv" = at the recoverable ceiling. Raise an overtraining "warning" only for a muscle
whose status is "mrv"; a high set count on its own is not overtraining.

${aiToneBlock(ctx.locale)}

Return ONLY valid JSON shaped as {"items":[...]}. No markdown or extra explanation.`

  const userPrompt = JSON.stringify({
    profile: ctx.profile,
    weekly_volumes: ctx.weekly_volumes,
    volume_landmarks: ctx.volume_landmarks,
    recent_sessions: ctx.recent_sessions,
    top_prs: ctx.top_prs,
    progression_opportunities: ctx.progression_opportunities,
  })

  // The coach card runs on Grok 4.5 through the CheapVibeCode gateway. The file
  // is still called grok.service.ts because it always was — it predates the
  // spell in production that had it on Mistral.
  const raw =
    (await cvcChat({
      surface: 'insights_refresh',
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.3,
      maxTokens: 800,
    })) || '[]'

  let items: AIInsightItem[]
  try {
    items = parseInsightsResponse(raw)
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  return {
    items,
    generated_at: new Date().toISOString(),
  }
}
