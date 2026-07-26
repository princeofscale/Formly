'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addSet, getBestWeightForExercise, updateSet, deleteSet } from '@/lib/db/sets'
import { updateSessionNotes, updateSessionMood } from '@/lib/db/workouts'
import { getExercises } from '@/lib/db/exercises'
import { pickAlternatives } from '@/lib/services/exercise-alternatives.service'
import { suggestFromCatalog } from '@/lib/services/exercise-suggest.service'
import { consumeAiQuota, AiQuotaExceededError } from '@/lib/services/ai-quota.service'
import { getLocale } from 'next-intl/server'
import { getLastSetsForExercise } from '@/lib/db/sets'
import { createTemplate, updateTemplate } from '@/lib/db/templates'
import { upsertExerciseNote } from '@/lib/db/exercise-notes'
import { upsertExerciseVideo } from '@/lib/db/exercise-videos'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import { detectPRFromHistory } from '@/lib/services/pr.service'
import { notifyFriendsOfPR } from '@/lib/services/pr-notifications.service'
import { calculateWarmupSets } from '@/lib/services/warmup.service'
import { emitWeightPr, maybeEmitStreakMilestone } from '@/lib/services/activity.service'
import { getFinishedSessionDates } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'
import {
  validateReps,
  validateRpe,
  validateSetNumber,
  validateUuid,
  validateWeightKg,
} from '@/lib/utils/validators'
import type { Exercise, SetEntry, PRResult, TemplateExercise } from '@/lib/types/models'
import type { Json } from '@/lib/types/database.types'

export async function saveSetAction(data: {
  sessionId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rpe?: number
}): Promise<{ set: SetEntry; prResult: PRResult }> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const sessionId = validateUuid(data.sessionId, 'sessionId')
  const exerciseId = validateUuid(data.exerciseId, 'exerciseId')
  const setNumber = validateSetNumber(data.setNumber)
  const weightKg = validateWeightKg(data.weightKg)
  const reps = validateReps(data.reps)
  const rpe = validateRpe(data.rpe)

  // 1RM is only meaningful for loaded sets. For pure bodyweight (weight=0) we skip it.
  const calculated1rm = weightKg > 0 ? calculate1RM(weightKg, reps) : null

  const set = await addSet(supabase, {
    sessionId,
    userId: user.id,
    exerciseId,
    setNumber,
    weightKg,
    reps,
    rpe,
    calculated1rm,
  })

  // Records are tracked by the heaviest weight actually lifted, not by
  // an estimated 1RM — estimates mislead, real kilograms don't.
  const prResult =
    weightKg > 0
      ? detectPRFromHistory(
          weightKg,
          await getBestWeightForExercise(supabase, user.id, exerciseId, set.id),
        )
      : { is_pr: false, previous_best: null, current_best: 0, improvement_pct: null }

  if (prResult.is_pr) {
    const { data: ex } = await supabase
      .from('exercises')
      .select('name, name_ru')
      .eq('id', exerciseId)
      .maybeSingle()
    const exerciseName = ex?.name_ru ?? ex?.name ?? 'Упражнение'
    await Promise.allSettled([
      notifyFriendsOfPR(supabase, {
        userId: user.id,
        exerciseName,
        weightKg,
        reps,
        improvementPct: prResult.improvement_pct,
      }),
      emitWeightPr(supabase, {
        userId: user.id,
        sessionId,
        exerciseId,
        exerciseName: ex?.name ?? 'Exercise',
        exerciseNameRu: ex?.name_ru ?? null,
        weightKg,
        reps,
        improvementPct: prResult.improvement_pct,
      }),
    ])
  }

  return { set, prResult }
}

export async function addWarmupSetsAction(data: {
  sessionId: string
  exerciseId: string
  workingWeightKg: number
  startingSetNumber: number
}): Promise<{ sets: SetEntry[] }> {
  await verifySession()
  const supabase = await createClient()

  const sessionId = validateUuid(data.sessionId, 'sessionId')
  const exerciseId = validateUuid(data.exerciseId, 'exerciseId')
  const workingWeightKg = validateWeightKg(data.workingWeightKg)
  const startingSetNumber = validateSetNumber(data.startingSetNumber)

  const plan = calculateWarmupSets(workingWeightKg)
  if (plan.length === 0) return { sets: [] }

  // Insert sequentially so set_number ordering matches the ramp order.
  const { data: inserted, error } = await supabase.rpc('add_warmup_sets', {
    p_session_id: sessionId,
    p_exercise_id: exerciseId,
    p_starting_set_number: startingSetNumber,
    p_sets: plan.map(({ weightKg, reps: warmupReps }) => ({
      weight_kg: weightKg,
      reps: warmupReps,
    })) as Json,
  })
  if (error) throw new Error(error.message)
  return { sets: (inserted as unknown as SetEntry[]) ?? [] }
}

export async function updateSetAction(data: {
  setId: string
  weightKg: number
  reps: number
  rpe?: number
}): Promise<{ set: SetEntry }> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const setId = validateUuid(data.setId, 'setId')
  const weightKg = validateWeightKg(data.weightKg)
  const reps = validateReps(data.reps)
  const rpe = validateRpe(data.rpe)
  const calculated1rm = weightKg > 0 ? calculate1RM(weightKg, reps) : null
  const set = await updateSet(supabase, setId, user.id, {
    weightKg,
    reps,
    rpe: rpe ?? null,
    calculated1rm,
  })
  return { set }
}

export async function deleteSetAction(setId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const id = validateUuid(setId, 'setId')
  await deleteSet(supabase, id, user.id)
}

export async function deleteExerciseFromSessionAction(data: {
  sessionId: string
  exerciseId: string
}): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const sessionId = validateUuid(data.sessionId, 'sessionId')
  const exerciseId = validateUuid(data.exerciseId, 'exerciseId')
  const { error } = await supabase
    .from('set_entries')
    .delete()
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
}

export interface AlternativeWithExercise {
  exercise: Exercise
  reason: string
}

export async function suggestExerciseAlternativesAction(
  exerciseId: string,
): Promise<AlternativeWithExercise[]> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const id = validateUuid(exerciseId, 'exerciseId')
  const locale = (await getLocale()) === 'ru' ? 'ru' : 'en'

  try {
    await consumeAiQuota(supabase, 'exercise_swap')
  } catch (e) {
    if (e instanceof AiQuotaExceededError) return []
    throw e
  }

  const { data: targetRow } = await supabase
    .from('exercises')
    .select('id, name, name_ru, primary_muscle, equipment, mechanic')
    .eq('id', id)
    .maybeSingle()
  if (!targetRow) return []

  // Pull user profile to know what equipment they have access to.
  const { data: profile } = await supabase
    .from('profiles')
    .select('training_location')
    .eq('id', user.id)
    .maybeSingle()
  const location = profile?.training_location ?? 'gym'

  // Candidates = all exercises hitting the same primary muscle (excluding target)
  const allForMuscle = await getExercises(supabase, user.id, {
    muscle: targetRow.primary_muscle,
  })
  let candidates = allForMuscle.filter((c) => c.id !== id)

  // Filter by what equipment is available at user's location.
  if (location === 'home') {
    candidates = candidates.filter(
      (c) => c.equipment === 'dumbbell' || c.equipment === 'bodyweight',
    )
  }
  // 'gym' and 'both' = no equipment filter

  // Cap to keep prompt small + fast
  if (candidates.length > 30) candidates = candidates.slice(0, 30)

  const picks = await pickAlternatives({
    locale,
    target: targetRow as Exercise,
    candidates,
  })

  const byId = new Map(candidates.map((c) => [c.id, c]))
  return picks
    .map((p) => {
      const ex = byId.get(p.exercise_id)
      return ex ? { exercise: ex, reason: p.reason } : null
    })
    .filter((x): x is AlternativeWithExercise => x !== null)
}

export interface ExerciseSuggestion {
  exercise: Exercise
  reason: string
}

export async function suggestExercisesAction(query: string): Promise<ExerciseSuggestion[]> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const q = query.trim().slice(0, 80)
  if (q.length < 2) return []
  const locale = (await getLocale()) === 'ru' ? 'ru' : 'en'

  try {
    await consumeAiQuota(supabase, 'exercise_suggest')
  } catch (e) {
    if (e instanceof AiQuotaExceededError) return []
    throw e
  }

  const catalog = await getExercises(supabase, user.id)
  try {
    const picks = await suggestFromCatalog({ locale, query: q, catalog })
    return picks.map((p) => ({ exercise: catalog[p.index - 1], reason: p.reason }))
  } catch (e) {
    // Mistral down / bad JSON — degrade to "nothing found"; the client then
    // shows the create-custom CTA.
    console.error('suggestExercisesAction:', e)
    return []
  }
}

export async function updateNotesAction(sessionId: string, notes: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const trimmed = notes.length > 2000 ? notes.slice(0, 2000) : notes
  await updateSessionNotes(supabase, sessionId, user.id, trimmed)
}

export async function updateMoodAction(sessionId: string, mood: number | null): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await updateSessionMood(supabase, sessionId, user.id, mood)
}

export async function updateExerciseNoteAction(exerciseId: string, note: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await upsertExerciseNote(supabase, user.id, exerciseId, note)
}

export async function updateExerciseVideoAction(exerciseId: string, url: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await upsertExerciseVideo(supabase, user.id, exerciseId, url)
}

export async function getLastSetsForExerciseAction(
  exerciseId: string,
  sessionId: string,
): Promise<SetEntry[]> {
  const { user } = await verifySession()
  const supabase = await createClient()
  return getLastSetsForExercise(supabase, user.id, exerciseId, sessionId)
}

export async function saveTemplateAction(
  name: string,
  exercises: TemplateExercise[],
): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await createTemplate(supabase, user.id, name, exercises)
}

export async function updateTemplateAction(
  templateId: string,
  exercises: TemplateExercise[],
): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await updateTemplate(supabase, user.id, templateId, exercises)
}

// Mirrors the dashboard's local freeze allowance (src/app/(app)/dashboard/page.tsx,
// STREAK_FREEZES_PER_MONTH) so the streak computed here matches what the user sees
// there. There's no shared export for this value — keep the two in sync manually.
const STREAK_FREEZES_PER_MONTH = 2

export async function finishWorkoutAction(sessionId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const id = validateUuid(sessionId, 'sessionId')
  const { error } = await supabase.rpc('finish_workout', { p_session_id: id })
  if (error) throw new Error(error.message)

  const { data: profile } = await supabase
    .from('profiles')
    .select('training_schedule, time_zone')
    .eq('id', user.id)
    .maybeSingle()
  const schedule: number[] = profile?.training_schedule ?? []
  const timeZone = profile?.time_zone ?? 'UTC'
  const dates = await getFinishedSessionDates(supabase, user.id)
  const streak = calculateStreak(dates, schedule, new Date(), STREAK_FREEZES_PER_MONTH, timeZone)
  await maybeEmitStreakMilestone(supabase, user.id, streak.current)

  revalidatePath('/dashboard')
  revalidatePath('/history')

  redirect('/history/' + sessionId + '?finished=1')
}
