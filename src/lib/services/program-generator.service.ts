import { Mistral } from '@mistralai/mistralai'
import type { Exercise } from '@/lib/types/models'

export type ProgramGoal = 'strength' | 'hypertrophy' | 'general'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface ProgramGenInput {
  locale: 'ru' | 'en'
  goal: ProgramGoal
  daysPerWeek: number
  location: 'gym' | 'home_dumbbells' | 'home_bodyweight'
  age?: number | null
  experience?: ExperienceLevel
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

function buildSafetyBlock(
  age: number | null | undefined,
  exp: ExperienceLevel | undefined,
): string {
  const isYoung = typeof age === 'number' && age < 18
  const isBeginner = exp === 'beginner' || (typeof age === 'number' && age < 16)

  if (!isYoung && !isBeginner) return ''

  const reasons: string[] = []
  if (isYoung) reasons.push(`user is ${age} years old (growth plates still developing)`)
  if (isBeginner) reasons.push('user is a beginner with limited training history')

  return `
SAFETY CONSTRAINTS — ${reasons.join('; ')}:
- DO NOT include conventional barbell deadlift, sumo deadlift, heavy back squat with weights that could risk lumbar injury, behind-the-neck press, weighted barbell good mornings, heavy barbell rows from the floor.
- PREFER safer variants: trap bar deadlift if available; goblet squat / leg press / hack squat over heavy back squat; dumbbell rows / chest-supported rows over bent-over barbell rows; overhead press from the front (not behind neck).
- For ${isYoung ? 'under-18' : 'beginners'}: cap rep ranges at 8-15 reps (NEVER below 6). Skip "strength" rep ranges (3-5 reps) regardless of stated goal.
- Prefer machines and dumbbells over heavy free-weight barbells where the library allows.
- Avoid 1RM-style work entirely.
`
}

export async function generateProgram(input: ProgramGenInput): Promise<GeneratedDay[]> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const client = new Mistral({ apiKey })

  const safetyBlock = buildSafetyBlock(input.age, input.experience)

  const systemPrompt = `You are a strength coach designing a training split.
Generate a ${input.daysPerWeek}-day-per-week training program for goal "${input.goal}" at location "${input.location}".

For each training day, pick 4-6 exercises from the library by their UUID.
- Pick a split that makes sense for ${input.daysPerWeek} days/week (full body, upper/lower, push/pull/legs, etc).
- Each day should hit complementary muscle groups; don't repeat the same primary muscle as the focus on consecutive days.
- Prefer compound movements for the first 1-2 slots of each day, then accessories.
- Sets/reps should match the goal: strength = 4-5 sets × 3-6 reps, hypertrophy = 3-4 sets × 8-12 reps, general = 3 sets × 8-12 reps.
- day_label is a SHORT name (2-4 words) describing the day's focus in ${input.locale === 'ru' ? 'Russian' : 'English'}.
${safetyBlock}
Return ONLY valid JSON: {"days":[{"day_label":"<label>","exercises":[{"exercise_id":"<uuid>","sets":<int>,"reps":<int>}]}]}
Exactly ${input.daysPerWeek} entries in days[]. Only use exercise_id values from the provided library.`

  // Trim library payload — keep only what AI needs to choose.
  const userPrompt = JSON.stringify({
    library: input.library.map((e) => ({
      id: e.id,
      name: input.locale === 'ru' ? (e.name_ru ?? e.name) : e.name,
      muscle: e.primary_muscle,
      equipment: e.equipment,
      mechanic: e.mechanic,
    })),
  })

  // mistral-medium is 3-5× faster than -large with comparable quality for
  // structured JSON tasks like this. We're not asking for creative prose.
  const response = await client.chat.complete({
    model: 'mistral-medium-latest',
    temperature: 0.4,
    maxTokens: 1500,
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
  const isYoungOrBeginner =
    (typeof input.age === 'number' && input.age < 18) || input.experience === 'beginner'
  const minReps = isYoungOrBeginner ? 6 : 1

  return days
    .map((d) => ({
      day_label: typeof d.day_label === 'string' ? d.day_label.slice(0, 40) : 'Day',
      exercises: (Array.isArray(d.exercises) ? d.exercises : [])
        .filter((ex) => ex && typeof ex.exercise_id === 'string' && validIds.has(ex.exercise_id))
        .map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: Math.min(8, Math.max(1, Math.round(Number(ex.sets) || 3))),
          reps: Math.min(30, Math.max(minReps, Math.round(Number(ex.reps) || 10))),
        }))
        .slice(0, 8),
    }))
    .filter((d) => d.exercises.length > 0)
    .slice(0, input.daysPerWeek)
}
