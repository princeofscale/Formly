import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import { ExerciseLibraryView } from '@/components/exercise/ExerciseLibraryView'
import type { MuscleGroup } from '@/lib/types/models'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function ExerciseLibraryPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('exerciseLibrary')
  const locale = await getLocale()

  // Load all (no server-side filter — let the client filter for snappy interaction)
  const exercises = await getExercises(supabase, user.id)

  // Per-exercise aggregates: last-used date, max e1rm, log count
  const { data: setRows } = await supabase
    .from('set_entries')
    .select('exercise_id, created_at, calculated_1rm, weight_kg, reps')
    .eq('user_id', user.id)

  type Agg = {
    count: number
    lastAt: string | null
    bestE1rm: number
    bestSet: { weight: number; reps: number } | null
  }
  const aggByExercise = new Map<string, Agg>()
  for (const row of (setRows ?? []) as Array<{
    exercise_id: string
    created_at: string
    calculated_1rm: number | null
    weight_kg: number
    reps: number
  }>) {
    const cur = aggByExercise.get(row.exercise_id) ?? {
      count: 0,
      lastAt: null,
      bestE1rm: 0,
      bestSet: null,
    }
    cur.count += 1
    if (!cur.lastAt || row.created_at > cur.lastAt) cur.lastAt = row.created_at
    if (row.calculated_1rm && row.calculated_1rm > cur.bestE1rm) {
      cur.bestE1rm = row.calculated_1rm
      cur.bestSet = { weight: row.weight_kg, reps: row.reps }
    }
    aggByExercise.set(row.exercise_id, cur)
  }

  // Muscle bucket label map
  const bucketLabels = {
    chest: t('bucket.chest'),
    back: t('bucket.back'),
    legs: t('bucket.legs'),
    shoulder: t('bucket.shoulder'),
    arms: t('bucket.arms'),
    core: t('bucket.core'),
  }

  const items = exercises.map((ex) => {
    const agg = aggByExercise.get(ex.id) ?? null
    return {
      id: ex.id,
      name: locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name,
      primary_muscle: ex.primary_muscle as MuscleGroup,
      equipment: ex.equipment,
      equipmentLabel: t(`equipment.${ex.equipment}`),
      mechanic: ex.mechanic,
      mechanicLabel: t(ex.mechanic === 'compound' ? 'compound' : 'isolation'),
      count: agg?.count ?? 0,
      lastAt: agg?.lastAt ?? null,
      bestE1rm: agg?.bestE1rm ?? 0,
      bestSet: agg?.bestSet ?? null,
    }
  })

  return (
    <div className="space-y-3 pb-4">
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <div className="tar-d-eyebrow">{t('subCount', { n: items.length })}</div>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
            {t('title')}
          </h1>
          <ExerciseForm />
        </div>
      </div>

      <ExerciseLibraryView items={items} bucketLabels={bucketLabels} />
    </div>
  )
}
