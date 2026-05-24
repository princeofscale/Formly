import type { SupabaseClient } from '@supabase/supabase-js'

export interface SleepLog {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  hours: number
  notes: string | null
  created_at: string
  updated_at: string
}

export async function upsertSleep(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  hours: number,
  notes: string | null = null,
): Promise<SleepLog> {
  const { data, error } = await supabase
    .from('sleep_logs')
    .upsert(
      { user_id: userId, date, hours, notes: notes && notes.trim() ? notes.trim() : null },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as SleepLog
}

export async function getSleepForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<SleepLog | null> {
  const { data } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  return data as SleepLog | null
}

export async function getRecentSleep(
  supabase: SupabaseClient,
  userId: string,
  days = 7,
): Promise<SleepLog[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  const sinceIso = since.toISOString().slice(0, 10)

  const { data } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', sinceIso)
    .order('date', { ascending: false })
  return (data as SleepLog[]) ?? []
}

export async function deleteSleepForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from('sleep_logs')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw new Error(error.message)
}
