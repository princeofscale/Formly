import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutTemplate, TemplateExercise } from '@/lib/types/models'

export async function getTemplates(supabase: SupabaseClient, userId: string): Promise<WorkoutTemplate[]> {
  const { data } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as WorkoutTemplate[]) ?? []
}

export async function getTemplate(supabase: SupabaseClient, userId: string, id: string): Promise<WorkoutTemplate | null> {
  const { data } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  return data as WorkoutTemplate | null
}

export async function createTemplate(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  exercises: TemplateExercise[]
): Promise<WorkoutTemplate> {
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id: userId, name, exercises })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as WorkoutTemplate
}

export async function updateTemplate(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  exercises: TemplateExercise[]
): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .update({ exercises })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function deleteTemplate(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// Distinct exercises performed in a session, ordered by their first set's set_number.
// Used to build a one-click "repeat workout" template.
export async function getSessionExerciseList(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<TemplateExercise[]> {
  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, set_number, exercises(name, name_ru)')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true })

  const seen = new Set<string>()
  const out: TemplateExercise[] = []
  for (const row of (data ?? []) as unknown as Array<{
    exercise_id: string
    exercises: { name: string; name_ru: string | null } | { name: string; name_ru: string | null }[] | null
  }>) {
    if (seen.has(row.exercise_id)) continue
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises
    if (!ex) continue
    seen.add(row.exercise_id)
    out.push({
      exercise_id: row.exercise_id,
      name: ex.name,
      name_ru: ex.name_ru,
    })
  }
  return out
}
