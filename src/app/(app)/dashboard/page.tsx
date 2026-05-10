import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Plus } from 'lucide-react'
import Link from 'next/link'
import { ScheduleStatus } from '@/components/dashboard/ScheduleStatus'
import { MuscleHeatmap } from '@/components/dashboard/MuscleHeatmap'
import { getWeeklyMuscleVolume } from '@/lib/services/analytics.service'

export default async function DashboardPage() {
  const { user } = await verifySession()
  const supabase = await createClient()

  const [sessionsResult, profileResult] = await Promise.all([
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
  ])

  const sessions = sessionsResult.data ?? []
  const schedule: number[] = profileResult.data?.training_schedule ?? []
  const muscleVolumes = await getWeeklyMuscleVolume(supabase, user.id, 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/workout/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Start Workout
        </Link>
      </div>

      <ScheduleStatus schedule={schedule} />

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            Recent Training
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <ul className="space-y-2">
              {sessions.map(s => {
                const date = new Date(s.started_at)
                return (
                  <li key={s.id} className="flex justify-between text-sm">
                    <Link href={`/history/${s.id}`} className="hover:text-zinc-200">
                      {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Link>
                    <span className="text-zinc-400">{(s.total_volume_kg ?? 0).toFixed(0)} kg</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">No workouts yet. Start your first session!</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Muscle Activity (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <MuscleHeatmap muscleVolumes={muscleVolumes} />
        </CardContent>
      </Card>
    </div>
  )
}
