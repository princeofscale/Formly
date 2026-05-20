import type { SupabaseClient } from '@supabase/supabase-js'

export interface RecentPR {
  exercise_id: string
  exercise_name: string
  exercise_name_ru: string | null
  current_best: number
  previous_best: number
  improvement_pct: number | null
  achieved_at: string
  weight_kg: number
  reps: number
}

export async function getRecentPRs(
  supabase: SupabaseClient,
  userId: string,
  days = 30
): Promise<RecentPR[]> {
  const { data, error } = await supabase.rpc('get_recent_prs', {
    p_user_id: userId,
    p_days: days,
  })
  if (error) {
    console.error('getRecentPRs failed:', error.message)
    return []
  }
  return (data as RecentPR[]) ?? []
}
