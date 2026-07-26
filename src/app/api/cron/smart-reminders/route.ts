import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscription } from '@/lib/services/web-push.service'
import {
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from '@/lib/db/push-subscriptions'
import { generatePushHook, type PushHookContext } from '@/lib/services/push-hook.service'
import {
  dateKeyInTimeZone,
  hourInTimeZone,
  isoWeekday,
  validTimeZoneOrUtc,
} from '@/lib/utils/time-zone'

export const dynamic = 'force-dynamic'

interface SessionRow {
  user_id: string
  started_at: string
}

interface ProfileRow {
  id: string
  locale: 'ru' | 'en'
  time_zone: string
}

/**
 * Smart reminders fire once at the user's "usual training hour" for the current weekday.
 *
 * Heuristic:
 * - Look at the last 8 weeks of finished sessions per user.
 * - For each ISO weekday, take the median local hour of the session start.
 * - If the current local hour matches that weekday's median, send a push.
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

  // Window: last 8 weeks (56 days)
  const windowStart = new Date(now)
  windowStart.setUTCDate(now.getUTCDate() - 56)

  // Fetch sessions for everyone with a push subscription
  const { data: subsData, error: subsError } = await supabase.from('push_subscriptions').select('*')
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 })
  }

  const allSubs = (subsData as PushSubscriptionRow[]) ?? []
  if (allSubs.length === 0) {
    return NextResponse.json({ candidates: 0, sent: 0 })
  }
  const userIds = Array.from(new Set(allSubs.map((s) => s.user_id)))
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, locale, time_zone')
    .in('id', userIds)
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }
  const profileByUser = new Map(
    ((profilesData as ProfileRow[]) ?? []).map((profile) => [
      profile.id,
      { ...profile, time_zone: validTimeZoneOrUtc(profile.time_zone) },
    ]),
  )

  // Pull recent sessions in one query
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('user_id, started_at')
    .in('user_id', userIds)
    .not('finished_at', 'is', null)
    .gte('started_at', windowStart.toISOString())
  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  const sessions = (sessionsData as SessionRow[]) ?? []

  // Group hours per (user, weekday)
  const hoursByUserDow = new Map<string, number[]>()
  for (const s of sessions) {
    const profile = profileByUser.get(s.user_id)
    if (!profile) continue
    const d = new Date(s.started_at)
    const sessionDate = dateKeyInTimeZone(d, profile.time_zone)
    const todayDate = dateKeyInTimeZone(now, profile.time_zone)
    if (isoWeekday(sessionDate) !== isoWeekday(todayDate)) continue
    const hour = hourInTimeZone(d, profile.time_zone)
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
    const profile = profileByUser.get(userId)
    if (!profile) continue
    if (hours.length < 3) continue
    if (medianHour(hours) !== hourInTimeZone(now, profile.time_zone)) continue
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
  const { data: todaySessions, error: todaySessionsError } = await supabase
    .from('workout_sessions')
    .select('user_id, started_at')
    .in('user_id', eligibleUsers)
    .gte('started_at', new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString())
  if (todaySessionsError) {
    return NextResponse.json({ error: todaySessionsError.message }, { status: 500 })
  }

  const startedToday = new Set(
    ((todaySessions as SessionRow[]) ?? [])
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

  // Build personalized hook per user from their recent training data.
  // Falls back to a generic string if the AI call fails for any reason —
  // we never want to skip a notification because of an LLM hiccup.
  const fallbackBody = (locale: 'ru' | 'en') =>
    locale === 'ru'
      ? 'Привычное время тренировки. Готов начать?'
      : 'It is your usual training time. Ready to start?'

  async function buildContext(userId: string, profile: ProfileRow): Promise<PushHookContext> {
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setUTCDate(now.getUTCDate() - 7)

    const { data: lastSessionRows } = await supabase
      .from('workout_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
    const lastStartedAt = (lastSessionRows ?? [])[0]?.started_at as string | undefined
    const lastSessionDaysAgo = lastStartedAt
      ? Math.floor((now.getTime() - new Date(lastStartedAt).getTime()) / 86400000)
      : null

    // Recent sets — get last 30 with exercise + muscle to derive top-N
    const { data: recentSetsData } = await supabase
      .from('set_entries')
      .select('weight_kg, reps, created_at, exercises(name, name_ru, primary_muscle)')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(60)

    const recent = (recentSetsData ?? []) as unknown as Array<{
      weight_kg: number
      reps: number
      created_at: string
      exercises: { name: string; name_ru: string | null; primary_muscle: string } | null
    }>

    const seenExercises = new Map<
      string,
      { name: string; lastWeightKg: number; lastReps: number }
    >()
    const muscleSets = new Map<string, number>()
    for (const r of recent) {
      const ex = r.exercises
      if (!ex) continue
      const name = profile.locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name
      if (!seenExercises.has(name)) {
        seenExercises.set(name, { name, lastWeightKg: r.weight_kg, lastReps: r.reps })
      }
      muscleSets.set(ex.primary_muscle, (muscleSets.get(ex.primary_muscle) ?? 0) + 1)
    }

    const topMuscles = Array.from(muscleSets.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([muscle, sets]) => ({ muscle, sets }))

    const ALL_MUSCLES = [
      'chest',
      'back',
      'quads',
      'hamstrings',
      'glutes',
      'biceps',
      'triceps',
      'shoulders',
    ]
    const underworked = ALL_MUSCLES.filter((m) => (muscleSets.get(m) ?? 0) < 3)

    return {
      locale: profile.locale,
      lastSessionDaysAgo,
      recentExercises: Array.from(seenExercises.values()).slice(0, 5),
      topMusclesByVolumeLast7d: topMuscles,
      underworkedMuscles: underworked,
    }
  }

  // Generate hooks in parallel, capped at 5 concurrent to avoid Mistral rate limits.
  const usersToHook = Array.from(subsByUser.keys())
  const bodyByUser = new Map<string, string>()
  const concurrency = 5
  for (let i = 0; i < usersToHook.length; i += concurrency) {
    const batch = usersToHook.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async (uid) => {
        try {
          const profile = profileByUser.get(uid)
          if (!profile) throw new Error('Profile not found')
          const fallback = fallbackBody(profile.locale)
          const ctx = await buildContext(uid, profile)
          const body = await generatePushHook(ctx, fallback)
          return [uid, body] as const
        } catch {
          const locale = profileByUser.get(uid)?.locale ?? 'ru'
          return [uid, fallbackBody(locale)] as const
        }
      }),
    )
    for (const [uid, body] of results) bodyByUser.set(uid, body)
  }

  let sent = 0
  let failed = 0
  let expired = 0
  for (const [userId, userSubs] of subsByUser) {
    const payload = {
      title: 'Formly ⏰',
      body: bodyByUser.get(userId) ?? fallbackBody(profileByUser.get(userId)?.locale ?? 'ru'),
      url: '/workout/new',
    }
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
