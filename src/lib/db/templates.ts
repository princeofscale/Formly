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
