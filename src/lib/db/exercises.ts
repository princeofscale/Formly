import type { SupabaseClient } from '@supabase/supabase-js'
import type { Exercise, MuscleGroup, Equipment } from '@/lib/types/models'

export async function getExercises(
  supabase: SupabaseClient,
  userId: string,
  filters?: { muscle?: MuscleGroup; equipment?: Equipment }
): Promise<Exercise[]> {
  let query = supabase
    .from('exercises')
    .select('*')
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('name')

  if (filters?.muscle) query = query.eq('primary_muscle', filters.muscle)
  if (filters?.equipment) query = query.eq('equipment', filters.equipment)

  const { data } = await query
  return (data as Exercise[]) ?? []
}

export async function searchExercises(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  locale: string = 'en'
): Promise<Exercise[]> {
  const filter = `is_custom.eq.false,created_by.eq.${userId}`
  if (locale === 'ru') {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .or(`name.ilike.%${query}%,name_ru.ilike.%${query}%`)
      .or(filter)
      .order('name')
      .limit(20)
    return (data as Exercise[]) ?? []
  }
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .or(filter)
    .order('name')
    .limit(20)
  return (data as Exercise[]) ?? []
}

export async function createExercise(
  supabase: SupabaseClient,
  userId: string,
  data: Omit<Exercise, 'id' | 'is_custom' | 'created_by'>
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
  data: Partial<Omit<Exercise, 'id' | 'is_custom' | 'created_by'>>
): Promise<void> {
  const { error } = await supabase.from('exercises').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteExercise(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
