// Generates a warm-up ramp before a working set. Standard scheme used by
// most intermediate lifters: 50% / 70% / 85% of the working weight with
// descending rep counts. Skips warm-ups entirely for very light working
// weights (< 30 kg) where you'd just be wasting time.

export interface WarmupSet {
  weightKg: number
  reps: number
}

export function calculateWarmupSets(workingWeightKg: number): WarmupSet[] {
  if (!Number.isFinite(workingWeightKg) || workingWeightKg < 30) return []

  // Step size keyed off the *working* weight, not each warmup individually,
  // so a heavy ramp uses 5 kg precision throughout (no mixed 97.5 / 100 jumps).
  const step = workingWeightKg >= 100 ? 5 : 2.5

  // Three-step ramp; same scheme RP / 5-3-1 / Greg Nuckols use for the
  // intermediate weight range. Top warm-up at 85% × 3 is the "pre-work" set.
  const plan: Array<{ pct: number; reps: number }> = [
    { pct: 0.5, reps: 8 },
    { pct: 0.7, reps: 5 },
    { pct: 0.85, reps: 3 },
  ]

  return plan.map(({ pct, reps }) => ({
    weightKg: Math.max(0, Math.round((workingWeightKg * pct) / step) * step),
    reps,
  }))
}

/** The fields needed to tell a ramp set apart from a working set. */
export interface LoggedSetShape {
  session_id: string
  exercise_id: string
  weight_kg: number
  created_at: string
  is_warmup?: boolean | null
}

/** Under this share of the day's top weight, a set is a ramp — not work. */
const WARMUP_WEIGHT_RATIO = 0.7

/**
 * Drops warm-up sets before the numbers reach analytics or the AI coach.
 *
 * Rows flagged `is_warmup` always go. Where the athlete marked warm-ups by
 * hand, that verdict is final for the exercise — every unflagged set counts as
 * work, however light. Only the exercises with no flag at all fall back to a
 * guess: under 70% of that day's top weight *and* logged before the top set is
 * a ramp. That guess exists for the history logged before the warm-up toggle,
 * where counting ramps turned 5 working sets into 8 and made the coach cry
 * overtraining.
 *
 * Back-off and drop sets are logged *after* the top set, so they survive.
 */
export function dropWarmupSets<T extends LoggedSetShape>(sets: readonly T[]): T[] {
  const byExerciseAndSession = new Map<string, T[]>()
  const marked = new Set<string>()
  for (const set of sets) {
    const key = `${set.session_id}|${set.exercise_id}`
    if (set.is_warmup) {
      marked.add(key)
      continue
    }
    const group = byExerciseAndSession.get(key)
    if (group) group.push(set)
    else byExerciseAndSession.set(key, [set])
  }

  const working = new Set<T>()
  for (const [key, group] of byExerciseAndSession) {
    // The athlete already said which sets were ramps here — don't second-guess.
    if (marked.has(key)) {
      for (const set of group) working.add(set)
      continue
    }

    const top = Math.max(...group.map((s) => s.weight_kg))

    // Bodyweight work logs 0 kg: there is no ramp to detect, so keep it all.
    if (top <= 0) {
      for (const set of group) working.add(set)
      continue
    }

    let topAt = ''
    for (const set of group) {
      if (set.weight_kg === top && (topAt === '' || set.created_at < topAt)) topAt = set.created_at
    }

    for (const set of group) {
      if (set.weight_kg >= top * WARMUP_WEIGHT_RATIO || set.created_at >= topAt) working.add(set)
    }
  }

  return sets.filter((set) => working.has(set))
}
