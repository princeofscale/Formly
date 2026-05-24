import type { SupabaseClient } from '@supabase/supabase-js'
import type { DayActivity } from '@/lib/types/models'

export async function getFinishedSessionDates(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
  if (!data) return []
  const dates = new Set<string>()
  for (const row of data) {
    dates.add(row.started_at.slice(0, 10))
  }
  return Array.from(dates)
}

export async function getCalendarActivity(
  supabase: SupabaseClient,
  userId: string,
  days = 84,
): Promise<DayActivity[]> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const { data } = await supabase
    .from('set_entries')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const date = row.created_at.slice(0, 10)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  const result: DayActivity[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    result.push({ date: iso, sets: counts.get(iso) ?? 0 })
  }
  return result
}
