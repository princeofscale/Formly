import type { SupabaseClient } from '@supabase/supabase-js'
import { crossedMilestone } from './activity-milestones'

type EventType =
  | 'workout_started'
  | 'workout_finished'
  | 'weight_pr'
  | 'volume_pr'
  | 'streak_milestone'

export async function emitActivityEvent(
  supabase: SupabaseClient,
  type: EventType,
  sessionId: string | null,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.rpc('emit_activity_event', {
      p_type: type,
      p_session_id: sessionId,
      p_payload: payload,
    })
    if (error) console.error('emitActivityEvent failed:', error.message)
  } catch (err) {
    console.error('emitActivityEvent threw:', err)
  }
}

export async function emitWeightPr(
  supabase: SupabaseClient,
  args: {
    sessionId: string | null
    exerciseId: string
    exerciseName: string
    exerciseNameRu: string | null
    weightKg: number
    reps: number
    improvementPct: number | null
  },
): Promise<void> {
  await emitActivityEvent(supabase, 'weight_pr', args.sessionId, {
    exercise_id: args.exerciseId,
    exercise_name: args.exerciseName,
    exercise_name_ru: args.exerciseNameRu,
    weight_kg: args.weightKg,
    reps: args.reps,
    improvement_pct: args.improvementPct,
  })
}

export async function emitWorkoutFinished(
  supabase: SupabaseClient,
  sessionId: string,
  args: { tonnageKg: number; durationMin: number; setCount: number; exerciseCount: number },
): Promise<void> {
  await emitActivityEvent(supabase, 'workout_finished', sessionId, {
    tonnage_kg: Math.round(args.tonnageKg),
    duration_min: args.durationMin,
    set_count: args.setCount,
    exercise_count: args.exerciseCount,
  })
}

export async function emitVolumePr(
  supabase: SupabaseClient,
  sessionId: string,
  tonnageKg: number,
): Promise<void> {
  await emitActivityEvent(supabase, 'volume_pr', sessionId, { tonnage_kg: Math.round(tonnageKg) })
}

export async function maybeEmitStreakMilestone(
  supabase: SupabaseClient,
  userId: string,
  currentStreak: number,
): Promise<void> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('last_streak_milestone')
      .eq('id', userId)
      .maybeSingle()
    const last = data?.last_streak_milestone ?? 0
    const { milestone, resetTo } = crossedMilestone(currentStreak, last)
    if (milestone != null) {
      await emitActivityEvent(supabase, 'streak_milestone', null, { days: milestone })
      await supabase.rpc('set_last_streak_milestone', { p_value: milestone })
    } else if (resetTo != null) {
      await supabase.rpc('set_last_streak_milestone', { p_value: resetTo })
    }
  } catch (err) {
    console.error('maybeEmitStreakMilestone failed:', err)
  }
}
