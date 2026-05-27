import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
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
    <div className="space-y-3 pb-4">
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
          {t('title')}
        </h1>
      </div>

      <section className="tar-pg-card tar-d-rise tar-d-rise-2">
        <div className="flex items-center justify-between gap-3" style={{ marginBottom: 12 }}>
          <div className="tar-d-eyebrow">{t('e1rmProgress')}</div>
          <ExerciseSelector exercises={exercises} selected={selectedExercise?.id} locale={locale} />
        </div>
        <ProgressChart data={e1rmHistory} exerciseName={displayName(selectedExercise)} />
      </section>

      <section className="tar-pg-card tar-d-rise tar-d-rise-3">
        <div className="tar-d-eyebrow" style={{ marginBottom: 12 }}>
          {t('monthlyVolume')}
        </div>
        <TonnageChart data={tonnage} />
      </section>

      <section className="tar-pg-card tar-d-rise tar-d-rise-4">
        <div className="tar-d-eyebrow" style={{ marginBottom: 12 }}>
          {t('volumeLandmarks')}
        </div>
        <VolumeLandmarks landmarks={landmarks} />
      </section>
    </div>
  )
}
