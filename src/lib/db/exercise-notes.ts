import type { SupabaseClient } from '@supabase/supabase-js'
import { unwrapRows } from './unwrap'

/**
 * Notes belong to one workout. A later session with the same exercise starts
 * with an empty note rather than inheriting a remark that has gone stale.
 */
export async function getExerciseNotesForExercises(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  exerciseIds: string[],
): Promise<Record<string, string>> {
  if (exerciseIds.length === 0) return {}
  const result = await supabase
    .from('exercise_notes')
    .select('exercise_id, note')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .in('exercise_id', exerciseIds)
  const map: Record<string, string> = {}
  for (const row of unwrapRows(result, 'exercise notes') as {
    exercise_id: string
    note: string
  }[]) {
    map[row.exercise_id] = row.note
  }
  return map
}

export async function upsertExerciseNote(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  exerciseId: string,
  note: string,
): Promise<void> {
  const trimmed = note.trim()
  if (trimmed.length === 0) {
    const { error } = await supabase
      .from('exercise_notes')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from('exercise_notes').upsert(
    {
      user_id: userId,
      session_id: sessionId,
      exercise_id: exerciseId,
      note: trimmed.slice(0, 1000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,session_id,exercise_id' },
  )
  if (error) throw new Error(error.message)
}
