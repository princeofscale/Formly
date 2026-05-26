import type { SupabaseClient } from '@supabase/supabase-js'

export type AiKind =
  | 'exercise_swap'
  | 'program_generation'
  | 'session_debrief'
  | 'push_hook'
  | 'insights_refresh'

const DAILY_LIMITS: Record<AiKind, number> = {
  exercise_swap: 30,
  program_generation: 8,
  session_debrief: 10,
  push_hook: 5,
  insights_refresh: 6,
}

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

/**
 * Atomically (best-effort) consume one quota slot for an AI feature.
 * Throws `AiQuotaExceededError` if the user is over their daily limit.
 *
 * Race-condition note: at scale this can let through one extra call past
 * the limit because the SELECT-then-UPSERT is not transactional. That's
 * acceptable — the limits exist to bound abuse, not to be airtight.
 */
export async function consumeAiQuota(
  supabase: SupabaseClient,
  userId: string,
  kind: AiKind,
): Promise<void> {
  const limit = DAILY_LIMITS[kind]
  const day = new Date().toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any
  const { data, error } = await client
    .from('ai_call_log')
    .select('count')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('day', day)
    .maybeSingle()

  // If the table doesn't exist yet (e.g. local without migration), don't
  // block AI features — fall through silently. The error surfaces in
  // logs but the user experience isn't broken.
  if (error && !data) {
    if (
      error.code === '42P01' /* relation does not exist */ ||
      error.message?.includes('does not exist')
    ) {
      return
    }
  }

  const current = (data?.count as number | undefined) ?? 0
  if (current >= limit) throw new AiQuotaExceededError(kind, limit)

  await client.from('ai_call_log').upsert({
    user_id: userId,
    kind,
    day,
    count: current + 1,
  })
}
