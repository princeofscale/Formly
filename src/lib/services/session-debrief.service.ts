import { aiToneBlock } from './ai-tone'
import { cvcChat } from './cvc.client'
import type { SessionSummary } from './session-summary.service'

/** One debrief bullet: the observation plus the figure it rests on. */
export interface DebriefPoint {
  text: string
  evidence?: string
}

/**
 * Debriefs are cached in `workout_sessions.ai_debrief`, and rows written
 * before evidence existed hold plain strings. Both shapes stay readable
 * forever, so no cache invalidation and no re-spent AI quota.
 */
export type CachedDebriefItem = string | { text?: unknown; evidence?: unknown }

export interface SessionDebrief {
  items: CachedDebriefItem[]
  generated_at: string
  /** Short name for the session. Absent on debriefs cached before titles existed. */
  title?: string
}

/**
 * Takes `unknown[]` on purpose: the input is either a JSON column written by an
 * older build or a model reply that ignored the schema. Anything unusable is
 * dropped rather than rendered.
 */
export function normalizeDebriefItems(items: readonly unknown[]): DebriefPoint[] {
  const out: DebriefPoint[] = []

  for (const item of items) {
    const record =
      typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null

    const rawText = typeof item === 'string' ? item : record?.text
    if (typeof rawText !== 'string') continue

    const text = rawText.trim()
    if (!text) continue

    const rawEvidence = record?.evidence
    const evidence = typeof rawEvidence === 'string' ? rawEvidence.trim() : ''

    out.push(evidence ? { text, evidence } : { text })
  }

  return out
}

interface DebriefContext {
  locale: 'ru' | 'en'
  summary: SessionSummary
  rpe: { avg: number | null; max: number | null; samples: number }
}

export async function generateDebrief(ctx: DebriefContext): Promise<SessionDebrief> {
  const systemPrompt = `You are a strength coach reviewing a single workout the user just finished.
Write a SHORT post-workout debrief: 2-4 bullet points, each one sentence (max 20 words).

Cover whatever is most informative from the data given:
- PRs they hit (call them out by exercise name)
- Volume vs previous session
- RPE patterns (high average = worked close to the limit; low average = effort left in reserve)
- Specific exercise that stood out (highest volume)
- A SINGLE practical observation for next session

Set counts are working sets: warm-ups are already excluded. Never call a single
session too much volume or overtraining — one workout is not evidence of that.

Split each bullet in two: "text" is the observation, "evidence" is the bare figure it
rests on — the weight, the volume, the RPE, the session count. Keep "evidence" to a few
characters ("82.5 kg × 8", "RPE 7.8", "+12% volume"), with no sentence around it. An
observation the data cannot support is not worth writing; omit it entirely.
No preamble like "Great workout!". Use the athlete's name only if the data has it.

Also name the session in "title": 2-4 words for what was trained that day, taken from
the exercises actually in it ("Chest and triceps", "Heavy legs", "Full body"). It is a
label, not a sentence — no verbs, no punctuation, no praise, no numbers.

${aiToneBlock(ctx.locale)}

Return ONLY valid JSON: {"title":"<label>","items":[{"text":"<observation>","evidence":"<figure>"}]}`

  const userPrompt = JSON.stringify({
    summary: {
      total_sets: ctx.summary.workingSets,
      total_reps: ctx.summary.totalReps,
      total_volume_kg: ctx.summary.totalVolumeKg,
      duration_minutes: ctx.summary.durationMinutes,
      prs: ctx.summary.prs.map((p) => ({
        exercise: ctx.locale === 'ru' ? (p.exerciseNameRu ?? p.exerciseName) : p.exerciseName,
        new_best_weight_kg: p.newBest,
        previous_best_weight_kg: p.previousBest,
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

  const raw =
    (await cvcChat({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.5,
      // Russian tokenizes ~2× heavier than English: four bullets fit in 400
      // tokens most days and get cut mid-JSON on the others.
      maxTokens: 700,
    })) || '{}'
  let items: DebriefPoint[]
  let title = ''
  try {
    const parsed = JSON.parse(raw)
    // normalizeDebriefItems also tolerates a model that ignored the schema and
    // returned bare strings, so a malformed reply degrades instead of throwing.
    items = Array.isArray(parsed.items) ? normalizeDebriefItems(parsed.items) : []
    title = typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 60) : ''
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  return {
    items: items.slice(0, 4),
    generated_at: new Date().toISOString(),
    ...(title ? { title } : {}),
  }
}
