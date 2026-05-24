import { Mistral } from '@mistralai/mistralai'
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
  top_prs: { exercise: string; e1rm: number }[]
  progression_opportunities: ProgressionSuggestion[]
  sleep?: { last7_avg_hours: number | null; nights_logged: number }
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

export async function generateInsights(ctx: GrokContext): Promise<AIInsights> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const client = new Mistral({ apiKey })

  const systemPrompt = `You are a personal fitness coach AI for a workout tracking app.
Analyze the user's training data and return a JSON array of insight objects.

Each object must have:
- type: "today" | "progression" | "prediction" | "warning"
- title: short headline (max 6 words)
- body: 1-2 sentences of advice or information
- detail: optional short string with numbers/specifics

Return 4-6 items: exactly one "today", one or two "progression", one "prediction", optionally one "warning" (only if overtraining signs are present).
Respond entirely in ${ctx.locale === 'ru' ? 'Russian' : 'English'}.
Return ONLY a valid JSON array. No markdown. No explanation outside the JSON.`

  const userPrompt = JSON.stringify({
    profile: ctx.profile,
    weekly_volumes: ctx.weekly_volumes,
    volume_landmarks: ctx.volume_landmarks,
    recent_sessions: ctx.recent_sessions,
    top_prs: ctx.top_prs,
    progression_opportunities: ctx.progression_opportunities,
    sleep: ctx.sleep ?? null,
  })

  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    temperature: 0.3,
    maxTokens: 800,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = contentToText(response.choices[0]?.message?.content) || '[]'

  let items: AIInsightItem[]
  try {
    const parsed = JSON.parse(raw)
    items = Array.isArray(parsed) ? parsed : parsed.items
    if (!Array.isArray(items)) throw new Error('not an array')
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  return {
    items,
    generated_at: new Date().toISOString(),
  }
}
