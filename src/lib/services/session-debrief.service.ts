import { Mistral } from '@mistralai/mistralai'
import type { SessionSummary } from './session-summary.service'

export interface SessionDebrief {
  items: string[]
  generated_at: string
}

interface DebriefContext {
  locale: 'ru' | 'en'
  summary: SessionSummary
  rpe: { avg: number | null; max: number | null; samples: number }
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

export async function generateDebrief(ctx: DebriefContext): Promise<SessionDebrief> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const client = new Mistral({ apiKey })

  const systemPrompt = `You are a strength coach reviewing a single workout the user just finished.
Write a SHORT post-workout debrief: 2-4 bullet points, each one sentence (max 20 words).

Cover whatever is most informative from the data given:
- PRs they hit (call them out by exercise name)
- Volume vs previous session — congrats or warning
- RPE patterns (avg high = pushed hard; avg low = sandbagging?)
- Specific exercise that stood out (highest volume)
- A SINGLE practical takeaway for next session

Be direct, no fluff, no preamble like "Great workout!". Use the user's name only if data has it.
Respond entirely in ${ctx.locale === 'ru' ? 'Russian' : 'English'} (casual gym-bro register if Russian).

Return ONLY valid JSON: {"items":["bullet 1","bullet 2","bullet 3"]}`

  const userPrompt = JSON.stringify({
    summary: {
      total_sets: ctx.summary.totalSets,
      total_reps: ctx.summary.totalReps,
      total_volume_kg: ctx.summary.totalVolumeKg,
      duration_minutes: ctx.summary.durationMinutes,
      prs: ctx.summary.prs.map((p) => ({
        exercise: ctx.locale === 'ru' ? (p.exerciseNameRu ?? p.exerciseName) : p.exerciseName,
        new_best_e1rm: p.newBest,
        previous_best_e1rm: p.previousBest,
        improvement_pct: p.improvementPct,
      })),
      top_exercises: ctx.summary.topExercises.map((e) => ({
        exercise: ctx.locale === 'ru' ? (e.nameRu ?? e.name) : e.name,
        volume_kg: e.volume,
        sets: e.sets,
      })),
      comparison_vs_previous: ctx.summary.comparison,
    },
    rpe: ctx.rpe,
  })

  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    temperature: 0.5,
    maxTokens: 400,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = contentToText(response.choices[0]?.message?.content) || '{}'
  let items: string[]
  try {
    const parsed = JSON.parse(raw)
    items = Array.isArray(parsed.items)
      ? parsed.items.filter((x: unknown): x is string => typeof x === 'string')
      : []
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  return {
    items: items.slice(0, 4),
    generated_at: new Date().toISOString(),
  }
}
