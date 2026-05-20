import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutSession } from '@/lib/types/models'

export async function createSession(
  supabase: SupabaseClient,
  userId: string
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
  sessionId: string
): Promise<WorkoutSession | null> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  return data as WorkoutSession | null
}

export async function getRecentSessions(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
): Promise<WorkoutSession[]> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data as WorkoutSession[]) ?? []
}

export async function getActiveSession(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkoutSession | null> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as WorkoutSession | null
}

export async function finishSession(
  supabase: SupabaseClient,
  sessionId: string,
  totalVolumeKg: number
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
  notes: string | null
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
  mood: number | null
): Promise<void> {
  const safeMood = mood !== null && mood >= 1 && mood <= 5 ? mood : null
  const { error } = await supabase
    .from('workout_sessions')
    .update({ mood_score: safeMood })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

/**
 * Daily tonnage history over the last `days`. Days without a workout are omitted.
 */
export async function getDailyTonnage(
  supabase: SupabaseClient,
  userId: string,
  days = 84
): Promise<{ date: string; tonnage_kg: number }[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at, total_volume_kg')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .gte('started_at', since.toISOString())
    .order('started_at')

  if (!data) return []

  const byDay = new Map<string, number>()
  for (const row of data) {
    const day = (row.started_at as string).slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + (row.total_volume_kg ?? 0))
  }

  return Array.from(byDay.entries()).map(([date, tonnage_kg]) => ({ date, tonnage_kg }))
}
