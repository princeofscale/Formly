import type { SupabaseClient } from '@supabase/supabase-js'
import { getSessionSummary } from '@/lib/services/session-summary.service'
import { toCardData, type CardData } from '@/app/api/og/card'

/** The card's date line. Fixed to en-US so a stored snapshot never shifts. */
export function formatCardDate(startedAt: string): string {
  return new Date(startedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** A snapshot missing its required numbers is not renderable. */
export function isCardData(value: unknown): value is CardData {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.dateLabel === 'string' &&
    typeof record.totalVolumeKg === 'number' &&
    typeof record.totalSets === 'number' &&
    typeof record.totalReps === 'number' &&
    typeof record.prCount === 'number' &&
    Array.isArray(record.topExercises)
  )
}

/**
 * Creates, or reuses, the public share for a finished workout.
 *
 * The snapshot is written once and read forever after: the public card must
 * not follow the workout, or editing a set after sharing would silently
 * rewrite what a link already handed out, and deleting the workout would take
 * the card down without the athlete choosing that.
 *
 * Sharing the same workout twice returns the existing link rather than minting
 * a second one, so a previously sent message keeps working and revoking means
 * one thing rather than several.
 */
export async function createWorkoutShare(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<{ token: string } | null> {
  const { data: existing } = await supabase
    .from('workout_shares')
    .select('token')
    .eq('session_id', sessionId)
    .is('revoked_at', null)
    .maybeSingle()
  if (existing?.token) return { token: existing.token as string }

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, started_at, user_id, finished_at')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session || session.user_id !== userId || !session.finished_at) return null

  const summary = await getSessionSummary(supabase, userId, sessionId)
  if (!summary) return null

  const { data, error } = await supabase
    .from('workout_shares')
    .insert({
      user_id: userId,
      session_id: sessionId,
      snapshot: toCardData(summary, formatCardDate(session.started_at as string)),
    })
    .select('token')
    .single()

  if (error || !data?.token) return null
  return { token: data.token as string }
}
