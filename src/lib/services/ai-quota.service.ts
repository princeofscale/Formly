import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/types/database.types'

export type AiKind =
  | 'exercise_swap'
  | 'exercise_suggest'
  | 'program_generation'
  | 'session_debrief'
  | 'push_hook'
  | 'insights_refresh'
  | 'coach_chat'

export class AiQuotaExceededError extends Error {
  readonly kind: AiKind
  readonly limit: number
  constructor(kind: AiKind, limit: number) {
    super(`AI quota exceeded for ${kind} (limit ${limit}/day)`)
    this.kind = kind
    this.limit = limit
    this.name = 'AiQuotaExceededError'
  }
}

export async function consumeAiQuota(supabase: SupabaseClient, kind: AiKind): Promise<void> {
  const { data, error } = await supabase.rpc('consume_ai_quota', { p_kind: kind })
  const result = data as Extract<Json, { [key: string]: Json | undefined }> | null

  if (error || typeof result?.allowed !== 'boolean' || typeof result?.limit !== 'number') {
    throw new Error('AI quota check failed')
  }
  if (!result.allowed) throw new AiQuotaExceededError(kind, result.limit)
}

/**
 * Spends a named athlete's allowance from a background job.
 *
 * A cron sweep runs as service_role with no session, so `consumeAiQuota` — which
 * infers the athlete from `auth.uid()` — cannot charge anyone. That gap is why
 * `push_hook` was a declared quota kind that nothing ever consumed.
 *
 * Returns false instead of throwing: a sweep serves many athletes, and one
 * having spent their allowance is a reason to fall back to a written message
 * for that person, not to abandon the run.
 */
export async function consumeAiQuotaFor(
  supabase: SupabaseClient,
  userId: string,
  kind: AiKind,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_ai_quota_for', {
    p_user_id: userId,
    p_kind: kind,
  })
  const result = data as Extract<Json, { [key: string]: Json | undefined }> | null

  // Fail closed: an unreadable answer must not be treated as permission.
  if (error || typeof result?.allowed !== 'boolean') return false
  return result.allowed
}
