import type { SupabaseClient } from '@supabase/supabase-js'

export interface ExerciseVideo {
  user_id: string
  exercise_id: string
  url: string
  updated_at: string
}

export async function getExerciseVideosForExercises(
  supabase: SupabaseClient,
  userId: string,
  exerciseIds: string[],
): Promise<Record<string, string>> {
  if (exerciseIds.length === 0) return {}
  const { data } = await supabase
    .from('user_exercise_videos')
    .select('exercise_id, url')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
  const map: Record<string, string> = {}
  for (const row of (data ?? []) as { exercise_id: string; url: string }[]) {
    map[row.exercise_id] = row.url
  }
  return map
}

export async function upsertExerciseVideo(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  url: string,
): Promise<void> {
  const trimmed = url.trim()
  if (trimmed.length === 0) {
    const { error } = await supabase
      .from('user_exercise_videos')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from('user_exercise_videos').upsert(
    {
      user_id: userId,
      exercise_id: exerciseId,
      url: trimmed.slice(0, 500),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,exercise_id' },
  )
  if (error) throw new Error(error.message)
}
