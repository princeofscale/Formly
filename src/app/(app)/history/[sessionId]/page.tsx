import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTranslations, getLocale } from 'next-intl/server'
import type { ExerciseWithSets, AchievementCode } from '@/lib/types/models'
import { DeleteWorkoutButton } from './DeleteWorkoutButton'
import { AchievementToast } from '@/components/AchievementToast'

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ finished?: string; unlocked?: string }>
}) {
  const { sessionId } = await params
  const { finished, unlocked } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()

  const session = await getSession(supabase, sessionId)
  if (!session || session.user_id !== user.id) notFound()

  const sets = await getSetsForSession(supabase, sessionId)
  const allExercises = await getExercises(supabase, user.id)

  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = allExercises.find(e => e.id === set.exercise_id)
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

  return (
    <div className="space-y-6">
      {unlocked && (
        <AchievementToast codes={unlocked.split(',') as AchievementCode[]} />
      )}

      {finished === '1' && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 text-green-400 text-sm font-medium">
          {t('finishedBanner')}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold capitalize">{dateStr}</h1>
          <p className="text-zinc-400 text-sm">
            {(session.total_volume_kg ?? 0).toFixed(0)} {t('volume')}
            {duration ? ` · ${duration} ${t('minutes')}` : ''}
          </p>
        </div>
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

      {session.notes && (
        <div
          className="p-3 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
            {t('notesLabel')}
          </div>
          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
            {session.notes}
          </p>
        </div>
      )}

      {exercises.map(ex => (
        <Card key={ex.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name}
            </CardTitle>
            <p className="text-xs text-zinc-500">{t(`muscleLabel.${ex.primary_muscle}`)}</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs">
                  <th className="text-left pb-1">{t('table.set')}</th>
                  <th className="text-left pb-1">{t('table.weight')}</th>
                  <th className="text-left pb-1">{t('table.reps')}</th>
                  <th className="text-left pb-1">{t('table.e1rm')}</th>
                  <th className="text-left pb-1">{t('table.rpe')}</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map(s => (
                  <tr key={s.id} className="border-t border-white/10">
                    <td className="py-1 text-zinc-500">#{s.set_number}</td>
                    <td className="py-1">{s.weight_kg}kg</td>
                    <td className="py-1">{s.reps}</td>
                    <td className="py-1 text-zinc-400">{s.calculated_1rm?.toFixed(1) ?? '—'}</td>
                    <td className="py-1 text-zinc-400">{s.rpe ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {exercises.length === 0 && (
        <p className="text-zinc-500 text-center py-8">{t('noExercises')}</p>
      )}
    </div>
  )
}
