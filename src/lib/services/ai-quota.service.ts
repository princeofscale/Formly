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
