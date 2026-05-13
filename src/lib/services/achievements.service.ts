import type { SupabaseClient } from '@supabase/supabase-js'
import type { Achievement, AchievementCode } from '@/lib/types/models'
import { getFinishedSessionDates } from '@/lib/db/streak'
import { getUnlockedCodes, insertAchievements } from '@/lib/db/achievements'
import { calculateStreak } from './streak.service'

export interface AchievementMeta {
  icon: string
  category: 'sessions' | 'tonnage' | 'streak' | 'pr'
}

export const ACHIEVEMENT_META: Record<AchievementCode, AchievementMeta> = {
  first_workout:  { icon: '🎯', category: 'sessions' },
  sessions_10:    { icon: '💪', category: 'sessions' },
  sessions_50:    { icon: '🔥', category: 'sessions' },
  sessions_100:   { icon: '👑', category: 'sessions' },
  tonnage_1000:   { icon: '🏋', category: 'tonnage' },
  tonnage_10000:  { icon: '⚡', category: 'tonnage' },
  tonnage_100000: { icon: '🚀', category: 'tonnage' },
  streak_7:       { icon: '🔥', category: 'streak' },
  streak_30:      { icon: '⚡', category: 'streak' },
  first_pr:       { icon: '🏆', category: 'pr' },
}

export const ALL_ACHIEVEMENT_CODES: AchievementCode[] = Object.keys(ACHIEVEMENT_META) as AchievementCode[]

interface UserStats {
  totalSessions: number
  totalTonnage: number
  currentStreak: number
  hasPR: boolean
}

function evaluateRules(stats: UserStats): AchievementCode[] {
  const earned: AchievementCode[] = []
  if (stats.totalSessions >= 1) earned.push('first_workout')
  if (stats.totalSessions >= 10) earned.push('sessions_10')
  if (stats.totalSessions >= 50) earned.push('sessions_50')
  if (stats.totalSessions >= 100) earned.push('sessions_100')
  if (stats.totalTonnage >= 1000) earned.push('tonnage_1000')
  if (stats.totalTonnage >= 10000) earned.push('tonnage_10000')
  if (stats.totalTonnage >= 100000) earned.push('tonnage_100000')
  if (stats.currentStreak >= 7) earned.push('streak_7')
  if (stats.currentStreak >= 30) earned.push('streak_30')
  if (stats.hasPR) earned.push('first_pr')
  return earned
}

export async function detectAndSaveAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<Achievement[]> {
  const [sessionsResult, profileResult, prCountResult, workoutDates] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('total_volume_kg', { count: 'exact' })
      .eq('user_id', userId)
      .not('finished_at', 'is', null),
    supabase
      .from('profiles')
      .select('training_schedule')
      .eq('id', userId)
      .single(),
    supabase
      .from('set_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('calculated_1rm', 'is', null),
    getFinishedSessionDates(supabase, userId),
  ])

  const totalSessions = sessionsResult.count ?? 0
  const totalTonnage = (sessionsResult.data ?? []).reduce(
    (sum, r) => sum + (r.total_volume_kg ?? 0),
    0
  )
  const hasPR = (prCountResult.count ?? 0) > 0
  const schedule = profileResult.data?.training_schedule ?? []

  const streak = calculateStreak(workoutDates, schedule)

  const eligible = evaluateRules({
    totalSessions,
    totalTonnage,
    currentStreak: streak.current,
    hasPR,
  })

  const unlocked = await getUnlockedCodes(supabase, userId)
  const newCodes = eligible.filter(c => !unlocked.has(c))

  return insertAchievements(supabase, userId, newCodes)
}
