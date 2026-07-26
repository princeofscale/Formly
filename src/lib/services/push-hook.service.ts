import { Mistral } from '@mistralai/mistralai'
import { aiToneBlock } from './ai-tone'
import { mistralContentToText } from './mistral-content'

export interface PushHookContext {
  locale: 'ru' | 'en'
  lastSessionDaysAgo: number | null
  recentExercises: Array<{ name: string; lastWeightKg: number; lastReps: number }>
  topMusclesByVolumeLast7d: Array<{ muscle: string; sets: number }>
  underworkedMuscles: string[]
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
Reference one specific thing from their data (an exercise, an undertrained muscle, days since last session).
State the fact plainly; the specificity is what makes it worth opening, not urgency or pressure.

${aiToneBlock(ctx.locale)}

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

    const raw = mistralContentToText(response.choices[0]?.message?.content) || '{}'
    const parsed = JSON.parse(raw)
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
    if (!body) return fallback
    return body.length > 120 ? body.slice(0, 117) + '...' : body
  } catch {
    return fallback
  }
}
