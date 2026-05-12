import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession, getLastSetsForExercise } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { getTemplate } from '@/lib/db/templates'
import { WorkoutClient } from '@/components/workout/WorkoutClient'
import type { ExerciseWithSets, SetEntry } from '@/lib/types/models'

export default async function WorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string }>
}) {
  const { id } = await params
  const { template: templateId } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  const session = await getSession(supabase, id)
  if (!session || session.user_id !== user.id) notFound()
  if (session.finished_at) redirect('/history/' + id)

  const sets = await getSetsForSession(supabase, id)
  const allExercises = await getExercises(supabase, user.id)

  // Build exercise map from existing sets
  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = allExercises.find(e => e.id === set.exercise_id)
      if (ex) exerciseMap.set(set.exercise_id, { ...ex, sets: [] })
    }
    exerciseMap.get(set.exercise_id)?.sets.push(set)
  }

  // Fetch last session's sets for each exercise (for "прошлый раз" hint)
  const lastSetsMap: Record<string, SetEntry[]> = {}
  const exerciseIdsInSession = [...exerciseMap.keys()]

  // If template provided, also include its exercise IDs for last-sets prefetch
  let templateExercises: ExerciseWithSets[] = []
  if (templateId) {
    const template = await getTemplate(supabase, user.id, templateId)
    if (template) {
      for (const te of template.exercises) {
        if (exerciseMap.has(te.exercise_id)) continue
        const ex = allExercises.find(e => e.id === te.exercise_id)
        if (!ex) continue
        templateExercises.push({ ...ex, sets: [] })
        exerciseIdsInSession.push(te.exercise_id)
      }
    }
  }

  // Parallel fetch of last sets
  await Promise.all(
    exerciseIdsInSession.map(async (exerciseId) => {
      lastSetsMap[exerciseId] = await getLastSetsForExercise(supabase, user.id, exerciseId, id)
    })
  )

  const initialExercises = [...exerciseMap.values(), ...templateExercises]

  return (
    <WorkoutClient
      session={session}
      initialExercises={initialExercises}
      allExercises={allExercises}
      lastSetsMap={lastSetsMap}
    />
  )
}
