import type { SupabaseClient } from '@supabase/supabase-js'
import { getWeeklyMuscleVolume, getVolumeLandmarks } from './analytics.service'
import { getProgressionSuggestion } from './progression.service'
import type { GrokContext } from './grok.service'
import type { ProgressionSuggestion, SetEntry } from '@/lib/types/models'

/**
 * Компактный снимок тренировочных данных для AI.
 *
 * Раньше эта сборка жила внутри refreshAIInsightsAction. Её вынесли, когда
 * появился чат с коучем: карточка на дашборде и чат обязаны отвечать по одним
 * и тем же данным, а две копии кода неизбежно разошлись бы.
 */

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
  locale: 'ru' | 'en',
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
    const setEntries: SetEntry[] = sets.map((s) => ({
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
    const name = (locale === 'ru' ? (ex?.name_ru ?? ex?.name) : ex?.name) ?? ''
    if (!name) continue
    // Use 12 as the "max reps" threshold (hypertrophy range)
    const suggestion = getProgressionSuggestion(setEntries, exerciseId, name, 8, 12)
    if (suggestion) suggestions.push(suggestion)
    if (suggestions.length >= 5) break
  }
  return suggestions
}

export async function buildTrainingSnapshot(
  supabase: SupabaseClient,
  userId: string,
  locale: 'ru' | 'en',
  goal?: string,
): Promise<GrokContext> {
  const since14days = new Date()
  since14days.setDate(since14days.getDate() - 14)

  const [weeklyVolumes, profileResult, sessionsResult, prsResult, recentSetsResult] =
    await Promise.all([
      getWeeklyMuscleVolume(supabase, userId),
      supabase.from('profiles').select('age, training_since').eq('id', userId).single(),
      supabase
        .from('workout_sessions')
        .select('started_at, total_volume_kg')
        .eq('user_id', userId)
        .not('finished_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(7),
      supabase
        .from('set_entries')
        .select('weight_kg, exercises(name, name_ru)')
        .eq('user_id', userId)
        .eq('is_warmup', false)
        .gt('weight_kg', 0)
        .order('weight_kg', { ascending: false })
        .limit(5),
      supabase
        .from('set_entries')
        .select(
          'id, session_id, exercise_id, set_number, weight_kg, reps, rpe, calculated_1rm, rest_seconds, user_id, created_at, exercises(name, name_ru)',
        )
        .eq('user_id', userId)
        .gte('created_at', since14days.toISOString())
        .order('created_at', { ascending: false }),
    ])

  const volumeLandmarks = getVolumeLandmarks(weeklyVolumes)
  const progressionOpportunities = buildProgressionOpportunities(
    (recentSetsResult.data ?? []) as unknown as RecentSetRow[],
    locale,
  )

  return {
    locale,
    profile: {
      age: profileResult.data?.age ?? null,
      training_since: profileResult.data?.training_since ?? null,
      goal: goal ?? null,
    },
    weekly_volumes: weeklyVolumes,
    volume_landmarks: volumeLandmarks,
    recent_sessions: (sessionsResult.data ?? []).map((s) => ({
      date: s.started_at.slice(0, 10),
      volume_kg: s.total_volume_kg,
    })),
    top_prs: (prsResult.data ?? []).map((r) => {
      // Через unknown: у нетипизированного клиента вложенная связь выводится
      // как массив, хотя запрос возвращает один объект.
      const ex = r.exercises as unknown as { name: string; name_ru?: string | null } | null
      return {
        exercise: (locale === 'ru' ? (ex?.name_ru ?? ex?.name) : ex?.name) ?? '',
        best_weight_kg: r.weight_kg ?? 0,
      }
    }),
    progression_opportunities: progressionOpportunities,
  }
}
