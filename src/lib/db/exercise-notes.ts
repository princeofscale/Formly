import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExerciseNote } from '@/lib/types/models'

export async function getExerciseNote(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
): Promise<ExerciseNote | null> {
  const { data } = await supabase
    .from('exercise_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .maybeSingle()
  return (data as ExerciseNote | null) ?? null
}

export async function getExerciseNotesForExercises(
  supabase: SupabaseClient,
  userId: string,
  exerciseIds: string[],
): Promise<Record<string, string>> {
  if (exerciseIds.length === 0) return {}
  const { data } = await supabase
    .from('exercise_notes')
    .select('exercise_id, note')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
  const map: Record<string, string> = {}
  for (const row of (data ?? []) as { exercise_id: string; note: string }[]) {
    map[row.exercise_id] = row.note
  }
  return map
}

export async function upsertExerciseNote(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  note: string,
): Promise<void> {
  const trimmed = note.trim()
  if (trimmed.length === 0) {
    const { error } = await supabase
      .from('exercise_notes')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from('exercise_notes').upsert(
    {
      user_id: userId,
      exercise_id: exerciseId,
      note: trimmed.slice(0, 1000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,exercise_id' },
  )
  if (error) throw new Error(error.message)
}
