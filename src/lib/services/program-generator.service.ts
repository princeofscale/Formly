import { Mistral } from '@mistralai/mistralai'
import type { Exercise } from '@/lib/types/models'

export type ProgramGoal = 'strength' | 'hypertrophy' | 'general'

export interface ProgramGenInput {
  locale: 'ru' | 'en'
  goal: ProgramGoal
  daysPerWeek: number
  location: 'gym' | 'home_dumbbells' | 'home_bodyweight'
  library: Array<
    Pick<Exercise, 'id' | 'name' | 'name_ru' | 'primary_muscle' | 'equipment' | 'mechanic'>
  >
}

export interface GeneratedDay {
  day_label: string
  exercises: Array<{
    exercise_id: string
    sets: number
    reps: number
  }>
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

export async function generateProgram(input: ProgramGenInput): Promise<GeneratedDay[]> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const client = new Mistral({ apiKey })

  const systemPrompt = `You are a strength coach designing a training split.
Generate a ${input.daysPerWeek}-day-per-week training program for goal "${input.goal}" at location "${input.location}".

For each training day, pick 4-6 exercises from the library by their UUID.
- Pick a split that makes sense for ${input.daysPerWeek} days/week (full body, upper/lower, push/pull/legs, etc).
- Each day should hit complementary muscle groups; don't repeat the same primary muscle as the focus on consecutive days.
- Prefer compound movements for the first 1-2 slots of each day, then accessories.
- Sets/reps should match the goal: strength = 4-5 sets × 3-6 reps, hypertrophy = 3-4 sets × 8-12 reps, general = 3 sets × 8-12 reps.
- day_label is a SHORT name (2-4 words) describing the day's focus in ${input.locale === 'ru' ? 'Russian' : 'English'}.

Return ONLY valid JSON: {"days":[{"day_label":"<label>","exercises":[{"exercise_id":"<uuid>","sets":<int>,"reps":<int>}]}]}
Exactly ${input.daysPerWeek} entries in days[]. Only use exercise_id values from the provided library.`

  const userPrompt = JSON.stringify({
    library: input.library.map((e) => ({
      id: e.id,
      name: input.locale === 'ru' ? (e.name_ru ?? e.name) : e.name,
      muscle: e.primary_muscle,
      equipment: e.equipment,
      mechanic: e.mechanic,
    })),
  })

  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    temperature: 0.5,
    maxTokens: 2000,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = contentToText(response.choices[0]?.message?.content) || '{}'
  let days: GeneratedDay[]
  try {
    const parsed = JSON.parse(raw)
    days = Array.isArray(parsed.days) ? parsed.days : []
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  // Filter out hallucinated exercise IDs and clamp set/rep values to sane ranges.
  const validIds = new Set(input.library.map((e) => e.id))
  return days
    .map((d) => ({
      day_label: typeof d.day_label === 'string' ? d.day_label.slice(0, 40) : 'Day',
      exercises: (Array.isArray(d.exercises) ? d.exercises : [])
        .filter((ex) => ex && typeof ex.exercise_id === 'string' && validIds.has(ex.exercise_id))
        .map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: Math.min(8, Math.max(1, Math.round(Number(ex.sets) || 3))),
          reps: Math.min(30, Math.max(1, Math.round(Number(ex.reps) || 8))),
        }))
        .slice(0, 8),
    }))
    .filter((d) => d.exercises.length > 0)
    .slice(0, input.daysPerWeek)
}
