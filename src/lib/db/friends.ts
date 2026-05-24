import type { SupabaseClient } from '@supabase/supabase-js'

export interface FriendWithStats {
  friend_id: string
  friend_code: string | null
  total_sessions: number
  week_sessions: number
  week_tonnage_kg: number
  last_workout_at: string | null
  best_e1rm: number | null
  is_in_gym: boolean
}

export async function ensureFriendCode(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.rpc('ensure_friend_code')
  if (error) {
    console.error('ensureFriendCode failed:', error.message)
    return null
  }
  return (data as string) ?? null
}

export async function findUserByFriendCode(
  supabase: SupabaseClient,
  code: string,
): Promise<{ id: string; friend_code: string } | null> {
  const { data, error } = await supabase.rpc('find_user_by_friend_code', {
    p_code: code.trim().toUpperCase(),
  })
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null
  const row = Array.isArray(data) ? data[0] : data
  return row as { id: string; friend_code: string }
}

export async function getFriendsWithStats(
  supabase: SupabaseClient,
  days = 7,
): Promise<FriendWithStats[]> {
  const { data, error } = await supabase.rpc('get_friends_with_stats', { p_days: days })
  if (error) {
    console.error('getFriendsWithStats failed:', error.message)
    return []
  }
  return (data as FriendWithStats[]) ?? []
}

export interface PendingFriendRequest {
  friendship_id: string
  requester_id: string
  requester_code: string | null
  created_at: string
}

export async function addFriend(
  supabase: SupabaseClient,
  myUserId: string,
  otherUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (myUserId === otherUserId) return { ok: false, error: 'self' }
  // Canonical ordering — table CHECK enforces user_a::text < user_b::text
  const [user_a, user_b] =
    myUserId < otherUserId ? [myUserId, otherUserId] : [otherUserId, myUserId]
  const { error } = await supabase
    .from('friendships')
    .insert({ user_a, user_b, status: 'pending', requested_by: myUserId })
  if (error) {
    // unique_violation = already friends or pending request already exists
    if (error.code === '23505') return { ok: false, error: 'already' }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function getPendingFriendRequests(
  supabase: SupabaseClient,
): Promise<PendingFriendRequest[]> {
  const { data, error } = await supabase.rpc('get_pending_friend_requests')
  if (error) {
    console.error('getPendingFriendRequests failed:', error.message)
    return []
  }
  return (data as PendingFriendRequest[]) ?? []
}

export async function acceptFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('status', 'pending')
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function declineFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
): Promise<void> {
  // Decline = delete the pending row. Both parties can DELETE per existing RLS.
  await supabase.from('friendships').delete().eq('id', friendshipId).eq('status', 'pending')
}

export async function getFriendIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('status', 'accepted')
  if (error) {
    console.error('getFriendIds failed:', error.message)
    return []
  }
  const rows = (data ?? []) as { user_a: string; user_b: string }[]
  return rows.map((r) => (r.user_a === userId ? r.user_b : r.user_a))
}

export async function removeFriend(
  supabase: SupabaseClient,
  myUserId: string,
  otherUserId: string,
): Promise<void> {
  const [user_a, user_b] =
    myUserId < otherUserId ? [myUserId, otherUserId] : [otherUserId, myUserId]
  await supabase.from('friendships').delete().eq('user_a', user_a).eq('user_b', user_b)
}
