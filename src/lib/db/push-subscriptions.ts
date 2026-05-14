import type { SupabaseClient } from '@supabase/supabase-js'

export interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}

export interface PushKeys {
  p256dh: string
  auth: string
}

export async function upsertPushSubscription(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  keys: PushKeys,
  userAgent?: string
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent ?? null,
      },
      { onConflict: 'user_id,endpoint' }
    )
  if (error) throw new Error(error.message)
}

export async function deletePushSubscriptionByEndpoint(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
  if (error) throw new Error(error.message)
}

export async function getUserSubscriptions(
  supabase: SupabaseClient,
  userId: string
): Promise<PushSubscriptionRow[]> {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
  return (data as PushSubscriptionRow[]) ?? []
}

export async function hasPushSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return (count ?? 0) > 0
}
