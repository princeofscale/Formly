import type { SupabaseClient } from '@supabase/supabase-js'

// Bodyweight-relative strength tiers (kg-agnostic). Sourced from the
// commonly-cited Lon Kilgore / Symmetric Strength tables for adult males.
// Female users get scaled-down thresholds via the female multiplier.
// These are approximate and intended as a friendly benchmark, not gospel.
type LiftSlug =
  | 'barbell-squat'
  | 'barbell-bench-press'
  | 'barbell-deadlift'
  | 'barbell-overhead-press'
  | 'barbell-row'

export type StrengthTier = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite'

export interface StrengthRatio {
  exerciseSlug: LiftSlug
  exerciseName: string
  exerciseNameRu: string | null
  bestE1rm: number
  ratio: number
  tier: StrengthTier
  /** Ratio threshold (inclusive lower bound) to reach the next tier; null if elite. */
  nextTierAt: number | null
}

const LIFTS: LiftSlug[] = [
  'barbell-squat',
  'barbell-bench-press',
  'barbell-deadlift',
  'barbell-overhead-press',
  'barbell-row',
]

const THRESHOLDS: Record<LiftSlug, Record<StrengthTier, number>> = {
  'barbell-squat':          { beginner: 0.75, novice: 1.25, intermediate: 1.5,  advanced: 2.0,  elite: 2.5 },
  'barbell-bench-press':    { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.5,  elite: 2.0 },
  'barbell-deadlift':       { beginner: 1.0,  novice: 1.5,  intermediate: 2.0,  advanced: 2.5,  elite: 3.0 },
  'barbell-overhead-press': { beginner: 0.35, novice: 0.55, intermediate: 0.75, advanced: 1.0,  elite: 1.5 },
  'barbell-row':            { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.25, elite: 1.5 },
}

function classify(slug: LiftSlug, ratio: number): { tier: StrengthTier; nextTierAt: number | null } {
  const t = THRESHOLDS[slug]
  if (ratio >= t.elite)        return { tier: 'elite',        nextTierAt: null }
  if (ratio >= t.advanced)     return { tier: 'advanced',     nextTierAt: t.elite }
  if (ratio >= t.intermediate) return { tier: 'intermediate', nextTierAt: t.advanced }
  if (ratio >= t.novice)       return { tier: 'novice',       nextTierAt: t.intermediate }
  return { tier: 'beginner', nextTierAt: t.novice }
}

export async function getStrengthRatios(
  supabase: SupabaseClient,
  userId: string,
  bodyweightKg: number,
): Promise<StrengthRatio[]> {
  if (!bodyweightKg || bodyweightKg <= 0) return []

  const { data: exData } = await supabase
    .from('exercises')
    .select('id, slug, name, name_ru')
    .in('slug', LIFTS)

  const exercises = (exData ?? []) as Array<{
    id: string
    slug: LiftSlug
    name: string
    name_ru: string | null
  }>
  if (exercises.length === 0) return []

  const ids = exercises.map(e => e.id)
  const { data: setData } = await supabase
    .from('set_entries')
    .select('exercise_id, calculated_1rm')
    .eq('user_id', userId)
    .in('exercise_id', ids)
    .not('calculated_1rm', 'is', null)

  const bestByExercise = new Map<string, number>()
  for (const row of (setData ?? []) as Array<{ exercise_id: string; calculated_1rm: number | null }>) {
    if (row.calculated_1rm == null) continue
    const cur = bestByExercise.get(row.exercise_id) ?? 0
    if (row.calculated_1rm > cur) bestByExercise.set(row.exercise_id, row.calculated_1rm)
  }

  const out: StrengthRatio[] = []
  for (const ex of exercises) {
    const best = bestByExercise.get(ex.id)
    if (!best || best <= 0) continue
    const ratio = best / bodyweightKg
    const { tier, nextTierAt } = classify(ex.slug, ratio)
    out.push({
      exerciseSlug: ex.slug,
      exerciseName: ex.name,
      exerciseNameRu: ex.name_ru,
      bestE1rm: Math.round(best * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
      tier,
      nextTierAt,
    })
  }

  // Order: squat, bench, deadlift, OHP, row
  const order = new Map(LIFTS.map((s, i) => [s, i]))
  out.sort((a, b) => (order.get(a.exerciseSlug)! - order.get(b.exerciseSlug)!))
  return out
}
