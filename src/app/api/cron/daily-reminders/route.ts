import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscription } from '@/lib/services/web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'
import { getFinishedSessionDates } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'

export const dynamic = 'force-dynamic'

interface ProfileRow {
  id: string
  training_schedule: number[] | null
}

interface SessionRow {
  user_id: string
}

function pickMessage(streak: number): { title: string; body: string } {
  if (streak >= 7) {
    return {
      title: `TrainingAR 🔥 ${streak}`,
      body: `Серия ${streak} тренировок. Не разрывай — сегодня день тренировки!`,
    }
  }
  if (streak >= 3) {
    return {
      title: 'TrainingAR 💪',
      body: `Стрик ${streak}. Сегодня день тренировки — продолжай серию!`,
    }
  }
  return {
    title: 'TrainingAR 💪',
    body: 'Сегодня день тренировки. Не пропусти!',
  }
}

function isoDayOfWeek(date: Date): number {
  const d = date.getUTCDay()
  return d === 0 ? 7 : d
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
  const today = isoDayOfWeek(now)
  const todayIso = now.toISOString().slice(0, 10)

  // 1. Find profiles whose training_schedule includes today
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, training_schedule')
    .contains('training_schedule', [today])

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const candidates = (profilesData as ProfileRow[]) ?? []
  if (candidates.length === 0) {
    return NextResponse.json({ scheduled: 0, sent: 0, skipped: 0 })
  }

  const candidateIds = candidates.map((p) => p.id)

  // 2. Filter out users who already finished a workout today
  const { data: sessionsData } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .in('user_id', candidateIds)
    .not('finished_at', 'is', null)
    .gte('started_at', todayIso + 'T00:00:00Z')

  const completedTodayIds = new Set(((sessionsData as SessionRow[]) ?? []).map((s) => s.user_id))
  const remindIds = candidateIds.filter((id) => !completedTodayIds.has(id))

  if (remindIds.length === 0) {
    return NextResponse.json({
      scheduled: candidates.length,
      sent: 0,
      skipped: candidates.length,
    })
  }

  // 3. Get all active push subscriptions for users who need reminders
  const { data: subsData } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', remindIds)

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

  for (const [userId, userSubs] of subsByUser) {
    const workoutDates = await getFinishedSessionDates(supabase, userId)
    const streak = calculateStreak(workoutDates, scheduleByUser.get(userId) ?? [])
    const payload = { ...pickMessage(streak.current), url: '/dashboard' }

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
  })
}
