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

function normalizeYo(s: string): string {
  return s.replace(/[ёЁ]/g, (m) => (m === 'ё' ? 'е' : 'Е'))
}

// PostgREST .or() parses commas as OR separators and parentheses as grouping;
// % and \ are special inside ilike; curly braces delimit array literals used
// by the aliases containment filter. Strip these so a malicious search term
// can't escape its filter and inject extra conditions.
export function sanitizeFilterTerm(s: string): string {
  return s
    .replace(/[,()*\\%{}]/g, ' ')
    .slice(0, 64)
    .trim()
}

export async function searchExercises(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  // `locale` is accepted for back-compat but no longer gates search scope.
  // We always search both name and name_ru — a user in EN locale typing a
  // Russian gym term ("молотки") still gets the matching exercise.
  _locale: string = 'en',
): Promise<Exercise[]> {
  void _locale
  const q = sanitizeFilterTerm(normalizeYo(query))
  if (!q) return []
  const filter = `is_custom.eq.false,created_by.eq.${userId}`
  // Search name + name_ru via ILIKE substring, plus aliases via exact array
  // containment (so "бенч" hits an exercise with aliases=['бенч','bench press']).
  // Curly braces inside .or() value need to be inline-escaped for PostgREST.
  const { data } = await supabase
    .from('exercises')
    .select(EXERCISE_LIST_COLUMNS)
    .or(`name.ilike.%${q}%,name_ru.ilike.%${q}%,aliases.cs.{${q.toLowerCase()}}`)
    .or(filter)
    .order('name')
    .limit(20)
  let rows = (data as unknown as Exercise[]) ?? []
  if (rows.length === 0) {
    // Typo fallback: trigram similarity via RPC. RLS still applies (security
    // invoker), the extra filter is defense in depth.
    const { data: fuzzy, error } = await supabase.rpc('search_exercises_fuzzy', { q })
    if (error) throw new Error(error.message)
    rows = ((fuzzy as Exercise[]) ?? []).filter((e) => !e.is_custom || e.created_by === userId)
  }
  return rows
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
