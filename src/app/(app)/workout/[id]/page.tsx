import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession, getLastSetsForExercises } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { getTemplate } from '@/lib/db/templates'
import { WorkoutClient } from '@/components/workout/WorkoutClient'
import { getExerciseNotesForExercises } from '@/lib/db/exercise-notes'
import { getExerciseVideosForExercises } from '@/lib/db/exercise-videos'
import type { Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'

/**
 * Exercise swaps and the "did you mean" search fallback are server actions on
 * this route, and both wait on a reasoning model — tens of seconds, not the
 * couple this took before. Stated rather than inherited from the platform.
 */
export const maxDuration = 60

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
  const exerciseById = new Map(allExercises.map((exercise) => [exercise.id, exercise]))

  // Build exercise map from existing sets
  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = exerciseById.get(set.exercise_id)
      if (ex) exerciseMap.set(set.exercise_id, { ...ex, sets: [] })
    }
    exerciseMap.get(set.exercise_id)?.sets.push(set)
  }

  // Fetch last session's sets for each exercise (for "прошлый раз" hint)
  const lastSetsMap: Record<string, SetEntry[]> = {}
  const exerciseIdsInSession = [...exerciseMap.keys()]

  // If template provided, also include its exercise IDs for last-sets prefetch
  const templateExercises: ExerciseWithSets[] = []
  let sourceTemplate: { id: string; name: string } | undefined
  if (templateId) {
    const template = await getTemplate(supabase, user.id, templateId)
    if (template) {
      sourceTemplate = { id: template.id, name: template.name }
      for (const te of template.exercises) {
        if (exerciseMap.has(te.exercise_id)) continue
        const ex = exerciseById.get(te.exercise_id)
        if (!ex) continue
        templateExercises.push({ ...ex, sets: [] })
        exerciseIdsInSession.push(te.exercise_id)
      }
    }
  }

  Object.assign(lastSetsMap, await getLastSetsForExercises(supabase, id, exerciseIdsInSession))

  const initialExercises = [...exerciseMap.values(), ...templateExercises]

  // Fetch exercise notes + videos for all exercises in this session
  const exerciseIds = initialExercises.map((e) => e.id)
  const [exerciseNotesMap, exerciseVideosMap] = await Promise.all([
    getExerciseNotesForExercises(supabase, user.id, id, exerciseIds),
    getExerciseVideosForExercises(supabase, user.id, exerciseIds),
  ])

  // Build top-used exercises suggestion list from last 30 days (excluding ones already in session)
  const since30days = new Date()
  since30days.setDate(since30days.getDate() - 30)
  const { data: recentSetsForSuggestions } = await supabase
    .from('set_entries')
    .select('exercise_id')
    .eq('user_id', user.id)
    .gte('created_at', since30days.toISOString())

  const exerciseFreq = new Map<string, number>()
  for (const row of recentSetsForSuggestions ?? []) {
    if (exerciseMap.has(row.exercise_id)) continue
    exerciseFreq.set(row.exercise_id, (exerciseFreq.get(row.exercise_id) ?? 0) + 1)
  }
  const topExerciseIds = Array.from(exerciseFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id)
  const suggestedExercises: Exercise[] = topExerciseIds
    .map((id) => exerciseById.get(id))
    .filter((e): e is Exercise => e !== undefined)

  return (
    <WorkoutClient
      userId={user.id}
      session={session}
      initialExercises={initialExercises}
      allExercises={allExercises}
      lastSetsMap={lastSetsMap}
      sourceTemplate={sourceTemplate}
      suggestedExercises={suggestedExercises}
      exerciseNotes={exerciseNotesMap}
      exerciseVideos={exerciseVideosMap}
    />
  )
}
