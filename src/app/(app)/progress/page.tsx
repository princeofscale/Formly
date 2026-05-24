import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations, getLocale } from 'next-intl/server'
import { getExercises } from '@/lib/db/exercises'
import { getE1RMHistory, getVolumeHistoryForExercise } from '@/lib/db/sets'
import { ExerciseMetricChart } from '@/components/progress/ExerciseMetricChart'
import { ExerciseDropdown } from '@/components/progress/ExerciseDropdown'
import { PeriodDropdown } from '@/components/progress/PeriodDropdown'
import { BodyWeightCard } from '@/components/progress/BodyWeightCard'
import { StrengthRatiosCard } from '@/components/progress/StrengthRatiosCard'
import { getStrengthRatios } from '@/lib/services/strength-standards.service'
import { AchievementsCard } from '@/components/progress/AchievementsCard'
import { getAchievements } from '@/lib/services/achievements.service'
import { weightUnit } from '@/lib/units'
import Link from 'next/link'
import { Camera, ChevronRight, Ruler, Target, Sigma, TrendingUp, Trophy, Flame } from 'lucide-react'

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

  const [strengthRatios, achievements] = await Promise.all([
    currentWeight ? getStrengthRatios(supabase, user.id, currentWeight) : Promise.resolve([]),
    getAchievements(supabase, user.id),
  ])

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
    <div className="space-y-4 sm:space-y-5">
      {/* HERO — best lifetime e1RM, achievements unlocked, bodyweight */}
      <section className="relative overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-white/[0.06] sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {t('eyebrow')}
          </p>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/25">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[68px] font-black leading-[0.9] text-primary tabular-nums sm:text-[80px]">
                  {bestE1RM != null ? Math.round(bestE1RM) : '—'}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/55">
                    {t('bestE1rmLabel')}
                  </span>
                  {bestE1RMExercise && (
                    <span className="text-[11px] uppercase tracking-widest text-white/35 truncate">
                      {bestE1RMExercise}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-white/35">
                  <Trophy className="h-3 w-3" style={{ color: '#FFC044' }} />
                  {t('achievementsLabel')}
                </div>
                <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-white">
                  {unlockedAchievements}
                </p>
                <p className="text-[9px] text-white/30">{t('unlocked')}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-white/35">
                  <Flame className="h-3 w-3" style={{ color: '#FF6E76' }} />
                  {t('bodyweightLabel')}
                </div>
                <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-white">
                  {currentWeight != null ? currentWeight : '—'}
                </p>
                <p className="text-[9px] text-white/30">{kg}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chart card */}
      <div className="rounded-[24px] bg-card p-5 ring-1 ring-white/[0.06] space-y-4">
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

      <Link
        href="/progress/photos"
        className="flex items-center gap-3 rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.04]"
      >
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255, 59, 71, 0.12)' }}
        >
          <Camera className="h-5 w-5" style={{ color: '#FF6E76' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{t('photos.linkTitle')}</p>
          <p className="text-[11px] text-white/50">{t('photos.linkSub')}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-600 flex-shrink-0" />
      </Link>

      <Link
        href="/progress/measurements"
        className="flex items-center gap-3 rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.04]"
      >
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(34, 211, 168, 0.14)' }}
        >
          <Ruler className="h-5 w-5" style={{ color: '#22D3A8' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{t('measurements.linkTitle')}</p>
          <p className="text-[11px] text-white/50">{t('measurements.linkSub')}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-600 flex-shrink-0" />
      </Link>

      <Link
        href="/tools/1rm"
        className="flex items-center gap-3 rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.04]"
      >
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255, 196, 68, 0.16)' }}
        >
          <Sigma className="h-5 w-5" style={{ color: '#FFC044' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{t('oneRMLink.title')}</p>
          <p className="text-[11px] text-white/50">{t('oneRMLink.sub')}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-600 flex-shrink-0" />
      </Link>

      <Link
        href="/goals"
        className="flex items-center gap-3 rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.04]"
      >
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255, 196, 68, 0.16)' }}
        >
          <Target className="h-5 w-5" style={{ color: '#FFC044' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{t('goalsLink.title')}</p>
          <p className="text-[11px] text-white/50">{t('goalsLink.sub')}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-600 flex-shrink-0" />
      </Link>
    </div>
  )
}
