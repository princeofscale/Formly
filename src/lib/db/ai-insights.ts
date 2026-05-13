import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIInsights } from '@/lib/types/models'

export async function getTodayInsights(
  supabase: SupabaseClient,
  userId: string
): Promise<AIInsights | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('ai_insights')
    .select('content')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()
  return (data?.content as AIInsights) ?? null
}

export async function saveInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: AIInsights
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('ai_insights')
    .upsert(
      { user_id: userId, date: today, content: insights, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
  if (error) throw new Error(error.message)
}
