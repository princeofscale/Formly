import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/analytics/ProgressChart'
import { TonnageChart } from '@/components/analytics/TonnageChart'
import { VolumeLandmarks } from '@/components/analytics/VolumeLandmarks'
import { ExerciseSelector } from '@/components/analytics/ExerciseSelector'
import {
  getMonthlyTonnage,
  getWeeklyMuscleVolume,
  getVolumeLandmarks,
} from '@/lib/services/analytics.service'
import { getE1RMHistory } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>
}) {
  const { exercise: exerciseId } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('analytics')
  const locale = await getLocale()

  const [exercises, tonnage, muscleVolumes] = await Promise.all([
    getExercises(supabase, user.id),
    getMonthlyTonnage(supabase, user.id),
    getWeeklyMuscleVolume(supabase, user.id, 4),
  ])

  const landmarks = getVolumeLandmarks(muscleVolumes)

  const selectedExercise = exerciseId ? exercises.find((e) => e.id === exerciseId) : exercises[0]
  const e1rmHistory = selectedExercise
    ? await getE1RMHistory(supabase, user.id, selectedExercise.id)
    : []

  const displayName = (ex: typeof selectedExercise) =>
    locale === 'ru' ? (ex?.name_ru ?? ex?.name ?? '') : (ex?.name ?? '')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('e1rmProgress')}</CardTitle>
            <ExerciseSelector
              exercises={exercises}
              selected={selectedExercise?.id}
              locale={locale}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ProgressChart data={e1rmHistory} exerciseName={displayName(selectedExercise)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('monthlyVolume')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TonnageChart data={tonnage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('volumeLandmarks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <VolumeLandmarks landmarks={landmarks} />
        </CardContent>
      </Card>
    </div>
  )
}
