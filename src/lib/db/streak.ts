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

/**
 * The same dates for many athletes at once, for background sweeps.
 *
 * The hourly reminder run asked once per recipient, so its cost tracked the
 * size of the account list rather than the number of people actually due a
 * reminder. Requires service_role; the RPC refuses anyone else.
 */
export async function getFinishedSessionDatesBulk(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string[]>> {
  const byUser = new Map<string, string[]>()
  if (userIds.length === 0) return byUser

  const { data, error } = await supabase.rpc('get_finished_session_dates_bulk', {
    p_user_ids: userIds,
  })
  if (error) throw new Error(error.message)

  for (const row of (data as Array<{ user_id: string; date: string }> | null) ?? []) {
    const dates = byUser.get(row.user_id) ?? []
    dates.push(row.date)
    byUser.set(row.user_id, dates)
  }
  return byUser
}
