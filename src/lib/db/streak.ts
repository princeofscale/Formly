import type { SupabaseClient } from '@supabase/supabase-js'

export async function getFinishedSessionDates(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_finished_session_dates', {
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
  return ((data as Array<{ date: string }> | null) ?? []).map((row) => row.date)
}
