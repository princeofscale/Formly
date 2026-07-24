import type { SupabaseClient } from '@supabase/supabase-js'

export interface ThreadMessage {
  id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
  is_mine: boolean
}

export interface UnreadCount {
  friend_id: string
  unread: number
}

export interface DayGroup {
  dayKey: string
  messages: ThreadMessage[]
}

// Pure: group by local calendar day, preserving the input order.
export function groupMessagesByDay(messages: ThreadMessage[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const m of messages) {
    const d = new Date(m.created_at)
    const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    const last = groups[groups.length - 1]
    if (last && last.dayKey === dayKey) last.messages.push(m)
    else groups.push({ dayKey, messages: [m] })
  }
  return groups
}

export async function sendDirectMessage(
  supabase: SupabaseClient,
  recipientId: string,
  body: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('send_direct_message', {
    p_recipient: recipientId,
    p_body: body,
  })
  if (error) {
    console.error('sendDirectMessage failed:', error.message)
    return null
  }
  return (data as string) ?? null
}

export async function getThread(
  supabase: SupabaseClient,
  friendId: string,
  limit = 50,
): Promise<ThreadMessage[]> {
  const { data, error } = await supabase.rpc('get_thread', {
    p_friend: friendId,
    p_limit: limit,
  })
  if (error) {
    console.error('getThread failed:', error.message)
    return []
  }
  return (data as ThreadMessage[]) ?? []
}

export async function markThreadRead(supabase: SupabaseClient, friendId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_thread_read', { p_friend: friendId })
  if (error) console.error('markThreadRead failed:', error.message)
}

export async function deleteDirectMessage(
  supabase: SupabaseClient,
  messageId: string,
): Promise<void> {
  const { error } = await supabase.rpc('delete_direct_message', { p_message: messageId })
  if (error) console.error('deleteDirectMessage failed:', error.message)
}

export async function getUnreadCounts(supabase: SupabaseClient): Promise<UnreadCount[]> {
  const { data, error } = await supabase.rpc('get_unread_counts')
  if (error) {
    console.error('getUnreadCounts failed:', error.message)
    return []
  }
  return (data as UnreadCount[]) ?? []
}
