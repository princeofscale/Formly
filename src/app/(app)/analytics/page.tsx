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
import { weightUnit } from '@/lib/units'
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
  const unit = weightUnit(locale)
  const numberLocale = locale === 'ru' ? 'ru-RU' : 'en-US'
  const firstE1rm = e1rmHistory[0]?.e1rm
  const lastE1rm = e1rmHistory.at(-1)?.e1rm
  const strengthDelta =
    firstE1rm && lastE1rm ? Math.round(((lastE1rm - firstE1rm) / firstE1rm) * 100) : null
  const totalTonnage = tonnage.reduce((sum, month) => sum + month.total_kg, 0)
  const balancedMuscles = landmarks.filter((landmark) => landmark.status === 'optimal').length

  const pulse = [
    {
      label: t('strengthTrend'),
      value: strengthDelta === null ? '—' : `${strengthDelta > 0 ? '+' : ''}${strengthDelta}%`,
      hint: displayName(selectedExercise) || t('noExercise'),
    },
    {
      label: t('totalVolume'),
      value: `${Math.round(totalTonnage).toLocaleString(numberLocale)} ${unit}`,
      hint: t('allTime'),
    },
    {
      label: t('balancedMuscles'),
      value: `${balancedMuscles}/${landmarks.length}`,
      hint: t('lastFourWeeks'),
    },
  ]

  return (
    <div className="space-y-3 pb-4">
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-white/45">{t('subtitle')}</p>
      </div>

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3 tar-d-rise tar-d-rise-2">
        {pulse.map((item) => (
          <div key={item.label} className="tar-pg-card min-w-0">
            <div className="tar-d-eyebrow">{item.label}</div>
            <div className="mt-2 truncate text-2xl font-black tracking-tight text-white">
              {item.value}
            </div>
            <div className="mt-1 truncate text-xs text-white/40">{item.hint}</div>
          </div>
        ))}
      </section>

      <section className="tar-pg-card tar-d-rise tar-d-rise-3">
        <div className="flex items-center justify-between gap-3" style={{ marginBottom: 12 }}>
          <div className="tar-d-eyebrow">{t('e1rmProgress')}</div>
          <ExerciseSelector exercises={exercises} selected={selectedExercise?.id} locale={locale} />
        </div>
        <ProgressChart
          data={e1rmHistory}
          exerciseName={displayName(selectedExercise)}
          unit={unit}
          emptyLabel={t('emptyProgress')}
        />
      </section>

      <section className="tar-pg-card tar-d-rise tar-d-rise-4">
        <div className="tar-d-eyebrow" style={{ marginBottom: 12 }}>
          {t('monthlyVolume')}
        </div>
        <TonnageChart data={tonnage} unit={unit} locale={locale} emptyLabel={t('emptyVolume')} />
      </section>

      <section className="tar-pg-card tar-d-rise">
        <div className="tar-d-eyebrow" style={{ marginBottom: 12 }}>
          {t('volumeLandmarks')}
        </div>
        <VolumeLandmarks
          landmarks={landmarks}
          labels={{
            empty: t('emptyLandmarks'),
            setsPerWeek: t('setsPerWeek'),
            status: {
              mv: t('status.low'),
              optimal: t('status.optimal'),
              mrv: t('status.high'),
            },
          }}
        />
      </section>
    </div>
  )
}
