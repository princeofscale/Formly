import type { SupabaseClient } from '@supabase/supabase-js'
import { maybeEmitStreakMilestone } from '@/lib/services/activity.service'
import { getFinishedSessionDates } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'

/**
 * Mirrors the dashboard's local freeze allowance
 * (src/app/(app)/dashboard/page.tsx, STREAK_FREEZES_PER_MONTH) so the streak
 * computed here matches what the athlete sees there. There is no shared export
 * for the dashboard's copy — keep the two in sync manually.
 */
export const STREAK_FREEZES_PER_MONTH = 2

/**
 * Completes a workout and emits everything that completion implies.
 *
 * Both entry points go through here — the button in the app and the queue that
 * flushes a workout finished offline — because they used to diverge: the
 * offline path recomputed tonnage in JavaScript, wrote it with a plain update,
 * and emitted neither the finished-workout and volume-PR events nor the streak
 * milestone. The same workout therefore produced a different result depending
 * on whether the phone had signal.
 *
 * The RPC is the atomic half: tonnage, session row and activity events move
 * together or not at all. The streak milestone sits outside it because it
 * reads the athlete's whole finished history, which the transaction has no
 * reason to hold locks over.
 */
export async function finishWorkout(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<{ error: { message: string; code?: string } | null }> {
  const { error } = await supabase.rpc('finish_workout', { p_session_id: sessionId })
  if (error) return { error }

  const { data: profile } = await supabase
    .from('profiles')
    .select('training_schedule, time_zone')
    .eq('id', userId)
    .maybeSingle()

  const schedule: number[] = profile?.training_schedule ?? []
  const timeZone: string = profile?.time_zone ?? 'UTC'
  const dates = await getFinishedSessionDates(supabase, userId)
  const streak = calculateStreak(dates, schedule, new Date(), STREAK_FREEZES_PER_MONTH, timeZone)
  await maybeEmitStreakMilestone(supabase, userId, streak.current)

  return { error: null }
}
