import type { SupabaseClient } from '@supabase/supabase-js'
import type { Exercise, MuscleGroup, Equipment } from '@/lib/types/models'

// List/search payload columns. instructions_* are long free text on the
// imported base (~800 rows) and never shown in lists — keeping them out of
// hot paths saves ~1 MB on the workout page payload.
export const EXERCISE_LIST_COLUMNS =
  'id, name, slug, primary_muscle, secondary_muscles, mechanic, equipment, is_custom, created_by, name_ru, aliases, image_urls'

export async function getExercises(
  supabase: SupabaseClient,
  userId: string,
  filters?: { muscle?: MuscleGroup; equipment?: Equipment },
): Promise<Exercise[]> {
  let query = supabase
    .from('exercises')
    .select(EXERCISE_LIST_COLUMNS)
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('name')

  if (filters?.muscle) query = query.eq('primary_muscle', filters.muscle)
  if (filters?.equipment) query = query.eq('equipment', filters.equipment)

  const { data } = await query
  return (data as Exercise[]) ?? []
}

export async function createExercise(
  supabase: SupabaseClient,
  userId: string,
  data: Omit<Exercise, 'id' | 'is_custom' | 'created_by'>,
): Promise<Exercise> {
  const { data: ex, error } = await supabase
    .from('exercises')
    .insert({ ...data, is_custom: true, created_by: userId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return ex as Exercise
}

export async function updateExercise(
  supabase: SupabaseClient,
  id: string,
  data: Partial<Omit<Exercise, 'id' | 'is_custom' | 'created_by'>>,
): Promise<void> {
  const { error } = await supabase.from('exercises').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteExercise(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
