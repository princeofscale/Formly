import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutSession } from '@/lib/types/models'
import { unwrap, unwrapRows } from './unwrap'

export interface WorkoutLifetimeStats {
  total_sessions: number
  total_tonnage_kg: number
}

export async function getWorkoutLifetimeStats(
  supabase: SupabaseClient,
): Promise<WorkoutLifetimeStats> {
  const { data, error } = await supabase.rpc('get_workout_lifetime_stats')
  if (error) throw new Error(error.message)
  const row = (data as WorkoutLifetimeStats[] | null)?.[0]
  return row ?? { total_sessions: 0, total_tonnage_kg: 0 }
}

export async function createSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, started_at: new Date().toISOString(), total_volume_kg: 0 })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as WorkoutSession
}

export async function getSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<WorkoutSession | null> {
  // maybeSingle, not single: callers treat null as "no such workout" and
  // answer 404, while `single()` reports a missing row as an error, which
  // unwrap would raise. Absence and failure have to stay distinguishable.
  const result = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  return unwrap(result, 'workout session') as WorkoutSession | null
}

export async function getRecentSessions(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
  offset = 0,
): Promise<WorkoutSession[]> {
  const result = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return unwrapRows(result, 'recent sessions') as WorkoutSession[]
}

export async function getActiveSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkoutSession | null> {
  const result = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return unwrap(result, 'active session') as WorkoutSession | null
}

export async function finishSession(
  supabase: SupabaseClient,
  sessionId: string,
  totalVolumeKg: number,
): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ finished_at: new Date().toISOString(), total_volume_kg: totalVolumeKg })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function updateSessionNotes(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ notes: notes && notes.trim().length > 0 ? notes : null })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function updateSessionMood(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
  mood: number | null,
): Promise<void> {
  const safeMood = mood !== null && mood >= 1 && mood <= 5 ? mood : null
  const { error } = await supabase
    .from('workout_sessions')
    .update({ mood_score: safeMood })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}
