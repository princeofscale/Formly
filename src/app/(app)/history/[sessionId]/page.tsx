import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { getTranslations, getLocale } from 'next-intl/server'
import type { ExerciseWithSets, MuscleGroup } from '@/lib/types/models'
import { DeleteWorkoutButton } from './DeleteWorkoutButton'
import { repeatWorkoutAction } from '../actions'
import { RotateCcw } from 'lucide-react'
import { MOOD_EMOJIS } from '@/components/workout/MoodSelector'
import { MuscleIcon } from '@/components/workout/muscle-icon'
import { SessionSummaryHero } from '@/components/history/SessionSummaryHero'
import { SessionAIDebrief } from '@/components/history/SessionAIDebrief'
import { getSessionSummary } from '@/lib/services/session-summary.service'
import { weightUnit } from '@/lib/units'

function muscleBucket(m: MuscleGroup): 'chest' | 'back' | 'legs' | 'shoulder' | 'arms' | 'core' {
  if (m === 'chest') return 'chest'
  if (m === 'back' || m === 'lats' || m === 'traps' || m === 'rear_delts') return 'back'
  if (m === 'quads' || m === 'hamstrings' || m === 'glutes' || m === 'calves') return 'legs'
  if (m === 'front_delts' || m === 'side_delts') return 'shoulder'
  if (m === 'biceps' || m === 'triceps' || m === 'forearms') return 'arms'
  return 'core'
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ finished?: string }>
}) {
  const { sessionId } = await params
  const { finished } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()
  const kg = weightUnit(locale)

  const session = await getSession(supabase, sessionId)
  if (!session || session.user_id !== user.id) notFound()

  const [sets, allExercises, summary] = await Promise.all([
    getSetsForSession(supabase, sessionId),
    getExercises(supabase, user.id),
    finished === '1' ? getSessionSummary(supabase, user.id, sessionId) : Promise.resolve(null),
  ])

  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = allExercises.find((e) => e.id === set.exercise_id)
      if (ex) exerciseMap.set(set.exercise_id, { ...ex, sets: [] })
    }
    exerciseMap.get(set.exercise_id)?.sets.push(set)
  }

  const exercises = Array.from(exerciseMap.values())
  const date = new Date(session.started_at)
  const duration = session.finished_at
    ? Math.round((new Date(session.finished_at).getTime() - date.getTime()) / 60000)
    : null

  const dateStr = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const workingSets = sets.filter((s) => !s.is_warmup)
  const totalVolume = session.total_volume_kg ?? 0
  const moodEmoji = session.mood_score ? MOOD_EMOJIS[session.mood_score] : null

  const stats = [
    { k: t('detail.tonnage'), v: `${Math.round(totalVolume).toLocaleString('ru-RU')}`, u: kg },
    { k: t('detail.duration'), v: duration != null ? String(duration) : '—', u: t('minutes') },
    { k: t('detail.sets'), v: String(workingSets.length), u: '' },
    { k: t('detail.exercises'), v: String(exercises.length), u: '' },
  ]

  return (
    <div className="space-y-3 pb-4">
      {finished === '1' && summary && (
        <>
          <SessionSummaryHero summary={summary} sessionId={sessionId} />
          <SessionAIDebrief sessionId={sessionId} />
        </>
      )}

      {/* Header */}
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <div className="tar-d-eyebrow">{t('eyebrow')}</div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="tar-d-hello-name capitalize" style={{ fontSize: 26, marginTop: 4 }}>
            {dateStr}
            {moodEmoji && (
              <span className="ml-2 align-middle text-2xl" aria-hidden>
                {moodEmoji}
              </span>
            )}
          </h1>
          <div className="flex shrink-0 items-center gap-2" style={{ marginTop: 6 }}>
            <form
              action={async () => {
                'use server'
                await repeatWorkoutAction(sessionId)
              }}
            >
              <button
                type="submit"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-500/25"
                title={t('repeat')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('repeat')}
              </button>
            </form>
            <DeleteWorkoutButton
              sessionId={sessionId}
              labels={{
                deleteWorkout: t('deleteWorkout'),
                deleteConfirmText: t('deleteConfirmText'),
                deleteConfirm: t('deleteConfirm'),
                deleteCancel: t('deleteCancel'),
              }}
            />
          </div>
        </div>
      </div>

      {/* Session stats */}
      <div className="tar-d-rise tar-d-rise-2 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.k}
            className="min-w-0 rounded-2xl p-3 text-center"
            style={{ background: 'var(--tar-card)', border: '1px solid var(--tar-line)' }}
          >
            <div className="truncate font-mono text-lg font-black tabular-nums text-white">
              {s.v}
              {s.u && <span className="ml-1 text-[10px] font-semibold text-white/40">{s.u}</span>}
            </div>
            <div className="mt-1 truncate text-[9px] uppercase tracking-widest text-white/40">
              {s.k}
            </div>
          </div>
        ))}
      </div>

      {session.notes && (
        <div
          className="tar-d-rise tar-d-rise-3 rounded-2xl p-4"
          style={{ background: 'var(--tar-card)', border: '1px solid var(--tar-line)' }}
        >
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            {t('notesLabel')}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
            {session.notes}
          </p>
        </div>
      )}

      {/* Exercise cards */}
      {exercises.map((ex, i) => {
        const working = ex.sets.filter((s) => !s.is_warmup)
        const exVolume = working.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)
        const bestWeight = working.reduce((max, s) => (s.weight_kg > max ? s.weight_kg : max), 0)
        const bucket = muscleBucket(ex.primary_muscle)

        return (
          <div
            key={ex.id}
            className={`tar-pg-card tar-d-rise tar-d-rise-${Math.min(4 + (i % 3), 6)}`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className={`tar-s-mglyph ${bucket}`}>
                <MuscleIcon muscle={ex.primary_muscle} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">
                  {locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  {t(`muscleLabel.${ex.primary_muscle}`)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-black tabular-nums text-white">
                  {Math.round(exVolume).toLocaleString('ru-RU')}
                  <span className="ml-1 text-[10px] font-semibold text-white/40">{kg}</span>
                </div>
                <div className="text-[9px] uppercase tracking-widest text-white/35">
                  {t('detail.exVolume')}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {ex.sets.map((s) => {
                const isBest = !s.is_warmup && s.weight_kg > 0 && s.weight_kg === bestWeight
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 ${s.is_warmup ? 'opacity-50' : ''}`}
                    style={{
                      background: isBest ? 'rgba(255, 182, 39, 0.07)' : 'rgba(255,255,255,0.025)',
                      border: isBest
                        ? '1px solid rgba(255, 182, 39, 0.25)'
                        : '1px solid transparent',
                    }}
                  >
                    <span className="w-7 shrink-0 font-mono text-[11px] text-white/35">
                      {s.is_warmup ? 'W' : `#${s.set_number}`}
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums text-white">
                      {s.weight_kg}
                      <span className="mx-0.5 text-white/40">{kg}</span>× {s.reps}
                    </span>
                    {s.rpe != null && (
                      <span className="font-mono text-[11px] tabular-nums text-white/40">
                        {t('table.rpe')} {s.rpe}
                      </span>
                    )}
                    {isBest && (
                      <span
                        className="ml-auto rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                        style={{
                          color: 'var(--tar-brand-2, #FFB627)',
                          background: 'rgba(255, 182, 39, 0.12)',
                        }}
                      >
                        {t('detail.best')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {exercises.length === 0 && (
        <p className="py-8 text-center text-sm text-white/40">{t('noExercises')}</p>
      )}
    </div>
  )
}
