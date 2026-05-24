import type { SetEntry, ProgressionSuggestion } from '@/lib/types/models'

export function getProgressionSuggestion(
  sets: SetEntry[],
  exerciseId: string,
  exerciseName: string,
  minReps: number,
  maxReps: number,
): ProgressionSuggestion | null {
  if (sets.length === 0) return null

  const allHitTopRange = sets.every((s) => s.reps >= maxReps)
  if (!allHitTopRange) return null

  const currentWeight = sets[0].weight_kg
  const increment = currentWeight >= 100 ? 5 : 2.5
  const suggested = currentWeight + increment

  return {
    exercise_id: exerciseId,
    exercise_name: exerciseName,
    current_weight_kg: currentWeight,
    suggested_weight_kg: suggested,
    reason: `All sets hit ${maxReps} reps — try ${suggested}kg next session`,
  }
}

export type SuggestionAction = 'increase' | 'hold' | 'deload' | 'firstSet'

export interface NextSetSuggestion {
  weightKg: number
  reps: number
  action: SuggestionAction
  /** i18n key under workout.progression.reason */
  reasonKey: string
  /** Filled placeholders for the i18n message */
  reasonParams?: Record<string, number | string>
  lastWeight: number
  lastReps: number
  lastRpe: number | null
}

const STEP = (w: number) => (w >= 100 ? 5 : w >= 40 ? 2.5 : 1.25)

/**
 * Compute a one-tap weight × reps suggestion for the *next* set of an exercise.
 * `sets` should be the user's most recent sets of this exercise (most recent first
 * is fine — we use the last performed one as the anchor).
 *
 * Rules (RPE-aware Linear Progression):
 *  • RPE ≤ 6  → +1 step, target same reps  ("could've done more")
 *  • RPE 7    → +1 step, target same reps  ("on the edge, good progress")
 *  • RPE 8    → +1 step if last reps ≥ original target, else hold
 *  • RPE 9    → hold weight, target same reps  ("near max — keep form")
 *  • RPE 10   → −1 step, target same reps    ("fatigue, deload")
 *  • No RPE info → +1 step if reps ≥ 8, else hold
 *
 *  • If `sets.length === 0` → null (caller suppresses UI for brand-new exercises)
 */
export function suggestNextSet(sets: SetEntry[]): NextSetSuggestion | null {
  if (!sets || sets.length === 0) return null

  // Use the last performed set as the reference (highest set_number from the most recent session)
  const sorted = [...sets].sort((a, b) => {
    if (a.created_at !== b.created_at) return b.created_at.localeCompare(a.created_at)
    return b.set_number - a.set_number
  })
  const last = sorted[0]
  if (!last || last.weight_kg <= 0 || last.reps <= 0) return null

  const step = STEP(last.weight_kg)
  const rpe = last.rpe

  const round = (n: number) => Math.max(0, Math.round(n * 4) / 4) // 0.25kg precision

  let weightKg = last.weight_kg
  const reps = last.reps
  let action: SuggestionAction = 'hold'
  let reasonKey = 'hold'

  if (rpe == null) {
    if (last.reps >= 8) {
      weightKg = round(last.weight_kg + step)
      action = 'increase'
      reasonKey = 'noRpeAddWeight'
    } else {
      reasonKey = 'noRpeHold'
    }
  } else if (rpe <= 6) {
    weightKg = round(last.weight_kg + step)
    action = 'increase'
    reasonKey = 'easySet'
  } else if (rpe === 7) {
    weightKg = round(last.weight_kg + step)
    action = 'increase'
    reasonKey = 'roomToGrow'
  } else if (rpe === 8) {
    if (last.reps >= 8) {
      weightKg = round(last.weight_kg + step)
      action = 'increase'
      reasonKey = 'pushUp'
    } else {
      reasonKey = 'holdReps'
    }
  } else if (rpe === 9) {
    action = 'hold'
    reasonKey = 'nearMax'
  } else {
    // rpe 10 (or > 10 just in case)
    weightKg = round(last.weight_kg - step)
    action = 'deload'
    reasonKey = 'deload'
  }

  return {
    weightKg,
    reps,
    action,
    reasonKey,
    reasonParams: {
      lastWeight: last.weight_kg,
      lastReps: last.reps,
      step,
      rpe: rpe ?? 0,
    },
    lastWeight: last.weight_kg,
    lastReps: last.reps,
    lastRpe: rpe ?? null,
  }
}
