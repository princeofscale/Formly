import type { SupabaseClient } from '@supabase/supabase-js'

export type CardioActivity =
  | 'running'
  | 'cycling'
  | 'walking'
  | 'swimming'
  | 'rowing'
  | 'elliptical'
  | 'hiit'
  | 'other'

export interface CardioSession {
  id: string
  user_id: string
  started_at: string
  finished_at: string | null
  session_type: 'strength' | 'cardio'
  cardio_activity: CardioActivity | null
  cardio_duration_seconds: number | null
  cardio_distance_km: number | null
  cardio_avg_hr: number | null
  cardio_calories: number | null
  notes: string | null
}

export async function createCardioSession(
  supabase: SupabaseClient,
  userId: string,
  data: {
    activity: CardioActivity
    durationSeconds: number
    distanceKm?: number | null
    avgHr?: number | null
    calories?: number | null
    notes?: string | null
    startedAt?: string
  },
): Promise<CardioSession> {
  const startedAt = data.startedAt ?? new Date().toISOString()
  const { data: row, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      started_at: startedAt,
      // For cardio we mark it finished immediately — the user logs the whole session post-hoc
      finished_at: new Date().toISOString(),
      session_type: 'cardio',
      cardio_activity: data.activity,
      cardio_duration_seconds: Math.round(data.durationSeconds),
      cardio_distance_km: data.distanceKm ?? null,
      cardio_avg_hr: data.avgHr ?? null,
      cardio_calories: data.calories ?? null,
      notes: data.notes && data.notes.trim() ? data.notes.trim() : null,
      total_volume_kg: 0,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as CardioSession
}

export async function getRecentCardioSessions(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
): Promise<CardioSession[]> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_type', 'cardio')
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data as CardioSession[]) ?? []
}

export async function deleteCardioSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('session_type', 'cardio')
  if (error) throw new Error(error.message)
}
