import type { SupabaseClient } from '@supabase/supabase-js'

export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  body: string
  evidence: string | null
  created_at: string
}

/** Сколько сообщений треда уходит в контекст запроса к модели. */
export const CONTEXT_MESSAGE_LIMIT = 20

/**
 * Последние `limit` сообщений в хронологическом порядке. Тред растёт без
 * ограничений, а в промпт уходит только хвост — иначе стоимость запроса
 * поднималась бы с каждым заданным вопросом.
 */
export function trimConversation(messages: readonly CoachMessage[], limit: number): CoachMessage[] {
  if (messages.length <= limit) return [...messages]
  return messages.slice(messages.length - limit)
}

export async function getCoachThread(
  supabase: SupabaseClient,
  userId: string,
  limit = 100,
): Promise<CoachMessage[]> {
  // Запрос идёт по убыванию, чтобы база взяла свежий хвост по индексу
  // coach_messages_thread_idx вместо чтения всего треда; порядок для показа
  // восстанавливается разворотом.
  const { data, error } = await supabase
    .from('coach_messages')
    .select('id, role, body, evidence, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getCoachThread failed:', error.message)
    return []
  }

  return ((data as CoachMessage[]) ?? []).reverse()
}

export async function appendCoachMessages(
  supabase: SupabaseClient,
  userId: string,
  question: string,
  reply: { body: string; evidence?: string },
): Promise<void> {
  const { error } = await supabase.from('coach_messages').insert([
    { user_id: userId, role: 'user', body: question, evidence: null },
    {
      user_id: userId,
      role: 'assistant',
      body: reply.body,
      evidence: reply.evidence ?? null,
    },
  ])
  if (error) throw new Error(error.message)
}
