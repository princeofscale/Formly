import type { SetEntry, ProgressionSuggestion } from '@/lib/types/models'

export function getProgressionSuggestion(
  sets: SetEntry[],
  exerciseId: string,
  exerciseName: string,
  minReps: number,
  maxReps: number
): ProgressionSuggestion | null {
  if (sets.length === 0) return null

  const allHitTopRange = sets.every(s => s.reps >= maxReps)
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
