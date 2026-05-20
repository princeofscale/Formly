'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addSet, getSetsForSession, getBestE1RMForExercise, updateSet, deleteSet } from '@/lib/db/sets'
import { finishSession, updateSessionNotes, updateSessionMood } from '@/lib/db/workouts'
import { searchExercises } from '@/lib/db/exercises'
import { getLastSetsForExercise } from '@/lib/db/sets'
import { createTemplate, updateTemplate } from '@/lib/db/templates'
import { upsertExerciseNote } from '@/lib/db/exercise-notes'
import { upsertExerciseVideo } from '@/lib/db/exercise-videos'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import { detectPRFromHistory } from '@/lib/services/pr.service'
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

  // 1RM is only meaningful for loaded sets. For pure bodyweight (weight=0) we skip it.
  const calculated1rm = data.weightKg > 0 ? calculate1RM(data.weightKg, data.reps) : null

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

  const prResult = calculated1rm != null
    ? detectPRFromHistory(calculated1rm, await getBestE1RMForExercise(supabase, user.id, data.exerciseId, set.id))
    : { is_pr: false, previous_1rm: null, current_1rm: 0, improvement_pct: null }

  return { set, prResult }
}

export async function updateSetAction(data: {
  setId: string
  weightKg: number
  reps: number
  rpe?: number
}): Promise<{ set: SetEntry }> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const calculated1rm = data.weightKg > 0 ? calculate1RM(data.weightKg, data.reps) : null
  const set = await updateSet(supabase, data.setId, user.id, {
    weightKg: data.weightKg,
    reps: data.reps,
    rpe: data.rpe ?? null,
    calculated1rm,
  })
  return { set }
}

export async function deleteSetAction(setId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await deleteSet(supabase, setId, user.id)
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

export async function updateExerciseVideoAction(exerciseId: string, url: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await upsertExerciseVideo(supabase, user.id, exerciseId, url)
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
  await verifySession()
  const supabase = await createClient()

  const allSets = await getSetsForSession(supabase, sessionId)
  const totalVolume = allSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  await finishSession(supabase, sessionId, totalVolume)

  revalidatePath('/dashboard')
  revalidatePath('/history')

  redirect('/history/' + sessionId + '?finished=1')
}
