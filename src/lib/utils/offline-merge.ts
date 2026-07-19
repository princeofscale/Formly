// Merges offline-queued sets into the exercise list after a page reload.
// The cached HTML doesn't know about sets still sitting in IndexedDB —
// this rebuilds the truthful picture. Pure function, covered by tests.

import type { Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import type { QueuedSetRecord } from './offline-queue'

export function mergeQueuedSets(
  exercises: ExerciseWithSets[],
  allExercises: Exercise[],
  queued: QueuedSetRecord[],
  sessionId: string,
): ExerciseWithSets[] {
  const relevant = queued.filter((r) => r.payload.sessionId === sessionId)
  if (relevant.length === 0) return exercises

  // (exerciseId, setNumber) pairs already present server-side — a queued
  // record matching one of these was flushed between render and mount.
  const seen = new Set(
    exercises.flatMap((e) => e.sets.map((s) => `${s.exercise_id}:${s.set_number}`)),
  )

  const result = exercises.map((e) => ({ ...e, sets: [...e.sets] }))
  let changed = false

  for (const record of relevant) {
    const { exerciseId, setNumber, weightKg, reps, rpe } = record.payload
    if (seen.has(`${exerciseId}:${setNumber}`)) continue

    let target = result.find((e) => e.id === exerciseId)
    if (!target) {
      const ex = allExercises.find((e) => e.id === exerciseId)
      if (!ex) continue // unknown exercise — leave in queue, skip in UI
      target = { ...ex, sets: [] }
      result.push(target)
    }

    const synthetic: SetEntry = {
      id: `offline_${record.id}`,
      session_id: sessionId,
      user_id: '',
      exercise_id: exerciseId,
      set_number: setNumber,
      weight_kg: weightKg,
      reps,
      rpe: rpe ?? null,
      calculated_1rm: weightKg > 0 ? calculate1RM(weightKg, reps) : null,
      rest_seconds: null,
      created_at: new Date(record.queuedAt).toISOString(),
    }
    target.sets.push(synthetic)
    seen.add(`${exerciseId}:${setNumber}`)
    changed = true
  }

  return changed ? result : exercises
}
