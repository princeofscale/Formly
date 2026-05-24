import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscription } from '@/lib/services/web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'

export const dynamic = 'force-dynamic'

interface SessionRow {
  user_id: string
  started_at: string
}

function isoDayOfWeek(date: Date): number {
  const d = date.getUTCDay()
  return d === 0 ? 7 : d
}

/**
 * Smart reminders fire once at the user's "usual training hour" for the current weekday.
 *
 * Heuristic:
 * - Look at the last 8 weeks of finished sessions per user.
 * - For each ISO weekday, take the median hour (UTC) of the first set started.
 * - If current UTC hour matches that weekday's median, send a push.
 * - Require >= 3 sessions on this weekday in the window (avoid one-offs).
 * - Skip users who already started a session today.
 */
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
  const now = new Date()
  const todayWeekday = isoDayOfWeek(now)
  const currentHour = now.getUTCHours()
  const todayIso = now.toISOString().slice(0, 10)

  // Window: last 8 weeks (56 days)
  const windowStart = new Date(now)
  windowStart.setUTCDate(now.getUTCDate() - 56)

  // Fetch sessions for everyone with a push subscription
  const { data: subsData } = await supabase.from('push_subscriptions').select('*')

  const allSubs = (subsData as PushSubscriptionRow[]) ?? []
  if (allSubs.length === 0) {
    return NextResponse.json({ candidates: 0, sent: 0 })
  }
  const userIds = Array.from(new Set(allSubs.map((s) => s.user_id)))

  // Pull recent sessions in one query
  const { data: sessionsData } = await supabase
    .from('workout_sessions')
    .select('user_id, started_at')
    .in('user_id', userIds)
    .not('finished_at', 'is', null)
    .gte('started_at', windowStart.toISOString())

  const sessions = (sessionsData as SessionRow[]) ?? []

  // Group hours per (user, weekday)
  const hoursByUserDow = new Map<string, number[]>()
  for (const s of sessions) {
    const d = new Date(s.started_at)
    const dow = isoDayOfWeek(d)
    if (dow !== todayWeekday) continue
    const hour = d.getUTCHours()
    const key = s.user_id
    const list = hoursByUserDow.get(key) ?? []
    list.push(hour)
    hoursByUserDow.set(key, list)
  }

  function medianHour(hours: number[]): number {
    const sorted = [...hours].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }

  // Eligible users: median UTC hour for today == currentHour, >=3 samples
  const eligibleUsers: string[] = []
  for (const [userId, hours] of hoursByUserDow) {
    if (hours.length < 3) continue
    if (medianHour(hours) !== currentHour) continue
    eligibleUsers.push(userId)
  }

  if (eligibleUsers.length === 0) {
    return NextResponse.json({
      candidates: hoursByUserDow.size,
      eligible: 0,
      sent: 0,
    })
  }

  // Skip users who already started a session today
  const { data: todaySessions } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .in('user_id', eligibleUsers)
    .gte('started_at', todayIso + 'T00:00:00Z')

  const startedToday = new Set(
    ((todaySessions as { user_id: string }[]) ?? []).map((r) => r.user_id),
  )
  const toNotify = eligibleUsers.filter((id) => !startedToday.has(id))

  if (toNotify.length === 0) {
    return NextResponse.json({
      candidates: hoursByUserDow.size,
      eligible: eligibleUsers.length,
      sent: 0,
      skippedStartedToday: startedToday.size,
    })
  }

  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const s of allSubs) {
    if (!toNotify.includes(s.user_id)) continue
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  const payload = {
    title: 'TrainingAR ⏰',
    body: 'Привычное время тренировки. Готов начать?',
    url: '/workout/new',
  }

  let sent = 0
  let failed = 0
  let expired = 0
  for (const [userId, userSubs] of subsByUser) {
    for (const sub of userSubs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.ok) sent++
      else if (result.expired) {
        expired++
        await deletePushSubscriptionByEndpoint(supabase, userId, sub.endpoint)
      } else failed++
    }
  }

  return NextResponse.json({
    candidates: hoursByUserDow.size,
    eligible: eligibleUsers.length,
    notified: toNotify.length,
    sent,
    failed,
    expired,
  })
}
