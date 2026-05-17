import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations, getLocale } from 'next-intl/server'
import { getExercises } from '@/lib/db/exercises'
import { getE1RMHistory } from '@/lib/db/sets'
import { ProgressLineChart } from '@/components/progress/ProgressLineChart'
import { ExerciseDropdown } from '@/components/progress/ExerciseDropdown'
import { PeriodDropdown } from '@/components/progress/PeriodDropdown'
import { BodyWeightCard } from '@/components/progress/BodyWeightCard'

const PERIOD_DAYS: Record<string, number> = {
  '7d':   7,
  '30d':  30,
  '90d':  90,
  '1y':   365,
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string; period?: string }>
}) {
  const { exercise: exerciseId, period: periodKey = '30d' } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('progress')
  const locale = await getLocale()

  const [exercises, profileResult] = await Promise.all([
    getExercises(supabase, user.id),
    supabase
      .from('profiles')
      .select('weight_kg, height_cm')
      .eq('id', user.id)
      .single(),
  ])
  const selectedExercise = exerciseId
    ? exercises.find(e => e.id === exerciseId)
    : exercises.find(e => e.slug === 'barbell-bench-press') ?? exercises[0]

  const fullHistory = selectedExercise
    ? await getE1RMHistory(supabase, user.id, selectedExercise.id)
    : []

  const days = PERIOD_DAYS[periodKey] ?? 30
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceIso = since.toISOString().slice(0, 10)
  const periodHistory = fullHistory.filter(p => p.date >= sinceIso)

  const currentWeight = profileResult.data?.weight_kg ?? null
  const currentHeight = profileResult.data?.height_cm ?? null

  const displayName = (ex: typeof selectedExercise) =>
    locale === 'ru' ? (ex?.name_ru ?? ex?.name ?? '') : (ex?.name ?? '')

  return (
    <div className="space-y-5">
      <h1 className="text-[28px] font-bold tracking-tight">{t('title')}</h1>

      {/* Chart card */}
      <div
        className="rounded-[20px] p-5 space-y-4"
        style={{
          background: '#15151C',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <ExerciseDropdown
            exercises={exercises}
            selectedId={selectedExercise?.id}
            locale={locale}
            currentPeriod={periodKey}
            label={t('exerciseLabel')}
          />
          <PeriodDropdown current={periodKey} exerciseId={selectedExercise?.id} label={t('periodLabel')} />
        </div>

        <ProgressLineChart
          data={periodHistory}
          exerciseName={displayName(selectedExercise)}
          unit={t('unit1rm')}
        />
      </div>

      <BodyWeightCard
        initialWeight={currentWeight}
        initialHeight={currentHeight}
        labels={{
          weight: t('weightLabel'),
          height: t('heightLabel'),
          save: t('saveMetrics'),
          saved: t('saved'),
        }}
      />
    </div>
  )
}
