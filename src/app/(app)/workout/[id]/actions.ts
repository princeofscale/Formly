'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addSet, getSetsForSession, getBestE1RMForExercise } from '@/lib/db/sets'
import { finishSession } from '@/lib/db/workouts'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import { detectPRFromHistory } from '@/lib/services/pr.service'
import { getProgressionSuggestion } from '@/lib/services/progression.service'
import type { Exercise, SetEntry, PRResult, ProgressionSuggestion } from '@/lib/types/models'

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

export async function searchExercisesAction(query: string): Promise<Exercise[]> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .or(`is_custom.eq.false,created_by.eq.${user.id}`)
    .order('name')
    .limit(20)

  return (data as Exercise[]) ?? []
}

export async function finishWorkoutAction(
  sessionId: string,
  exercisesWithSets: Array<{ exercise: Exercise; sets: SetEntry[] }>
): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const allSets = await getSetsForSession(supabase, sessionId)
  const totalVolume = allSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  await finishSession(supabase, sessionId, totalVolume)

  revalidatePath('/dashboard')
  revalidatePath('/history')
  redirect('/history/' + sessionId + '?finished=1')
}
