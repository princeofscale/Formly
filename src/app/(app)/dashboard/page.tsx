// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Dumbbell, Flame, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { ScheduleStatus } from '@/components/dashboard/ScheduleStatus'
import { MuscleHeatmap } from '@/components/dashboard/MuscleHeatmap'
import { WeeklyStats } from '@/components/dashboard/WeeklyStats'
import { getMuscleVolumeForDays } from '@/lib/services/analytics.service'
import { getTodayInsights } from '@/lib/db/ai-insights'
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard'
import { getFinishedSessionDates, getCalendarActivity } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'
import { StreakCard } from '@/components/dashboard/StreakCard'
import { MOOD_EMOJIS } from '@/components/workout/MoodSelector'

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

  const since7days = new Date()
  since7days.setDate(since7days.getDate() - 7)
  const since14days = new Date()
  since14days.setDate(since14days.getDate() - 14)

  const [sessionsResult, profileResult, weekResult, prevWeekResult, prResult, initialInsights, workoutDates, calendarActivity] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, started_at, total_volume_kg, finished_at, mood_score')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(3),
    supabase
      .from('profiles')
      .select('training_schedule')
      .eq('id', user.id)
      .single(),
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
    getCalendarActivity(supabase, user.id),
  ])

  const sessions = sessionsResult.data ?? []
  const schedule: number[] = profileResult.data?.training_schedule ?? []
  const streakInfo = calculateStreak(workoutDates, schedule)

  // Streak-at-risk: today is a scheduled day, no workout yet, current streak >= 3
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const jsDay = now.getUTCDay()
  const todayIsoDay = jsDay === 0 ? 7 : jsDay
  const scheduledToday = schedule.includes(todayIsoDay)
  const workedOutToday = workoutDates.includes(todayIso)
  const streakAtRisk = scheduledToday && !workedOutToday && streakInfo.current >= 3
  const weekTonnage = (weekResult.data ?? []).reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const weekSessions = (weekResult.data ?? []).length
  const prevWeekTonnage = (prevWeekResult.data ?? []).reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const prevWeekSessions = (prevWeekResult.data ?? []).length
  const bestE1rm = prResult.data?.calculated_1rm ?? null
  const muscleVolumes = await getMuscleVolumeForDays(supabase, user.id, MUSCLE_PERIOD_DAYS[safeMusclePeriod])

  // Get exercise names for each session (first 3 distinct per session)
  const sessionIds = sessions.map(s => s.id)
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
      if (!exerciseTagsMap[row.session_id].includes(name) && exerciseTagsMap[row.session_id].length < 3) {
        exerciseTagsMap[row.session_id].push(name)
      }
    }
  }

  const dayLabels = {
    '1': t('today.days.1'), '2': t('today.days.2'), '3': t('today.days.3'),
    '4': t('today.days.4'), '5': t('today.days.5'), '6': t('today.days.6'), '7': t('today.days.7'),
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-stretch">
        <div className="rounded-[28px] bg-card p-4 ring-1 ring-white/[0.06] sm:p-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                {t('overview')}
              </p>
              <h1 className="mt-1 text-[28px] font-extrabold leading-none tracking-tight sm:text-4xl">
                {t('title')}
              </h1>
            </div>
            <Link
              href="/workout/new"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,59,71,0.26)] transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <Dumbbell className="h-4 w-4" />
              {t('startWorkout')}
            </Link>
          </div>

          {streakAtRisk && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3">
              <Flame className="h-5 w-5 shrink-0 text-red-300" />
              <div className="min-w-0 text-xs">
                <div className="font-bold text-red-200">{t('streakAtRiskTitle', { n: streakInfo.current })}</div>
                <div className="text-white/45">{t('streakAtRiskSub')}</div>
              </div>
            </div>
          )}

          <div className="mt-5">
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StreakCard streak={streakInfo} activity={calendarActivity} />
          <ScheduleStatus
            schedule={schedule}
            labels={{
              trainingDay: t('today.trainingDay'),
              restDay: t('today.restDay'),
              next: t('today.next'),
              noSchedule: t('today.noSchedule'),
              days: dayLabels,
            }}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Dumbbell className="h-4 w-4 text-primary" />
              {t('recentTraining')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <div className="space-y-1.5">
                {sessions.map(s => {
                  const date = new Date(s.started_at)
                  const tags = exerciseTagsMap[s.id] ?? []
                  const moodEmoji = s.mood_score && MOOD_EMOJIS[s.mood_score]
                  return (
                    <Link key={s.id} href={`/history/${s.id}`} className="block rounded-2xl transition hover:bg-white/[0.04]">
                      <div className="flex items-center justify-between gap-3 px-1 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-bold">
                              {date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            {moodEmoji && <span className="text-sm leading-none">{moodEmoji}</span>}
                          </div>
                          {tags.length > 0 && (
                            <p className="mt-0.5 truncate text-xs text-white/40">{tags.join(' · ')}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                          {(s.total_volume_kg ?? 0).toFixed(0)} кг
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-white/45">{t('noWorkouts')}</p>
            )}
          </CardContent>
        </Card>

        <AIInsightsCard initialInsights={initialInsights} />
      </section>

      <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[225ms]">
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

      <div className="flex items-center justify-center gap-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/25">
        <Sparkles className="h-3 w-3" />
        {t('coachFooter')}
      </div>
    </div>
  )
}
