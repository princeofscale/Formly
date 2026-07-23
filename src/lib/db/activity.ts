import type { SupabaseClient } from '@supabase/supabase-js'

export const REACTION_EMOJI = ['🔥', '💪', '👏', '🐐', '🤯'] as const

export interface FeedEvent {
  event_id: string
  author_id: string
  friend_code: string | null
  display_name: string | null
  type: 'workout_started' | 'workout_finished' | 'weight_pr' | 'volume_pr' | 'streak_milestone'
  session_id: string | null
  is_live: boolean
  payload: Record<string, unknown>
  created_at: string
  reactions: Record<string, number>
  my_reactions: string[]
  comment_count: number
}

export interface FeedComment {
  id: string
  user_id: string
  display_name: string | null
  friend_code: string | null
  body: string
  created_at: string
}

export function parseReactions(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const emoji of REACTION_EMOJI) {
    const v = (raw as Record<string, unknown>)[emoji]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[emoji] = v
  }
  return out
}

export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export async function getActivityFeed(
  supabase: SupabaseClient,
  opts: { days?: number; limit?: number; before?: string | null } = {},
): Promise<FeedEvent[]> {
  const { data, error } = await supabase.rpc('get_activity_feed', {
    p_days: opts.days ?? 21,
    p_limit: opts.limit ?? 30,
    p_before: opts.before ?? null,
  })
  if (error) {
    console.error('getActivityFeed failed:', error.message)
    return []
  }
  return ((data ?? []) as FeedEvent[]).map((e) => ({
    ...e,
    reactions: parseReactions(e.reactions),
    my_reactions: Array.isArray(e.my_reactions) ? e.my_reactions : [],
  }))
}

export async function getEventComments(
  supabase: SupabaseClient,
  eventId: string,
): Promise<FeedComment[]> {
  const { data, error } = await supabase.rpc('get_event_comments', { p_event_id: eventId })
  if (error) {
    console.error('getEventComments failed:', error.message)
    return []
  }
  return (data as FeedComment[]) ?? []
}

export async function toggleEventReaction(
  supabase: SupabaseClient,
  eventId: string,
  emoji: string,
): Promise<{ reacted: boolean; authorId: string | null }> {
  const { data, error } = await supabase.rpc('toggle_event_reaction', {
    p_event_id: eventId,
    p_emoji: emoji,
  })
  if (error) {
    console.error('toggleEventReaction failed:', error.message)
    return { reacted: false, authorId: null }
  }
  const row = Array.isArray(data) ? data[0] : data
  return { reacted: !!row?.reacted, authorId: row?.author_id ?? null }
}

export async function addEventComment(
  supabase: SupabaseClient,
  eventId: string,
  body: string,
): Promise<{ commentId: string; authorId: string } | null> {
  const { data, error } = await supabase.rpc('add_event_comment', {
    p_event_id: eventId,
    p_body: body,
  })
  if (error) {
    console.error('addEventComment failed:', error.message)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  return row ? { commentId: row.comment_id, authorId: row.author_id } : null
}

export async function deleteEventComment(
  supabase: SupabaseClient,
  commentId: string,
): Promise<void> {
  const { error } = await supabase.rpc('delete_event_comment', { p_comment_id: commentId })
  if (error) console.error('deleteEventComment failed:', error.message)
}

export async function blockUser(supabase: SupabaseClient, targetId: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', { p_target: targetId })
  if (error) console.error('blockUser failed:', error.message)
}

export async function unblockUser(supabase: SupabaseClient, targetId: string): Promise<void> {
  const { error } = await supabase.rpc('unblock_user', { p_target: targetId })
  if (error) console.error('unblockUser failed:', error.message)
}

export async function setShareActivity(supabase: SupabaseClient, on: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_share_activity', { p_on: on })
  if (error) console.error('setShareActivity failed:', error.message)
}
