import type { SupabaseClient } from '@supabase/supabase-js'

export interface RecentPR {
  exercise_id: string
  exercise_name: string
  exercise_name_ru: string | null
  current_best: number
  previous_best: number
  improvement_pct: number | null
  achieved_at: string
  weight_kg: number
  reps: number
}

export async function getRecentPRs(
  supabase: SupabaseClient,
  userId: string,
  days = 30
): Promise<RecentPR[]> {
  const { data, error } = await supabase.rpc('get_recent_prs', {
    p_user_id: userId,
    p_days: days,
  })
  if (error) {
    console.error('getRecentPRs failed:', error.message)
    return []
  }
  return (data as RecentPR[]) ?? []
}

export interface FriendRecentPR {
  friend_id: string
  friend_code: string | null
  pr_set_id: string
  exercise_id: string
  exercise_name: string
  exercise_name_ru: string | null
  current_best: number
  previous_best: number
  improvement_pct: number | null
  achieved_at: string
  weight_kg: number
  reps: number
  reaction_count: number
  did_react: boolean
}

export async function getFriendsRecentPRs(
  supabase: SupabaseClient,
  days = 14,
): Promise<FriendRecentPR[]> {
  const { data, error } = await supabase.rpc('get_friends_recent_prs', { p_days: days })
  if (error) {
    console.error('getFriendsRecentPRs failed:', error.message)
    return []
  }
  return (data as FriendRecentPR[]) ?? []
}

export async function toggleReaction(
  supabase: SupabaseClient,
  reactorId: string,
  prSetId: string,
): Promise<{ reacted: boolean }> {
  // Check current state; using upsert + delete instead of merge keeps RLS clean.
  const { data: existing } = await supabase
    .from('pr_reactions')
    .select('reactor_id')
    .eq('reactor_id', reactorId)
    .eq('pr_set_id', prSetId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('pr_reactions')
      .delete()
      .eq('reactor_id', reactorId)
      .eq('pr_set_id', prSetId)
    return { reacted: false }
  }

  const { error } = await supabase
    .from('pr_reactions')
    .insert({ reactor_id: reactorId, pr_set_id: prSetId })
  if (error) {
    console.error('insert pr_reaction failed:', error.message)
    return { reacted: false }
  }
  return { reacted: true }
}

/** Look up the PR set's owner + exercise label so we can address the push body. */
export async function getPrSetOwnerAndExercise(
  supabase: SupabaseClient,
  prSetId: string,
): Promise<{ ownerId: string; exerciseName: string | null; exerciseNameRu: string | null } | null> {
  const { data } = await supabase
    .from('set_entries')
    .select('user_id, exercises(name, name_ru)')
    .eq('id', prSetId)
    .maybeSingle()
  if (!data) return null
  const ex = data.exercises as unknown as { name: string; name_ru: string | null } | null
  return {
    ownerId: data.user_id as string,
    exerciseName: ex?.name ?? null,
    exerciseNameRu: ex?.name_ru ?? null,
  }
}
