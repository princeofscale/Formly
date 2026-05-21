import type { SupabaseClient } from '@supabase/supabase-js'

// Achievements are derived purely from existing data — no migration, no state.
// Each definition has a `compute` that returns { earned, current, target, earnedAt? }.
// Tier achievements (e.g. workouts: 10/50/100) collapse into a single
// definition that reports the next target as the user climbs.

export type AchievementCategory = 'milestone' | 'strength' | 'consistency' | 'tracking'

export interface Achievement {
  id: string
  category: AchievementCategory
  emoji: string
  /** Highest tier reached (1-indexed). 0 means not yet earned. */
  tier: number
  /** Total tiers available. Single-tier achievements report 1. */
  maxTier: number
  /** Current numeric progress (e.g. workouts completed). */
  current: number
  /** Next tier target — null when fully maxed. */
  nextTarget: number | null
  /** Datetime of latest tier earned, if known. */
  earnedAt: string | null
}

interface Ctx {
  totalSessions: number
  totalSessionsAt: Record<number, string | undefined>  // tier threshold -> earned date
  firstFinishedAt: string | null
  longestStreak: number
  streakEarnedAt: Record<number, string | undefined>
  bwBenchRatio: number
  bwSquatRatio: number
  bwDeadliftRatio: number
  earlyMornings: number   // sessions started before 8:00 local
  lateEvenings: number    // sessions started after 21:00 local
  cardioSessions: number
  measurementsLogged: number
  sleepLogged: number
  photosLogged: number
  peakDayTonnage: number
  peakDayTonnageAt: string | null
}

function buildTier(
  id: string,
  category: AchievementCategory,
  emoji: string,
  thresholds: number[],
  current: number,
  earnedDates: Record<number, string | undefined> = {},
): Achievement {
  let tier = 0
  let earnedAt: string | null = null
  for (let i = 0; i < thresholds.length; i++) {
    if (current >= thresholds[i]) {
      tier = i + 1
      earnedAt = earnedDates[thresholds[i]] ?? earnedAt
    } else break
  }
  const nextTarget = tier < thresholds.length ? thresholds[tier] : null
  return {
    id, category, emoji,
    tier, maxTier: thresholds.length,
    current, nextTarget,
    earnedAt,
  }
}

function buildSingle(
  id: string,
  category: AchievementCategory,
  emoji: string,
  target: number,
  current: number,
  earnedAt: string | null = null,
): Achievement {
  const earned = current >= target
  return {
    id, category, emoji,
    tier: earned ? 1 : 0,
    maxTier: 1,
    current,
    nextTarget: earned ? null : target,
    earnedAt: earned ? earnedAt : null,
  }
}

export async function getAchievements(
  supabase: SupabaseClient,
  userId: string,
): Promise<Achievement[]> {
  // --- sessions: count, first, peak day tonnage, time-of-day buckets ---
  const { data: sessionRows } = await supabase
    .from('workout_sessions')
    .select('started_at, finished_at, total_volume_kg, session_type')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: true })

  const sessions = (sessionRows ?? []) as Array<{
    started_at: string
    finished_at: string
    total_volume_kg: number | null
    session_type: string | null
  }>

  // --- bodyweight + best e1rm per big lift ---
  const [profileRes, measurementsCount, sleepCount, photosCount] = await Promise.all([
    supabase.from('profiles').select('weight_kg').eq('id', userId).single(),
    supabase.from('body_measurements').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sleep_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('progress_photos').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const bodyweight = (profileRes.data?.weight_kg as number | null) ?? null

  // Big-lift e1rms via exercise slug
  let bwBench = 0, bwSquat = 0, bwDeadlift = 0
  if (bodyweight && bodyweight > 0) {
    const { data: lifts } = await supabase
      .from('exercises')
      .select('id, slug')
      .in('slug', ['barbell-bench-press', 'barbell-squat', 'barbell-deadlift'])

    const liftMap = new Map<string, string>(
      ((lifts ?? []) as Array<{ id: string; slug: string }>).map(l => [l.id, l.slug]),
    )
    if (liftMap.size > 0) {
      const { data: setData } = await supabase
        .from('set_entries')
        .select('exercise_id, calculated_1rm')
        .eq('user_id', userId)
        .in('exercise_id', Array.from(liftMap.keys()))
        .not('calculated_1rm', 'is', null)

      const bestBySlug: Record<string, number> = {}
      for (const row of (setData ?? []) as Array<{ exercise_id: string; calculated_1rm: number | null }>) {
        if (row.calculated_1rm == null) continue
        const slug = liftMap.get(row.exercise_id)
        if (!slug) continue
        bestBySlug[slug] = Math.max(bestBySlug[slug] ?? 0, row.calculated_1rm)
      }
      bwBench = bestBySlug['barbell-bench-press'] ? bestBySlug['barbell-bench-press'] / bodyweight : 0
      bwSquat = bestBySlug['barbell-squat'] ? bestBySlug['barbell-squat'] / bodyweight : 0
      bwDeadlift = bestBySlug['barbell-deadlift'] ? bestBySlug['barbell-deadlift'] / bodyweight : 0
    }
  }

  // Aggregate session-derived metrics
  const strengthSessions = sessions.filter(s => s.session_type !== 'cardio')
  const cardioSessions = sessions.filter(s => s.session_type === 'cardio').length

  // Streak: longest consecutive-day chain across strength sessions
  const uniqueDays = Array.from(new Set(strengthSessions.map(s => s.started_at.slice(0, 10)))).sort()
  let longestStreak = 0
  let currentStreak = 0
  let prevDay: Date | null = null
  for (const day of uniqueDays) {
    const d = new Date(day + 'T00:00:00Z')
    if (prevDay) {
      const diff = (d.getTime() - prevDay.getTime()) / 86400000
      if (Math.abs(diff - 1) < 0.5) currentStreak += 1
      else currentStreak = 1
    } else currentStreak = 1
    if (currentStreak > longestStreak) longestStreak = currentStreak
    prevDay = d
  }

  let earlyMornings = 0
  let lateEvenings = 0
  let peakDayTonnage = 0
  let peakDayTonnageAt: string | null = null
  const tonnageByDay = new Map<string, number>()
  for (const s of strengthSessions) {
    const d = new Date(s.started_at)
    const hour = d.getHours()
    if (hour < 8) earlyMornings += 1
    if (hour >= 21) lateEvenings += 1
    const day = s.started_at.slice(0, 10)
    tonnageByDay.set(day, (tonnageByDay.get(day) ?? 0) + (s.total_volume_kg ?? 0))
  }
  for (const [day, vol] of tonnageByDay.entries()) {
    if (vol > peakDayTonnage) {
      peakDayTonnage = vol
      peakDayTonnageAt = day
    }
  }

  // Earned-at lookups for tiered count achievements: timestamp of the Nth session
  const totalSessionsAt: Record<number, string | undefined> = {}
  for (const threshold of [1, 10, 50, 100, 250, 500]) {
    if (strengthSessions[threshold - 1]) {
      totalSessionsAt[threshold] = strengthSessions[threshold - 1].started_at
    }
  }

  const ctx: Ctx = {
    totalSessions: strengthSessions.length,
    totalSessionsAt,
    firstFinishedAt: strengthSessions[0]?.started_at ?? null,
    longestStreak,
    streakEarnedAt: {},
    bwBenchRatio: bwBench,
    bwSquatRatio: bwSquat,
    bwDeadliftRatio: bwDeadlift,
    earlyMornings,
    lateEvenings,
    cardioSessions,
    measurementsLogged: measurementsCount.count ?? 0,
    sleepLogged: sleepCount.count ?? 0,
    photosLogged: photosCount.count ?? 0,
    peakDayTonnage,
    peakDayTonnageAt,
  }

  const list: Achievement[] = [
    buildTier(
      'sessions', 'milestone', '🏋️',
      [1, 10, 50, 100, 250, 500],
      ctx.totalSessions,
      ctx.totalSessionsAt,
    ),
    buildTier(
      'streak', 'consistency', '🔥',
      [3, 7, 14, 30, 60, 100],
      ctx.longestStreak,
    ),
    buildSingle('bench_bw',     'strength', '💪', 1.0, ctx.bwBenchRatio),
    buildSingle('squat_1_5bw',  'strength', '🦵', 1.5, ctx.bwSquatRatio),
    buildSingle('deadlift_2bw', 'strength', '⚡', 2.0, ctx.bwDeadliftRatio),
    buildTier(
      'peak_tonnage', 'strength', '💥',
      [2500, 5000, 10000, 15000],
      ctx.peakDayTonnage,
      ctx.peakDayTonnageAt ? { [Math.floor(ctx.peakDayTonnage)]: ctx.peakDayTonnageAt + 'T00:00:00Z' } : {},
    ),
    buildSingle('early_bird', 'consistency', '🌅', 10, ctx.earlyMornings),
    buildSingle('night_owl',  'consistency', '🌙', 10, ctx.lateEvenings),
    buildSingle('cardio_starter', 'tracking', '🏃', 1, ctx.cardioSessions),
    buildSingle('measurements', 'tracking', '📏', 1, ctx.measurementsLogged),
    buildSingle('sleep_week',   'tracking', '😴', 7, ctx.sleepLogged),
    buildSingle('photo_first',  'tracking', '📸', 1, ctx.photosLogged),
  ]

  return list
}
