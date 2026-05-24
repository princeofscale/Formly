import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIInsights } from '@/lib/types/models'

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes("Could not find the table 'public.ai_insights'") === true
  )
}

export async function getTodayInsights(
  supabase: SupabaseClient,
  userId: string,
): Promise<AIInsights | null> {
  const today = new Date().toISOString().slice(0, 10)
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
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('ai_insights')
    .upsert(
      { user_id: userId, date: today, content: insights, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    )
  if (isMissingTableError(error)) return
  if (error) throw new Error(error.message)
}
