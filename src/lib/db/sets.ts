import type { SupabaseClient } from '@supabase/supabase-js'
import type { SetEntry } from '@/lib/types/models'

export async function addSet(
  supabase: SupabaseClient,
  data: {
    sessionId: string
    userId: string
    exerciseId: string
    setNumber: number
    weightKg: number
    reps: number
    rpe?: number
    calculated1rm: number | null
    isWarmup?: boolean
  },
): Promise<SetEntry> {
  const { data: set, error } = await supabase
    .from('set_entries')
    .insert({
      session_id: data.sessionId,
      user_id: data.userId,
      exercise_id: data.exerciseId,
      set_number: data.setNumber,
      weight_kg: data.weightKg,
      reps: data.reps,
      rpe: data.rpe ?? null,
      calculated_1rm: data.calculated1rm,
      is_warmup: data.isWarmup ?? false,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return set as SetEntry
}

export async function getSetsForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<SetEntry[]> {
  const { data } = await supabase
    .from('set_entries')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at')
  return (data as SetEntry[]) ?? []
}

export async function updateSet(
  supabase: SupabaseClient,
  setId: string,
  userId: string,
  patch: { weightKg: number; reps: number; rpe?: number | null; calculated1rm: number | null },
): Promise<SetEntry> {
  const { data, error } = await supabase
    .from('set_entries')
    .update({
      weight_kg: patch.weightKg,
      reps: patch.reps,
      rpe: patch.rpe ?? null,
      calculated_1rm: patch.calculated1rm,
    })
    .eq('id', setId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as SetEntry
}

export async function deleteSet(
  supabase: SupabaseClient,
  setId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('set_entries')
    .delete()
    .eq('id', setId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getVolumeHistoryForExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
): Promise<{ date: string; volume_kg: number; sets: number }[]> {
  const { data } = await supabase
    .from('set_entries')
    .select('created_at, weight_kg, reps')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .order('created_at')

  if (!data) return []

  const byDay = new Map<string, { volume_kg: number; sets: number }>()
  for (const row of data) {
    const day = (row.created_at as string).slice(0, 10)
    const vol = (row.weight_kg as number) * (row.reps as number)
    const prev = byDay.get(day) ?? { volume_kg: 0, sets: 0 }
    byDay.set(day, { volume_kg: prev.volume_kg + vol, sets: prev.sets + 1 })
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    volume_kg: Math.round(v.volume_kg),
    sets: v.sets,
  }))
}

export async function getLastSetsForExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  currentSessionId: string,
): Promise<SetEntry[]> {
  const { data: prevSets } = await supabase
    .from('set_entries')
    .select('*, workout_sessions!inner(finished_at)')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .neq('session_id', currentSessionId)
    .not('workout_sessions.finished_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!prevSets || prevSets.length === 0) return []

  const lastSessionId = prevSets[0].session_id
  return prevSets.filter((s) => s.session_id === lastSessionId) as SetEntry[]
}

/**
 * Distinct exercises the user has actually logged sets for, most recent
 * first. Pickers use this so users aren't offered a catalog of hundreds of
 * exercises they never did.
 */
export async function getPerformedExerciseIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20000)

  const seen = new Set<string>()
  const ids: string[] = []
  for (const row of data ?? []) {
    if (!seen.has(row.exercise_id)) {
      seen.add(row.exercise_id)
      ids.push(row.exercise_id)
    }
  }
  return ids
}

/**
 * Heaviest working-set weight the user has actually lifted for an exercise.
 * The app tracks progress by real top weight, not by estimated 1RM.
 */
export async function getBestWeightForExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  excludeSetId?: string,
): Promise<number | null> {
  let query = supabase
    .from('set_entries')
    .select('weight_kg')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .order('weight_kg', { ascending: false })
    .limit(1)

  if (excludeSetId) query = query.neq('id', excludeSetId)

  const { data } = await query.maybeSingle()
  return data?.weight_kg ?? null
}

export async function getBestWeightHistory(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
): Promise<{ date: string; best: number }[]> {
  const histories = await getBestWeightHistories(supabase, userId, [exerciseId])
  return histories[exerciseId] ?? []
}

/** Per-day best working-set weight per exercise, oldest day first. */
export async function getBestWeightHistories(
  supabase: SupabaseClient,
  userId: string,
  exerciseIds: string[],
): Promise<Record<string, { date: string; best: number }[]>> {
  if (exerciseIds.length === 0) return {}
  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, created_at, weight_kg')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .eq('is_warmup', false)
    .gt('weight_kg', 0)
    .order('created_at')

  if (!data) return {}

  const byExercise = new Map<string, Map<string, number>>()
  for (const row of data) {
    const byDay = byExercise.get(row.exercise_id) ?? new Map<string, number>()
    const day = row.created_at.slice(0, 10)
    const current = byDay.get(day) ?? 0
    if (row.weight_kg > current) byDay.set(day, row.weight_kg)
    byExercise.set(row.exercise_id, byDay)
  }

  return Object.fromEntries(
    [...byExercise].map(([exerciseId, byDay]) => [
      exerciseId,
      Array.from(byDay.entries()).map(([date, best]) => ({ date, best })),
    ]),
  )
}
