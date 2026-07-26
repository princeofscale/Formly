import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIInsights } from '@/lib/types/models'
import { dateKeyInTimeZone } from '@/lib/utils/time-zone'

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes("Could not find the table 'public.ai_insights'") === true
  )
}

export async function getTodayInsights(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
): Promise<AIInsights | null> {
  const today = dateKeyInTimeZone(new Date(), timeZone)
  const { data, error } = await supabase
    .from('ai_insights')
    .select('content')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()
  if (isMissingTableError(error)) return null
  if (error) throw new Error(error.message)
  return (data?.content as AIInsights) ?? null
}

export async function saveInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: AIInsights,
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('time_zone')
    .eq('id', userId)
    .maybeSingle()
  const today = dateKeyInTimeZone(new Date(), profile?.time_zone ?? 'UTC')
  const { error } = await supabase
    .from('ai_insights')
    .upsert(
      { user_id: userId, date: today, content: insights, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    )
  if (isMissingTableError(error)) return
  if (error) throw new Error(error.message)
}
