// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Plus, Trophy, User } from 'lucide-react'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { ScheduleStatus } from '@/components/dashboard/ScheduleStatus'
import { MuscleHeatmap } from '@/components/dashboard/MuscleHeatmap'
import { WeeklyStats } from '@/components/dashboard/WeeklyStats'
import { getWeeklyMuscleVolume } from '@/lib/services/analytics.service'

export default async function DashboardPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('dashboard')
  const tHistory = await getTranslations('history')
  const locale = await getLocale()

  const since7days = new Date()
  since7days.setDate(since7days.getDate() - 7)

  const [sessionsResult, profileResult, weekResult, prResult] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, started_at, total_volume_kg, finished_at')
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
      .from('set_entries')
      .select('calculated_1rm')
      .eq('user_id', user.id)
      .not('calculated_1rm', 'is', null)
      .order('calculated_1rm', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const sessions = sessionsResult.data ?? []
  const schedule: number[] = profileResult.data?.training_schedule ?? []
  const weekTonnage = (weekResult.data ?? []).reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const weekSessions = (weekResult.data ?? []).length
  const bestE1rm = prResult.data?.calculated_1rm ?? null
  const muscleVolumes = await getWeeklyMuscleVolume(supabase, user.id, 1)

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase tracking-wider">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/records"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 hover:border-amber-500 transition-colors"
            title={t('recordsLink')}
          >
            <Trophy className="h-4 w-4 text-zinc-400" />
          </Link>
          <Link
            href="/profile"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 hover:border-amber-500 transition-colors"
            title={t('profileLink')}
          >
            <User className="h-4 w-4 text-zinc-400" />
          </Link>
          <Link
            href="/workout/new"
            className={buttonVariants({ className: 'uppercase tracking-wider font-bold' })}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('startWorkout')}
          </Link>
        </div>
      </div>

      <WeeklyStats
        tonnage={weekTonnage}
        sessions={weekSessions}
        bestE1rm={bestE1rm}
        labels={{
          tonnage: t('week.tonnage'),
          sessions: t('week.sessions'),
          bestE1rm: t('week.bestE1rm'),
        }}
      />

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

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold">
            <Dumbbell className="h-4 w-4 text-amber-500" />
            {t('recentTraining')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map(s => {
                const date = new Date(s.started_at)
                const tags = exerciseTagsMap[s.id] ?? []
                return (
                  <Link key={s.id} href={`/history/${s.id}`} className="block group">
                    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <p className="font-mono text-sm font-bold">
                          {date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        {tags.length > 0 && (
                          <p className="text-xs text-zinc-500 mt-0.5">{tags.join(' · ')}</p>
                        )}
                      </div>
                      <span className="text-sm text-amber-500 font-mono font-bold">
                        {(s.total_volume_kg ?? 0).toFixed(0)} кг
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{t('noWorkouts')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider font-bold">
            {t('muscleActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MuscleHeatmap
            muscleVolumes={muscleVolumes}
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
  )
}
