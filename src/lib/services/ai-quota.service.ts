import type { SupabaseClient } from '@supabase/supabase-js'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any
  const { data, error } = await client.rpc('consume_ai_quota', { p_kind: kind })

  if (error || typeof data?.allowed !== 'boolean' || typeof data?.limit !== 'number') {
    throw new Error('AI quota check failed')
  }
  if (!data.allowed) throw new AiQuotaExceededError(kind, data.limit)
}
