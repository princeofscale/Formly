import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/analytics/ProgressChart'
import { TonnageChart } from '@/components/analytics/TonnageChart'
import { VolumeLandmarks } from '@/components/analytics/VolumeLandmarks'
import { ExerciseSelector } from '@/components/analytics/ExerciseSelector'
import { getMonthlyTonnage, getWeeklyMuscleVolume, getVolumeLandmarks } from '@/lib/services/analytics.service'
import { getE1RMHistory } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>
}) {
  const { exercise: exerciseId } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  const [exercises, tonnage, muscleVolumes] = await Promise.all([
    getExercises(supabase, user.id),
    getMonthlyTonnage(supabase, user.id),
    getWeeklyMuscleVolume(supabase, user.id, 4),
  ])

  const landmarks = getVolumeLandmarks(muscleVolumes)

  const selectedExercise = exerciseId ? exercises.find(e => e.id === exerciseId) : exercises[0]
  const e1rmHistory = selectedExercise
    ? await getE1RMHistory(supabase, user.id, selectedExercise.id)
    : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">e1RM Progress</CardTitle>
            <ExerciseSelector exercises={exercises} selected={selectedExercise?.id} />
          </div>
        </CardHeader>
        <CardContent>
          <ProgressChart data={e1rmHistory} exerciseName={selectedExercise?.name ?? ''} />
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Monthly Volume</CardTitle></CardHeader>
        <CardContent>
          <TonnageChart data={tonnage} />
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Volume Landmarks (4 weeks)</CardTitle></CardHeader>
        <CardContent>
          <VolumeLandmarks landmarks={landmarks} />
        </CardContent>
      </Card>
    </div>
  )
}
