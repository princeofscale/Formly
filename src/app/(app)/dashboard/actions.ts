'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { generateInsights } from '@/lib/services/grok.service'
import { saveInsights } from '@/lib/db/ai-insights'
import { getWeeklyMuscleVolume, getVolumeLandmarks } from '@/lib/services/analytics.service'
import { getProgressionSuggestion } from '@/lib/services/progression.service'
import { upsertSleep, deleteSleepForDate, getRecentSleep, type SleepLog } from '@/lib/db/sleep'
import type { AIInsights, ProgressionSuggestion, SetEntry } from '@/lib/types/models'

export async function logSleepAction(date: string, hours: number, notes?: string): Promise<SleepLog> {
  const { user } = await verifySession()
  const supabase = await createClient()
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    throw new Error('hours must be between 0 and 24')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid date')
  const result = await upsertSleep(supabase, user.id, date, Math.round(hours * 10) / 10, notes ?? null)
  revalidatePath('/dashboard')
  return result
}

export async function deleteSleepAction(date: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid date')
  await deleteSleepForDate(supabase, user.id, date)
  revalidatePath('/dashboard')
}

interface RecentSetRow {
  id: string
  session_id: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  rpe: number | null
  calculated_1rm: number | null
  rest_seconds: number | null
  user_id: string
  created_at: string
  exercises: { name: string; name_ru: string | null } | null
}

function buildProgressionOpportunities(
  rows: RecentSetRow[],
  locale: 'ru' | 'en'
): ProgressionSuggestion[] {
  // Group sets by exercise; within each exercise, keep only the most recent session
  const byExercise = new Map<string, RecentSetRow[]>()
  const latestSessionPerExercise = new Map<string, string>()

  for (const row of rows) {
    const prevSession = latestSessionPerExercise.get(row.exercise_id)
    if (!prevSession) {
      latestSessionPerExercise.set(row.exercise_id, row.session_id)
      byExercise.set(row.exercise_id, [row])
      continue
    }
    if (prevSession === row.session_id) {
      byExercise.get(row.exercise_id)!.push(row)
    }
    // Skip sets from older sessions — first appearance was newest (rows are DESC)
  }

  const suggestions: ProgressionSuggestion[] = []
  for (const [exerciseId, sets] of byExercise) {
    const setEntries: SetEntry[] = sets.map(s => ({
      id: s.id,
      session_id: s.session_id,
      user_id: s.user_id,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe,
      calculated_1rm: s.calculated_1rm,
      rest_seconds: s.rest_seconds,
      created_at: s.created_at,
    }))
    const ex = sets[0]?.exercises
    const name = (locale === 'ru' ? ex?.name_ru ?? ex?.name : ex?.name) ?? ''
    if (!name) continue
    // Use 12 as the "max reps" threshold (hypertrophy range)
    const suggestion = getProgressionSuggestion(setEntries, exerciseId, name, 8, 12)
    if (suggestion) suggestions.push(suggestion)
    if (suggestions.length >= 5) break
  }
  return suggestions
}

export async function refreshAIInsightsAction(goal?: string): Promise<AIInsights> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'ru' ? 'ru' : 'en'

  const since14days = new Date()
  since14days.setDate(since14days.getDate() - 14)

  const [weeklyVolumes, profileResult, sessionsResult, prsResult, recentSetsResult, recentSleep] = await Promise.all([
    getWeeklyMuscleVolume(supabase, user.id),
    supabase
      .from('profiles')
      .select('age, training_since')
      .eq('id', user.id)
      .single(),
    supabase
      .from('workout_sessions')
      .select('started_at, total_volume_kg')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(7),
    supabase
      .from('set_entries')
      .select('calculated_1rm, exercises(name, name_ru)')
      .eq('user_id', user.id)
      .not('calculated_1rm', 'is', null)
      .order('calculated_1rm', { ascending: false })
      .limit(5),
    supabase
      .from('set_entries')
      .select('id, session_id, exercise_id, set_number, weight_kg, reps, rpe, calculated_1rm, rest_seconds, user_id, created_at, exercises(name, name_ru)')
      .eq('user_id', user.id)
      .gte('created_at', since14days.toISOString())
      .order('created_at', { ascending: false }),
    getRecentSleep(supabase, user.id, 7),
  ])

  const sleepAvg = recentSleep.length > 0
    ? Math.round((recentSleep.reduce((s, r) => s + r.hours, 0) / recentSleep.length) * 10) / 10
    : null

  const volumeLandmarks = getVolumeLandmarks(weeklyVolumes)
  const progressionOpportunities = buildProgressionOpportunities(
    (recentSetsResult.data ?? []) as unknown as RecentSetRow[],
    locale
  )

  const insights = await generateInsights({
    locale,
    profile: {
      age: profileResult.data?.age ?? null,
      training_since: profileResult.data?.training_since ?? null,
      goal: goal ?? null,
    },
    weekly_volumes: weeklyVolumes,
    volume_landmarks: volumeLandmarks,
    recent_sessions: (sessionsResult.data ?? []).map(s => ({
      date: s.started_at.slice(0, 10),
      volume_kg: s.total_volume_kg,
    })),
    top_prs: (prsResult.data ?? []).map(r => {
      const ex = r.exercises as { name: string; name_ru?: string | null } | null
      return {
        exercise: (locale === 'ru' ? ex?.name_ru ?? ex?.name : ex?.name) ?? '',
        e1rm: r.calculated_1rm ?? 0,
      }
    }),
    progression_opportunities: progressionOpportunities,
    sleep: { last7_avg_hours: sleepAvg, nights_logged: recentSleep.length },
  })

  await saveInsights(supabase, user.id, insights)
  return insights
}
