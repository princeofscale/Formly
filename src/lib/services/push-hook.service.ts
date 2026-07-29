import { aiToneBlock } from './ai-tone'
import { cvcChat, CVC_FAST_MODEL } from './cvc.client'

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
  try {
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

    // No key, a gateway error or a timeout all land in the catch below and the
    // cron sends the generic line instead. A push is not worth failing over.
    const raw =
      (await cvcChat({
        surface: 'push_hook',
        // One sentence about a muscle the athlete has not trained. The reasoning
        // model spent up to 48s and 6947 output tokens on that and picked the
        // duller fact — it restated the last set instead of naming the gap.
        model: CVC_FAST_MODEL,
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.7,
        maxTokens: 150,
      })) || '{}'
    const parsed = JSON.parse(raw)
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
    if (!body) return fallback
    return body.length > 120 ? body.slice(0, 117) + '...' : body
  } catch {
    return fallback
  }
}
