import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations, getLocale } from 'next-intl/server'
import { getExercises } from '@/lib/db/exercises'
import { getE1RMHistory, getVolumeHistoryForExercise } from '@/lib/db/sets'
import { ExerciseMetricChart } from '@/components/progress/ExerciseMetricChart'
import { ExerciseDropdown } from '@/components/progress/ExerciseDropdown'
import { PeriodDropdown } from '@/components/progress/PeriodDropdown'
import { MajorLiftsGrid, type MajorLift } from '@/components/progress/MajorLiftsGrid'
import { BodyWeightCard } from '@/components/progress/BodyWeightCard'
import { StrengthRatiosCard } from '@/components/progress/StrengthRatiosCard'
import { getStrengthRatios } from '@/lib/services/strength-standards.service'
import { AchievementsCard } from '@/components/progress/AchievementsCard'
import { getAchievements } from '@/lib/services/achievements.service'
import { weightUnit } from '@/lib/units'
import Link from 'next/link'
import { Camera, ChevronRight, Ruler, Target, Sigma, TrendingUp, Trophy } from 'lucide-react'

const PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

interface BestE1RMRow {
  calculated_1rm: number | null
  exercise_id: string
  exercises: { name: string; name_ru: string | null } | null
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

  // Single round-trip for the heavy reads.
  const [exercises, profileResult, bestE1RMResult] = await Promise.all([
    getExercises(supabase, user.id),
    supabase.from('profiles').select('weight_kg, height_cm').eq('id', user.id).single(),
    supabase
      .from('set_entries')
      .select('calculated_1rm, exercise_id, exercises(name, name_ru)')
      .eq('user_id', user.id)
      .not('calculated_1rm', 'is', null)
      .order('calculated_1rm', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const selectedExercise = exerciseId
    ? exercises.find((e) => e.id === exerciseId)
    : (exercises.find((e) => e.slug === 'barbell-bench-press') ?? exercises[0])

  const [fullHistory, fullVolume] = selectedExercise
    ? await Promise.all([
        getE1RMHistory(supabase, user.id, selectedExercise.id),
        getVolumeHistoryForExercise(supabase, user.id, selectedExercise.id),
      ])
    : [[], []]

  const days = PERIOD_DAYS[periodKey] ?? 30
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceIso = since.toISOString().slice(0, 10)
  const periodHistory = fullHistory.filter((p) => p.date >= sinceIso)
  const periodVolume = fullVolume.filter((p) => p.date >= sinceIso)

  const currentWeight = profileResult.data?.weight_kg ?? null
  const currentHeight = profileResult.data?.height_cm ?? null
  const kg = weightUnit(locale)

  // Major lifts — 4 big compound exercises with mini sparklines.
  const MAJOR_SLUGS = [
    'barbell-bench-press',
    'barbell-squat',
    'barbell-deadlift',
    'barbell-overhead-press',
  ] as const
  const majorExercises = MAJOR_SLUGS.map((slug) => exercises.find((e) => e.slug === slug)).filter(
    (e): e is NonNullable<typeof e> => Boolean(e),
  )

  const [strengthRatios, achievements, majorHistories] = await Promise.all([
    currentWeight ? getStrengthRatios(supabase, user.id, currentWeight) : Promise.resolve([]),
    getAchievements(supabase, user.id),
    Promise.all(majorExercises.map((ex) => getE1RMHistory(supabase, user.id, ex.id))),
  ])

  // Build MajorLift list — exclude exercises with no history.
  const majorMeta: Record<
    (typeof MAJOR_SLUGS)[number],
    { muscle: 'chest' | 'back' | 'legs' | 'shoulder'; color: string; glyph: React.ReactNode }
  > = {
    'barbell-bench-press': {
      muscle: 'chest',
      color: '#FFB627',
      glyph: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9c2-2 5-3 9-3s7 1 9 3v3a4 4 0 0 1-4 4h-2.5a2.5 2.5 0 0 1-2.5-2.5V12h-2v1.5A2.5 2.5 0 0 1 7.5 16H5a4 4 0 0 1-4-4V9Z" />
        </svg>
      ),
    },
    'barbell-squat': {
      muscle: 'legs',
      color: '#B4FF6F',
      glyph: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 3h6v6l-1 12h-2l-.5-8h-1l-.5 8h-2L8 9V3Z" />
        </svg>
      ),
    },
    'barbell-deadlift': {
      muscle: 'back',
      color: '#6FA6FF',
      glyph: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v18M5 6c2 1 4 2 7 2s5-1 7-2M5 18c2-1 4-2 7-2s5 1 7 2" />
        </svg>
      ),
    },
    'barbell-overhead-press': {
      muscle: 'shoulder',
      color: '#FFD64A',
      glyph: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="10" r="3.5" />
          <circle cx="18" cy="10" r="3.5" />
          <path d="M6 13c0 3 2 5 6 5s6-2 6-5" />
        </svg>
      ),
    },
  }

  const majorLifts: MajorLift[] = majorExercises
    .map((ex, i) => {
      const history = majorHistories[i] ?? []
      if (history.length === 0) return null
      const meta = majorMeta[ex.slug as (typeof MAJOR_SLUGS)[number]]
      return {
        exerciseId: ex.id,
        slug: ex.slug,
        name: locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name,
        history,
        glyph: meta.glyph,
        muscle: meta.muscle,
        color: meta.color,
      }
    })
    .filter((x): x is MajorLift => x !== null)

  const displayName = (ex: typeof selectedExercise) =>
    locale === 'ru' ? (ex?.name_ru ?? ex?.name ?? '') : (ex?.name ?? '')

  const bestRow = bestE1RMResult.data as unknown as BestE1RMRow | null
  const bestE1RM = bestRow?.calculated_1rm ?? null
  const bestE1RMExercise = bestRow?.exercises
    ? locale === 'ru'
      ? (bestRow.exercises.name_ru ?? bestRow.exercises.name)
      : bestRow.exercises.name
    : null

  const unlockedAchievements = achievements.filter((a) => a.tier > 0).length

  return (
    <div className="space-y-3 pb-4">
      {/* Title */}
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <div className="tar-d-eyebrow">{t('eyebrow')}</div>
        <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
          {t('title') ?? 'Progress'}
        </h1>
      </div>

      {/* Hero — best e1RM */}
      <div className="tar-pg-hero tar-d-rise tar-d-rise-2">
        <div>
          <span className="e">{t('bestE1rmLabel')}</span>
          <div className="v">
            {bestE1RM != null ? Math.round(bestE1RM) : '—'}
            <span className="u">{kg}</span>
          </div>
          {bestE1RMExercise && (
            <div
              className="d"
              style={{ color: 'var(--tar-ink-mute)', marginTop: 6, fontWeight: 500 }}
            >
              {bestE1RMExercise}
            </div>
          )}
        </div>
        <TrendingUp className="h-10 w-10 text-[color:var(--tar-brand-2)] opacity-60" />
      </div>

      {/* Quick stats row */}
      <div className="tar-pr-stats tar-d-rise tar-d-rise-2">
        <div className="tar-pr-stat">
          <div className="v gold">{unlockedAchievements}</div>
          <div className="k">{t('achievementsLabel')}</div>
        </div>
        <div className="tar-pr-stat">
          <div className="v">{currentWeight != null ? currentWeight : '—'}</div>
          <div className="k">
            {t('bodyweightLabel')} · {kg}
          </div>
        </div>
        <div className="tar-pr-stat">
          <div className="v">{periodHistory.length}</div>
          <div className="k">{t('periodLabel') ?? 'Sets'}</div>
        </div>
      </div>

      {/* Major lifts grid (4 sparkline cards) */}
      {majorLifts.length > 0 && (
        <>
          <div className="tar-d-sectionhead tar-d-rise tar-d-rise-3">
            {t('majorLifts') ?? 'Major lifts'}
            <span className="counter">1RM est.</span>
          </div>
          <div className="tar-d-rise tar-d-rise-3">
            <MajorLiftsGrid lifts={majorLifts} />
          </div>
        </>
      )}

      {/* Chart card */}
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-4">
        {t('exerciseLabel') ?? 'Exercise'}
      </div>
      <div
        className="tar-d-rise tar-d-rise-3"
        style={{
          background: 'var(--tar-card)',
          border: '1px solid var(--tar-line)',
          borderRadius: 'var(--tar-r-md)',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
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
          <PeriodDropdown
            current={periodKey}
            exerciseId={selectedExercise?.id}
            label={t('periodLabel')}
          />
        </div>

        <ExerciseMetricChart
          e1rmHistory={periodHistory}
          volumeHistory={periodVolume}
          exerciseName={displayName(selectedExercise)}
        />
      </div>

      <BodyWeightCard
        initialWeight={currentWeight}
        initialHeight={currentHeight}
        labels={{
          weight: t('weightLabel'),
          height: t('heightLabel'),
          weightUnit: kg,
          heightUnit: locale === 'ru' ? 'см' : 'cm',
          save: t('saveMetrics'),
          saved: t('saved'),
        }}
      />

      <StrengthRatiosCard ratios={strengthRatios} bodyweightKg={currentWeight} />

      <AchievementsCard achievements={achievements} />

      {/* Bottom link cards */}
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-5">{t('shortcuts') ?? 'Tools'}</div>
      <div className="grid grid-cols-2 gap-2 tar-d-rise tar-d-rise-5">
        <Link href="/progress/photos" className="tar-pl-qbtn">
          <div className="ico" style={{ color: '#FF6E76' }}>
            <Camera />
          </div>
          <div className="t">{t('photos.linkTitle')}</div>
          <div className="s">{t('photos.linkSub')}</div>
        </Link>
        <Link href="/progress/measurements" className="tar-pl-qbtn">
          <div className="ico" style={{ color: '#22D3A8' }}>
            <Ruler />
          </div>
          <div className="t">{t('measurements.linkTitle')}</div>
          <div className="s">{t('measurements.linkSub')}</div>
        </Link>
        <Link href="/tools/1rm" className="tar-pl-qbtn">
          <div className="ico">
            <Sigma />
          </div>
          <div className="t">{t('oneRMLink.title')}</div>
          <div className="s">{t('oneRMLink.sub')}</div>
        </Link>
        <Link href="/goals" className="tar-pl-qbtn">
          <div className="ico">
            <Target />
          </div>
          <div className="t">{t('goalsLink.title')}</div>
          <div className="s">{t('goalsLink.sub')}</div>
        </Link>
      </div>
      <div className="hidden">
        <Trophy aria-hidden />
        <ChevronRight aria-hidden />
      </div>
    </div>
  )
}
