'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addSet, getSetsForSession, getBestE1RMForExercise } from '@/lib/db/sets'
import { finishSession, updateSessionNotes, updateSessionMood } from '@/lib/db/workouts'
import { searchExercises } from '@/lib/db/exercises'
import { getLastSetsForExercise } from '@/lib/db/sets'
import { createTemplate, updateTemplate } from '@/lib/db/templates'
import { upsertExerciseNote } from '@/lib/db/exercise-notes'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import { detectPRFromHistory } from '@/lib/services/pr.service'
import { detectAndSaveAchievements } from '@/lib/services/achievements.service'
import type { Exercise, SetEntry, PRResult, TemplateExercise } from '@/lib/types/models'

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

  const calculated1rm = calculate1RM(data.weightKg, data.reps)

  const set = await addSet(supabase, {
    sessionId: data.sessionId,
    userId: user.id,
    exerciseId: data.exerciseId,
    setNumber: data.setNumber,
    weightKg: data.weightKg,
    reps: data.reps,
    rpe: data.rpe,
    calculated1rm,
  })

  const previousBest = await getBestE1RMForExercise(supabase, user.id, data.exerciseId, set.id)
  const prResult = detectPRFromHistory(calculated1rm, previousBest)

  return { set, prResult }
}

export async function searchExercisesAction(query: string, locale: string = 'en'): Promise<Exercise[]> {
  const { user } = await verifySession()
  const supabase = await createClient()
  return searchExercises(supabase, user.id, query, locale)
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

export async function getLastSetsForExerciseAction(exerciseId: string, sessionId: string): Promise<SetEntry[]> {
  const { user } = await verifySession()
  const supabase = await createClient()
  return getLastSetsForExercise(supabase, user.id, exerciseId, sessionId)
}

export async function saveTemplateAction(name: string, exercises: TemplateExercise[]): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await createTemplate(supabase, user.id, name, exercises)
}

export async function updateTemplateAction(templateId: string, exercises: TemplateExercise[]): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await updateTemplate(supabase, user.id, templateId, exercises)
}

export async function finishWorkoutAction(sessionId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const allSets = await getSetsForSession(supabase, sessionId)
  const totalVolume = allSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  await finishSession(supabase, sessionId, totalVolume)

  // Achievement detection is a bonus feature — never let it fail the workout
  let codes = ''
  try {
    const newAchievements = await detectAndSaveAchievements(supabase, user.id)
    codes = newAchievements.map(a => a.code).join(',')
  } catch (e) {
    console.error('[finishWorkout] achievement detection failed:', e)
  }

  revalidatePath('/dashboard')
  revalidatePath('/history')

  const suffix = codes ? '?finished=1&unlocked=' + encodeURIComponent(codes) : '?finished=1'
  redirect('/history/' + sessionId + suffix)
}
