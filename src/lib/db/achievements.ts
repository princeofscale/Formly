import type { SupabaseClient } from '@supabase/supabase-js'
import type { Achievement, AchievementCode } from '@/lib/types/models'

export async function getAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<Achievement[]> {
  const { data } = await supabase
    .from('achievements')
    .select('code, unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
  return (data as Achievement[]) ?? []
}

export async function getUnlockedCodes(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<AchievementCode>> {
  const { data } = await supabase
    .from('achievements')
    .select('code')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.code as AchievementCode))
}

export async function insertAchievements(
  supabase: SupabaseClient,
  userId: string,
  codes: AchievementCode[]
): Promise<Achievement[]> {
  if (codes.length === 0) return []
  const rows = codes.map(code => ({ user_id: userId, code }))
  const { data, error } = await supabase
    .from('achievements')
    .insert(rows)
    .select('code, unlocked_at')
  if (error) throw new Error(error.message)
  return (data as Achievement[]) ?? []
}
