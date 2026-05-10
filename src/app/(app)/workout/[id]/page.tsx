import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { WorkoutClient } from '@/components/workout/WorkoutClient'
import type { ExerciseWithSets } from '@/lib/types/models'

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await verifySession()
  const supabase = await createClient()

  const session = await getSession(supabase, id)
  if (!session || session.user_id !== user.id) notFound()
  if (session.finished_at) redirect('/history/' + id)

  const sets = await getSetsForSession(supabase, id)
  const allExercises = await getExercises(supabase, user.id)

  // Group sets by exercise
  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = allExercises.find(e => e.id === set.exercise_id)
      if (ex) exerciseMap.set(set.exercise_id, { ...ex, sets: [] })
    }
    exerciseMap.get(set.exercise_id)?.sets.push(set)
  }

  return (
    <WorkoutClient
      session={session}
      initialExercises={Array.from(exerciseMap.values())}
      allExercises={allExercises}
    />
  )
}
