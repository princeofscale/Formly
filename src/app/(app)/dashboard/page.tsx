// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Flame,
  Snowflake,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { MuscleHeatmap } from '@/components/dashboard/MuscleHeatmap'
import { WeeklyStats } from '@/components/dashboard/WeeklyStats'
import { WeekdayStrip } from '@/components/dashboard/WeekdayStrip'
import { getMuscleVolumeForDays } from '@/lib/services/analytics.service'
import { getTodayInsights } from '@/lib/db/ai-insights'
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard'
import { getFinishedSessionDates } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'
import { DeloadBanner } from '@/components/dashboard/DeloadBanner'
import { WeakPointsCard } from '@/components/dashboard/WeakPointsCard'
import { detectWeakPoints } from '@/lib/services/weak-points.service'
import { SleepCard } from '@/components/dashboard/SleepCard'
import { getRecentSleep, getSleepForDate } from '@/lib/db/sleep'
import { PRsCard } from '@/components/dashboard/PRsCard'
import { getRecentPRs } from '@/lib/db/prs'
import { GoalsTeaser } from '@/components/dashboard/GoalsTeaser'
import { getGoalsWithProgress } from '@/lib/db/goals'
import { FriendsTeaser } from '@/components/dashboard/FriendsTeaser'
import { getFriendsWithStats } from '@/lib/db/friends'
import { ActiveSessionBanner } from '@/components/dashboard/ActiveSessionBanner'
import { getActiveSession } from '@/lib/db/workouts'
import { repeatSessionAction } from '@/app/(app)/workout/new/actions'
import { RotateCw } from 'lucide-react'
import { redirect } from 'next/navigation'
import { EmptyDashboardHero } from '@/components/dashboard/EmptyDashboardHero'
import { MOOD_EMOJIS } from '@/components/workout/MoodSelector'

const DELOAD_CYCLE_WEEKS = 5
const WEAK_POINTS_DAYS = 28
const PR_WINDOW_DAYS = 30
const STREAK_FREEZES_PER_MONTH = 2

const MUSCLE_PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ musclePeriod?: string }>
}) {
  const { musclePeriod = '7d' } = await searchParams
  const safeMusclePeriod = MUSCLE_PERIOD_DAYS[musclePeriod] ? musclePeriod : '7d'
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('dashboard')
  const tHistory = await getTranslations('history')
  const locale = await getLocale()

  // Close any abandoned session before we read it back — otherwise the
  // dashboard would still show an ActiveSessionBanner for a 16-hour-stale
  // session until the daily cron runs. RPC is scoped to auth.uid() so we
  // can only ever close our own.
  // ESLint/TS cast: generated database.types predates this RPC.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('finish_my_stale_sessions', { p_idle_hours: 4 })

  const since7days = new Date()
  since7days.setDate(since7days.getDate() - 7)
  const since14days = new Date()
  since14days.setDate(since14days.getDate() - 14)

  const todayDate = new Date().toISOString().slice(0, 10)

  // Single round-trip for the whole page. Both halves used to await separately,
  // costing one full RTT (~100-200ms on 4G) just for the page to render.
  // For brand-new users some of these queries return empty fast; the saved
  // latency for existing users (the common case) is worth the small waste.
  const [
    sessionsResult,
    profileResult,
    weekResult,
    prevWeekResult,
    prResult,
    initialInsights,
    workoutDates,
    firstSessionResult,
    muscleVolumes,
    weakWindowVolumes,
    todaySleep,
    weekSleep,
    recentPRs,
    goals,
    friends,
    activeSession,
  ] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select(
        'id, started_at, total_volume_kg, finished_at, mood_score, session_type, cardio_activity, cardio_duration_seconds, cardio_distance_km',
      )
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(3),
    supabase.from('profiles').select('training_schedule').eq('id', user.id).single(),
    supabase
      .from('workout_sessions')
      .select('total_volume_kg')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .gte('started_at', since7days.toISOString()),
    supabase
      .from('workout_sessions')
      .select('total_volume_kg')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .gte('started_at', since14days.toISOString())
      .lt('started_at', since7days.toISOString()),
    supabase
      .from('set_entries')
      .select('calculated_1rm')
      .eq('user_id', user.id)
      .not('calculated_1rm', 'is', null)
      .order('calculated_1rm', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getTodayInsights(supabase, user.id),
    getFinishedSessionDates(supabase, user.id),
    supabase
      .from('workout_sessions')
      .select('started_at')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    getMuscleVolumeForDays(supabase, user.id, MUSCLE_PERIOD_DAYS[safeMusclePeriod]),
    getMuscleVolumeForDays(supabase, user.id, WEAK_POINTS_DAYS),
    getSleepForDate(supabase, user.id, todayDate),
    getRecentSleep(supabase, user.id, 7),
    getRecentPRs(supabase, user.id, PR_WINDOW_DAYS),
    getGoalsWithProgress(supabase, user.id),
    getFriendsWithStats(supabase, 7),
    getActiveSession(supabase, user.id),
  ])

  const sessions = sessionsResult.data ?? []
  const profileSchedule = profileResult.data?.training_schedule
  const schedule: number[] = profileSchedule ?? []

  // New user routing:
  //  • training_schedule is null  → never onboarded → push them to /onboarding
  //  • training_schedule is []    → explicitly skipped onboarding, leave on dashboard
  //  • No finished session yet    → show celebratory empty hero (instead of zero-cards)
  if (profileSchedule === null) {
    redirect('/onboarding')
  }
  if (!firstSessionResult.data) {
    const hasSchedule = Array.isArray(profileSchedule) && profileSchedule.length > 0
    return <EmptyDashboardHero hasSchedule={hasSchedule} />
  }

  const streakInfo = calculateStreak(workoutDates, schedule, new Date(), STREAK_FREEZES_PER_MONTH)
  const freezesPerMonth = streakInfo.freezes_per_month ?? 0
  const freezesUsed = streakInfo.freezes_used_this_month ?? 0
  const freezesLeft = Math.max(0, freezesPerMonth - freezesUsed)
  const showFreeze = freezesPerMonth > 0

  // Streak-at-risk: today is a scheduled day, no workout yet, current streak >= 3
  const now = new Date()
  const nowMs = now.getTime()
  const todayIso = now.toISOString().slice(0, 10)
  const jsDay = now.getUTCDay()
  const todayIsoDay = jsDay === 0 ? 7 : jsDay
  const scheduledToday = schedule.includes(todayIsoDay)
  const workedOutToday = workoutDates.includes(todayIso)
  const streakAtRisk = scheduledToday && !workedOutToday && streakInfo.current >= 3
  const weekTonnage = (weekResult.data ?? []).reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const weekSessions = (weekResult.data ?? []).length
  const prevWeekTonnage = (prevWeekResult.data ?? []).reduce(
    (s, r) => s + (r.total_volume_kg ?? 0),
    0,
  )
  const prevWeekSessions = (prevWeekResult.data ?? []).length
  const bestE1rm = prResult.data?.calculated_1rm ?? null

  // Count sets logged in the active session for the banner
  let activeSessionSetCount = 0
  if (activeSession) {
    const { count } = await supabase
      .from('set_entries')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', activeSession.id)
    activeSessionSetCount = count ?? 0
  }
  const weakPoints = detectWeakPoints(weakWindowVolumes, WEAK_POINTS_DAYS / 7, 3)

  const sleepWeekAvg =
    weekSleep.length > 0 ? weekSleep.reduce((s, r) => s + r.hours, 0) / weekSleep.length : null
  const sleepWeekBars: { date: string; hours: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const log = weekSleep.find((r) => r.date === iso)
    sleepWeekBars.push({ date: iso, hours: log?.hours ?? 0 })
  }

  // Deload-week detection: full N-week cycles since first finished session
  const firstSessionDate = firstSessionResult.data?.started_at
    ? new Date(firstSessionResult.data.started_at)
    : null
  let deloadWeekIndex: number | null = null
  if (firstSessionDate) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const weeksSinceFirst = Math.floor((nowMs - firstSessionDate.getTime()) / msPerWeek)
    if (weeksSinceFirst > 0 && weeksSinceFirst % DELOAD_CYCLE_WEEKS === 0) {
      deloadWeekIndex = weeksSinceFirst
    }
  }

  // Get exercise names for each session (first 3 distinct per session)
  const sessionIds = sessions.map((s) => s.id)
  const exerciseTagsMap: Record<string, string[]> = {}
  if (sessionIds.length > 0) {
    const { data: setsData } = await supabase
      .from('set_entries')
      .select('session_id, exercises(name, name_ru)')
      .in('session_id', sessionIds)

    for (const row of setsData ?? []) {
      const ex = row.exercises as { name: string; name_ru?: string | null } | null
      const name = locale === 'ru' ? (ex?.name_ru ?? ex?.name) : ex?.name
      if (!name) continue
      if (!exerciseTagsMap[row.session_id]) exerciseTagsMap[row.session_id] = []
      if (
        !exerciseTagsMap[row.session_id].includes(name) &&
        exerciseTagsMap[row.session_id].length < 3
      ) {
        exerciseTagsMap[row.session_id].push(name)
      }
    }
  }

  const dayLabels = {
    '1': t('today.days.1'),
    '2': t('today.days.2'),
    '3': t('today.days.3'),
    '4': t('today.days.4'),
    '5': t('today.days.5'),
    '6': t('today.days.6'),
    '7': t('today.days.7'),
  }

  // Greeting + name. Profile has no display_name; fall back to email prefix.
  const hour = now.getHours()
  const greetingKey =
    hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const emailPrefix = (user.email ?? '').split('@')[0] ?? ''
  const cleanName = emailPrefix.replace(/[._-]/g, ' ').trim()
  const displayName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : ''

  // ISO week number
  function isoWeek(d: Date) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const day = t.getUTCDay() || 7
    t.setUTCDate(t.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
    return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }
  const weekNum = isoWeek(now)

  const dateLine = now.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  // Counts for the shortcuts grid — reuse data we've already fetched.
  const historyCount = workoutDates.length // finished sessions total
  const recentPRCount = recentPRs.length // last 30 days

  return (
    <div className="space-y-4 sm:space-y-5">
      {activeSession && (
        <ActiveSessionBanner
          sessionId={activeSession.id}
          startedAt={activeSession.started_at}
          setCount={activeSessionSetCount}
        />
      )}

      {/* Hello + streak pill */}
      <div className="tar-d-hello tar-d-rise tar-d-rise-1">
        <div>
          <div className="tar-d-hello-eye">{dateLine}</div>
          <h1 className="tar-d-hello-name">
            {t(`greeting.${greetingKey}`)}
            {displayName ? (
              <>
                ,<br />
                <span>{displayName}</span>
              </>
            ) : null}
          </h1>
        </div>
        <div className="tar-d-streak" title={t('streakDaysLabel')}>
          <Flame className="h-4 w-4" />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignItems: 'flex-start',
              lineHeight: 1,
            }}
          >
            <span className="n">{streakInfo.current}</span>
            <span className="lab">{t('streakDaysLabel')}</span>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <Link
        href={activeSession ? `/workout/${activeSession.id}` : '/workout/new'}
        className="tar-d-cta tar-d-rise tar-d-rise-2"
        role="button"
      >
        <div className="tar-d-cta-head">
          <span className="tar-d-cta-eye">
            <span className="live" />
            {t('ctaCard.ready')}
          </span>
        </div>
        <div className="tar-d-cta-title">
          {activeSession ? t('ctaCard.continue') : t('ctaCard.title')}
        </div>
        <div className="tar-d-cta-sub">
          {activeSession ? t('ctaCard.subActive') : t('ctaCard.sub')}
        </div>
        <div className="tar-d-cta-foot">
          <div style={{ display: 'flex', gap: 18 }}>
            <div className="tar-d-cta-meta">
              <span className="k">{t('ctaCard.duration')}</span>
              <span className="v">~ 45-60 мин</span>
            </div>
            <div className="tar-d-cta-meta">
              <span className="k">{t('ctaCard.focus')}</span>
              <span className="v">
                <Dumbbell className="h-4 w-4 text-[color:var(--tar-brand-2)]" />
                {schedule.length > 0 ? t('today.trainingDay') : t('today.next')}
              </span>
            </div>
          </div>
          <span className="tar-d-cta-go" aria-hidden="true">
            <ChevronRight className="h-5 w-5" />
          </span>
        </div>
      </Link>

      {/* Freezes badge (compact) */}
      {showFreeze && (
        <div className="tar-d-rise tar-d-rise-3 flex items-center justify-end gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            {t('bestStreakShort', { n: streakInfo.longest })}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] font-bold tabular-nums"
            style={{
              background: freezesLeft > 0 ? 'rgba(94,234,212,0.10)' : 'rgba(255,255,255,0.04)',
              border:
                freezesLeft > 0
                  ? '1px solid rgba(94,234,212,0.28)'
                  : '1px solid rgba(255,255,255,0.06)',
              color: freezesLeft > 0 ? '#5EEAD4' : 'rgba(255,255,255,0.4)',
            }}
          >
            <Snowflake className="h-3 w-3" />
            {t('freezesShort', { left: freezesLeft, total: freezesPerMonth })}
          </span>
        </div>
      )}

      {streakAtRisk && (
        <div className="tar-d-rise tar-d-rise-3 flex items-center gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3">
          <Flame className="h-5 w-5 shrink-0 text-red-300" />
          <div className="min-w-0 text-xs">
            <div className="font-bold text-red-200">
              {t('streakAtRiskTitle', { n: streakInfo.current })}
            </div>
            <div className="text-white/45">{t('streakAtRiskSub')}</div>
          </div>
        </div>
      )}

      {deloadWeekIndex !== null && (
        <div className="tar-d-rise tar-d-rise-3">
          <DeloadBanner weekIndex={deloadWeekIndex} cycleWeeks={DELOAD_CYCLE_WEEKS} />
        </div>
      )}

      {/* This week */}
      <div className="tar-d-rise tar-d-rise-3">
        <div className="tar-d-sectionhead">
          {t('thisWeek')}
          <span className="counter">{t('weekShort', { n: weekNum })}</span>
        </div>
        <WeeklyStats
          tonnage={weekTonnage}
          sessions={weekSessions}
          bestE1rm={bestE1rm}
          prevTonnage={prevWeekTonnage}
          prevSessions={prevWeekSessions}
          labels={{
            tonnage: t('week.tonnage'),
            sessions: t('week.sessions'),
            bestE1rm: t('week.bestE1rm'),
          }}
        />
      </div>

      {/* Weekday strip — last 7 days */}
      <div className="tar-d-rise tar-d-rise-4">
        <WeekdayStrip
          workoutDates={workoutDates}
          schedule={schedule}
          labels={{ days: dayLabels }}
        />
      </div>

      {/* Recent activity */}
      <div className="tar-d-rise tar-d-rise-5">
        <div className="tar-d-sectionhead">
          {t('recentTraining')}
          {sessions.length > 0 ? (
            <span className="counter">{t('lastN', { n: sessions.length })}</span>
          ) : null}
        </div>
        {sessions.length > 0 ? (
          <div className="tar-d-feed">
            {sessions.map((s) => {
              const date = new Date(s.started_at)
              const tags = exerciseTagsMap[s.id] ?? []
              const moodEmoji = s.mood_score && MOOD_EMOJIS[s.mood_score]
              const isCardio = s.session_type === 'cardio'
              const cardioMin =
                s.cardio_duration_seconds != null
                  ? Math.round(s.cardio_duration_seconds / 60)
                  : null
              const whenLabel = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                weekday: 'short',
              })
              const title = isCardio
                ? (s.cardio_activity ?? 'Cardio')
                : tags[0]
                  ? tags.slice(0, 2).join(' · ')
                  : t('recentTraining')
              const subParts = isCardio
                ? [
                    cardioMin != null ? `${cardioMin} мин` : null,
                    s.cardio_distance_km != null ? `${s.cardio_distance_km} км` : null,
                  ].filter(Boolean)
                : [
                    `${(s.total_volume_kg ?? 0).toFixed(0)} кг`,
                    tags.length > 2 ? `+${tags.length - 2}` : null,
                  ].filter(Boolean)

              return (
                <div key={s.id} className="flex items-center gap-2">
                  <Link
                    href={isCardio ? '/dashboard' : `/history/${s.id}`}
                    className="tar-d-feed-row flex-1"
                  >
                    <div className="ico" style={isCardio ? { color: '#5EEAD4' } : undefined}>
                      {isCardio ? (
                        <Activity className="h-4 w-4" />
                      ) : (
                        <Dumbbell className="h-4 w-4" />
                      )}
                    </div>
                    <div className="meta">
                      <div className="t">
                        {title}
                        {moodEmoji ? (
                          <span className="ml-2 align-middle text-sm">{moodEmoji}</span>
                        ) : null}
                      </div>
                      <div className="s">
                        {subParts.map((p, i) => (
                          <span key={i}>
                            {i > 0 ? <span className="sep">·</span> : null}
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="end">
                      <span className="when">{whenLabel}</span>
                    </div>
                  </Link>
                  {!isCardio && (
                    <form action={repeatSessionAction}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <button
                        type="submit"
                        aria-label={t('repeatWorkout')}
                        title={t('repeatWorkout')}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/[0.06] hover:text-white active:scale-95 border border-white/[0.08]"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-white/45 px-2">{t('noWorkouts')}</p>
        )}
      </div>

      {/* Shortcuts */}
      <div className="tar-d-rise tar-d-rise-6">
        <div className="tar-d-sectionhead">{t('shortcuts')}</div>
        <div className="tar-d-quick">
          <Link href="/history" className="glass">
            <div className="ico">
              <Calendar />
            </div>
            <div>
              <div className="sub">{t('history')}</div>
              <div className="v">{historyCount}</div>
            </div>
          </Link>
          <Link href="/progress" className="glass">
            <div className="ico">
              <TrendingUp />
            </div>
            <div>
              <div className="sub">{t('progress')}</div>
              <div className="v small">{bestE1rm ? `${Math.round(bestE1rm)} kg` : '—'}</div>
            </div>
          </Link>
          <Link href="/records" className="glass">
            <div className="ico">
              <Trophy />
            </div>
            <div>
              <div className="sub">{t('records')}</div>
              <div className="v">{recentPRCount}</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        <AIInsightsCard initialInsights={initialInsights} />
      </div>

      <details className="group rounded-[28px] bg-card ring-1 ring-white/[0.06] animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200 open:bg-card/95">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 marker:hidden [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold">{t('moreInsights')}</div>
              <div className="truncate text-xs text-white/45">{t('moreInsightsSub')}</div>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-white/[0.06] p-5">
          <section className="grid gap-4 lg:grid-cols-2">
            <SleepCard
              todayDate={todayDate}
              todayHours={todaySleep?.hours ?? null}
              weekAvg={sleepWeekAvg}
              weekDays={sleepWeekBars}
            />
            <WeakPointsCard
              weakPoints={weakPoints}
              muscleLabels={{
                chest: tHistory('muscleLabel.chest'),
                back: tHistory('muscleLabel.back'),
                biceps: tHistory('muscleLabel.biceps'),
                triceps: tHistory('muscleLabel.triceps'),
                forearms: tHistory('muscleLabel.forearms'),
                core: tHistory('muscleLabel.core'),
                quads: tHistory('muscleLabel.quads'),
                hamstrings: tHistory('muscleLabel.hamstrings'),
                glutes: tHistory('muscleLabel.glutes'),
                calves: tHistory('muscleLabel.calves'),
                traps: tHistory('muscleLabel.traps'),
                lats: tHistory('muscleLabel.lats'),
                rear_delts: tHistory('muscleLabel.rear_delts'),
                front_delts: tHistory('muscleLabel.front_delts'),
                side_delts: tHistory('muscleLabel.side_delts'),
              }}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[210ms]">
            <PRsCard prs={recentPRs} windowDays={PR_WINDOW_DAYS} />
            <GoalsTeaser goals={goals} />
          </section>

          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[218ms]">
            <FriendsTeaser friends={friends} />
          </section>

          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[275ms]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <Activity className="h-4 w-4 text-primary" />
                {t('muscleActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MuscleHeatmap
                muscleVolumes={muscleVolumes}
                currentPeriod={safeMusclePeriod}
                periodLabels={{
                  '7d': t('musclePeriods.7d'),
                  '30d': t('musclePeriods.30d'),
                  '90d': t('musclePeriods.90d'),
                }}
                muscleLabels={{
                  chest: tHistory('muscleLabel.chest'),
                  back: tHistory('muscleLabel.back'),
                  biceps: tHistory('muscleLabel.biceps'),
                  triceps: tHistory('muscleLabel.triceps'),
                  forearms: tHistory('muscleLabel.forearms'),
                  core: tHistory('muscleLabel.core'),
                  quads: tHistory('muscleLabel.quads'),
                  hamstrings: tHistory('muscleLabel.hamstrings'),
                  glutes: tHistory('muscleLabel.glutes'),
                  calves: tHistory('muscleLabel.calves'),
                  traps: tHistory('muscleLabel.traps'),
                  lats: tHistory('muscleLabel.lats'),
                  rear_delts: tHistory('muscleLabel.rear_delts'),
                  front_delts: tHistory('muscleLabel.front_delts'),
                  side_delts: tHistory('muscleLabel.side_delts'),
                }}
                clickHint={tHistory('muscleClickHint')}
                setsLabel={tHistory('sets')}
              />
            </CardContent>
          </Card>
        </div>
      </details>

      <Link
        href="/wrapped"
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/[0.04]"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 196, 68, 0.05), rgba(167, 139, 250, 0.04))',
          border: '1px solid rgba(255, 196, 68, 0.18)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: '#FFC044' }}
            >
              {t('wrapped.label')}
            </p>
            <p className="text-sm font-bold text-white">
              {t('wrapped.title', { year: new Date().getUTCFullYear() })}
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-white/40">
          {t('wrapped.cta')}
        </span>
      </Link>

      <div className="flex flex-col items-center gap-2 pb-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/25">
          <Sparkles className="h-3 w-3" />
          {t('coachFooter')}
        </div>
        <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-white/25">
          <Link href="/privacy" className="hover:text-white/55 transition-colors">
            {t('legal.privacy')}
          </Link>
          <span className="text-white/15">·</span>
          <Link href="/terms" className="hover:text-white/55 transition-colors">
            {t('legal.terms')}
          </Link>
        </div>
      </div>
    </div>
  )
}
