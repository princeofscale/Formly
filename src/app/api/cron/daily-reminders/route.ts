import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscription } from '@/lib/services/web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'
import { getFinishedSessionDatesBulk } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'
import {
  dateKeyInTimeZone,
  hourInTimeZone,
  isoWeekday,
  validTimeZoneOrUtc,
} from '@/lib/utils/time-zone'

export const dynamic = 'force-dynamic'

interface ProfileRow {
  id: string
  training_schedule: number[] | null
  locale: 'ru' | 'en'
  time_zone: string
}

interface SessionRow {
  user_id: string
}

function pickMessage(streak: number, locale: 'ru' | 'en'): { title: string; body: string } {
  if (locale === 'en') {
    if (streak >= 7) {
      return {
        title: `Formly 🔥 ${streak}`,
        body: `${streak} workouts in your streak. Today is a training day.`,
      }
    }
    if (streak >= 3) {
      return { title: 'Formly 💪', body: `Your streak is ${streak}. Keep it going today.` }
    }
    return { title: 'Formly 💪', body: 'Today is a training day.' }
  }
  if (streak >= 7) {
    return {
      title: `Formly 🔥 ${streak}`,
      body: `Серия ${streak} тренировок. Не разрывай — сегодня день тренировки!`,
    }
  }
  if (streak >= 3) {
    return {
      title: 'Formly 💪',
      body: `Стрик ${streak}. Сегодня день тренировки — продолжай серию!`,
    }
  }
  return {
    title: 'Formly 💪',
    body: 'Сегодня день тренировки. Не пропусти!',
  }
}

export async function GET(request: Request) {
  // Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
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

  // The route runs hourly; each athlete is considered at 18:00 in their own zone.
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, training_schedule, locale, time_zone')
    .not('training_schedule', 'is', null)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const candidates = ((profilesData as ProfileRow[]) ?? []).filter((profile) => {
    profile.time_zone = validTimeZoneOrUtc(profile.time_zone)
    const localDate = dateKeyInTimeZone(now, profile.time_zone)
    return (
      hourInTimeZone(now, profile.time_zone) === 18 &&
      (profile.training_schedule ?? []).includes(isoWeekday(localDate))
    )
  })
  if (candidates.length === 0) {
    return NextResponse.json({ scheduled: 0, sent: 0, skipped: 0 })
  }

  const candidateIds = candidates.map((p) => p.id)

  const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('user_id, started_at')
    .in('user_id', candidateIds)
    .not('finished_at', 'is', null)
    .gte('started_at', windowStart.toISOString())
  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  const profileByUser = new Map(candidates.map((profile) => [profile.id, profile]))
  const completedTodayIds = new Set(
    ((sessionsData as Array<SessionRow & { started_at: string }>) ?? [])
      .filter((session) => {
        const profile = profileByUser.get(session.user_id)
        return (
          profile &&
          dateKeyInTimeZone(new Date(session.started_at), profile.time_zone) ===
            dateKeyInTimeZone(now, profile.time_zone)
        )
      })
      .map((session) => session.user_id),
  )
  const remindIds = candidateIds.filter((id) => !completedTodayIds.has(id))

  if (remindIds.length === 0) {
    return NextResponse.json({
      scheduled: candidates.length,
      sent: 0,
      skipped: candidates.length,
    })
  }

  // 3. Get all active push subscriptions for users who need reminders
  const { data: subsData, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', remindIds)
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 })
  }

  const subs = (subsData as PushSubscriptionRow[]) ?? []
  if (subs.length === 0) {
    return NextResponse.json({
      scheduled: candidates.length,
      sent: 0,
      skipped: candidates.length - remindIds.length,
      noSubs: remindIds.length,
    })
  }

  // Group subs by user, compute streak once per user
  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const s of subs) {
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  const scheduleByUser = new Map<string, number[]>()
  for (const c of candidates) {
    scheduleByUser.set(c.id, c.training_schedule ?? [])
  }

  let sentCount = 0
  let failedCount = 0
  let expiredCount = 0

  let duplicateCount = 0

  // One round trip for every recipient's history, rather than one per
  // recipient inside the loop below.
  const datesByUser = await getFinishedSessionDatesBulk(supabase, Array.from(subsByUser.keys()))

  // Permits older than two months answer no question anyone will ask again.
  // Pruned from this sweep because it is the one that runs every hour anyway.
  const pruneBefore = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  await supabase
    .from('reminder_deliveries')
    .delete()
    .lt('local_date', dateKeyInTimeZone(pruneBefore, 'UTC'))

  for (const [userId, userSubs] of subsByUser) {
    const profile = profileByUser.get(userId)
    if (!profile) continue

    // The permit is taken before anything is sent. A re-run of this sweep, or
    // an overlap with the smart one, finds the row already there and stays
    // quiet instead of pushing twice in the same local day.
    const { data: claimed } = await supabase.rpc('claim_reminder_delivery', {
      p_user_id: userId,
      p_kind: 'daily',
      p_local_date: dateKeyInTimeZone(now, profile.time_zone),
    })
    if (!claimed) {
      duplicateCount++
      continue
    }

    const workoutDates = datesByUser.get(userId) ?? []
    const streak = calculateStreak(
      workoutDates,
      scheduleByUser.get(userId) ?? [],
      now,
      0,
      profile.time_zone,
    )
    const payload = { ...pickMessage(streak.current, profile.locale), url: '/dashboard' }

    for (const sub of userSubs) {
      const result = await sendPushToSubscription(sub, payload)
      if (result.ok) sentCount++
      else if (result.expired) {
        expiredCount++
        await deletePushSubscriptionByEndpoint(supabase, userId, sub.endpoint)
      } else {
        failedCount++
      }
    }
  }

  return NextResponse.json({
    scheduled: candidates.length,
    completedToday: completedTodayIds.size,
    eligible: remindIds.length,
    devicesSent: sentCount,
    failed: failedCount,
    expired: expiredCount,
    alreadyDelivered: duplicateCount,
  })
}
