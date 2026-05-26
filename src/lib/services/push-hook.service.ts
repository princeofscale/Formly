import { Mistral } from '@mistralai/mistralai'

export interface PushHookContext {
  locale: 'ru' | 'en'
  lastSessionDaysAgo: number | null
  recentExercises: Array<{ name: string; lastWeightKg: number; lastReps: number }>
  topMusclesByVolumeLast7d: Array<{ muscle: string; sets: number }>
  underworkedMuscles: string[]
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

/**
 * Generate a SHORT personalized push notification body.
 * Falls back to a generic string if anything fails — never blocks the cron.
 */
export async function generatePushHook(ctx: PushHookContext, fallback: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) return fallback

  try {
    const client = new Mistral({ apiKey })

    const systemPrompt = `You write SHORT personalized push notification bodies for a workout app.
Output a SINGLE sentence, max 90 characters, no quotes, no emoji.
Goal: make the user want to start their workout NOW.
Reference one specific thing from their data (an exercise, an undertrained muscle, days since last session).
Sound like a gym buddy, not a corporate app.

Respond entirely in ${ctx.locale === 'ru' ? 'Russian, casual register' : 'English'}.
Return ONLY valid JSON: {"body":"<the sentence>"}`

    const userPrompt = JSON.stringify({
      days_since_last_session: ctx.lastSessionDaysAgo,
      recent_exercises: ctx.recentExercises.slice(0, 5),
      top_muscles_last_7d: ctx.topMusclesByVolumeLast7d.slice(0, 3),
      undertrained_muscles: ctx.underworkedMuscles.slice(0, 3),
    })

    const response = await client.chat.complete({
      model: 'mistral-large-latest',
      temperature: 0.7,
      maxTokens: 150,
      responseFormat: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = contentToText(response.choices[0]?.message?.content) || '{}'
    const parsed = JSON.parse(raw)
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
    if (!body) return fallback
    return body.length > 120 ? body.slice(0, 117) + '...' : body
  } catch {
    return fallback
  }
}
