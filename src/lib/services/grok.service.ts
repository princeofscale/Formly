import OpenAI from 'openai'
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
}

export async function generateInsights(ctx: GrokContext): Promise<AIInsights> {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

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
  })

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '[]'

  let items: AIInsightItem[]
  try {
    items = JSON.parse(raw)
    if (!Array.isArray(items)) throw new Error('not an array')
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  return {
    items,
    generated_at: new Date().toISOString(),
  }
}
