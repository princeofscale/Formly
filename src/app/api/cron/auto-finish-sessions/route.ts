// Hourly sweep that finishes workout_sessions abandoned by the user (closed
// tab, lost connection, walked away). Delegates the detection + DB update to
// the auto_finish_stale_sessions RPC and pushes the user a "your session
// was auto-finished" notification per closed session.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscription } from '@/lib/services/web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'

export const dynamic = 'force-dynamic'

interface ClosedSession {
  session_id: string
  user_id: string
  duration_minutes: number
}

const IDLE_HOURS = 4

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('auto_finish_stale_sessions', {
    p_idle_hours: IDLE_HOURS,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const closed = (data as ClosedSession[] | null) ?? []
  if (closed.length === 0) {
    return NextResponse.json({ closed: 0, sent: 0 })
  }

  // Collect all push subscriptions for the affected users in one query, then
  // group per user so we send the right session's body to the right device.
  const userIds = Array.from(new Set(closed.map((c) => c.user_id)))
  const { data: subsData } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
  const subs = (subsData as PushSubscriptionRow[] | null) ?? []

  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const s of subs) {
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  let sent = 0
  let failed = 0
  let expired = 0

  for (const session of closed) {
    const userSubs = subsByUser.get(session.user_id) ?? []
    if (userSubs.length === 0) continue

    const durationLabel =
      session.duration_minutes < 60
        ? `${Math.max(0, session.duration_minutes)} мин`
        : `${(session.duration_minutes / 60).toFixed(1)}ч`

    const payload = {
      title: '🏁 Тренировка завершена',
      body: `Закрыли автоматически — длительность ${durationLabel}, простой ${IDLE_HOURS}ч+.`,
      url: '/history',
    }

    for (const sub of userSubs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.ok) sent++
      else if (result.expired) {
        expired++
        await deletePushSubscriptionByEndpoint(supabase, sub.user_id, sub.endpoint)
      } else {
        failed++
      }
    }
  }

  return NextResponse.json({
    closed: closed.length,
    sent,
    failed,
    expired,
  })
}
